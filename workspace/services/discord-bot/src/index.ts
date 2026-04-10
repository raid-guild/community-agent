import { createHash } from 'node:crypto';
import express from 'express';
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  type Message,
} from 'discord.js';

interface WrapperConfig {
  port: number;
  discordToken: string;
  defaultGuildId: string | null;
  collectorApiKey: string;
  serviceToken: string;
  chatResponseUrl: string;
  maxHistoryMessages: number;
}

interface LatestMessageFilters {
  ignoreBotMessages: boolean;
  ignoreUserIds: Set<string>;
  ignoreRoleIds: Set<string>;
  allowedUserIds: Set<string>;
  messageContains: string | null;
}

interface CollectLatestMessagesOptions {
  sinceMs: number;
  untilMs: number;
  includeArchivedThreads: boolean;
  maxMessagesPerChannel: number;
  filters: LatestMessageFilters;
}

type HistoryItem = {
  authorName: string;
  content: string;
  createdAt: string;
  isBot: boolean;
};

function deriveSharedToken() {
  const explicitToken = process.env.INTERNAL_SERVICE_TOKEN?.trim() || process.env.SERVICE_SHARED_TOKEN?.trim();
  if (explicitToken) {
    return explicitToken;
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || 'changeme';

  return createHash('sha256')
    .update(`${adminPassword}:prism-agent-internal-service`)
    .digest('hex');
}

function loadConfig(): WrapperConfig {
  const discordToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!discordToken) {
    throw new Error('DISCORD_BOT_TOKEN is required');
  }

  const parsedPort = Number(process.env.DISCORD_BOT_PORT || 8790);
  const maxHistoryMessages = Number(process.env.DISCORD_CHAT_HISTORY_LIMIT || 12);

  return {
    port: Number.isFinite(parsedPort) ? parsedPort : 8790,
    discordToken,
    defaultGuildId: process.env.DISCORD_GUILD_ID?.trim() || null,
    collectorApiKey: deriveSharedToken(),
    serviceToken: deriveSharedToken(),
    chatResponseUrl:
      process.env.DISCORD_CHAT_RESPONSE_URL?.trim()
      || 'http://127.0.0.1:4433/api/internal/discord/chat-response',
    maxHistoryMessages: Number.isFinite(maxHistoryMessages) ? Math.max(4, maxHistoryMessages) : 12,
  };
}

const config = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const app = express();
app.use(express.json({ limit: '1mb' }));

function readBearerToken(headerValue: string | undefined) {
  if (!headerValue) {
    return null;
  }

  const trimmed = headerValue.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }

  return trimmed;
}

function requireCollectorApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.header('x-api-key')?.trim() || readBearerToken(req.header('authorization'));
  if (token !== config.collectorApiKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
}

function parseBooleanParam(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumberParam(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseListParam(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTimeParam(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampMessageLimit(value: number) {
  return Math.min(1000, Math.max(1, Math.trunc(value)));
}

function isThreadChannel(channel: { type: ChannelType } | null | undefined) {
  if (!channel) {
    return false;
  }

  return channel.type === ChannelType.PublicThread
    || channel.type === ChannelType.PrivateThread
    || channel.type === ChannelType.AnnouncementThread;
}

function isSendableChannel(channel: unknown): channel is {
  id: string;
  type: ChannelType;
  sendTyping: () => Promise<unknown>;
  send: (content: string) => Promise<unknown>;
  messages: { fetch: (options: { limit: number }) => Promise<any> };
} {
  if (!channel || typeof channel !== 'object') {
    return false;
  }

  const candidate = channel as {
    sendTyping?: unknown;
    send?: unknown;
    messages?: { fetch?: unknown };
    id?: unknown;
    type?: unknown;
  };

  return typeof candidate.id === 'string'
    && typeof candidate.sendTyping === 'function'
    && typeof candidate.send === 'function'
    && typeof candidate.messages?.fetch === 'function'
    && typeof candidate.type === 'number';
}

function isFetchableGuildChannel(channel: unknown): channel is any {
  if (!channel || typeof channel !== 'object') {
    return false;
  }

  const candidate = channel as { type?: ChannelType; messages?: { fetch?: unknown } };
  return typeof candidate.messages?.fetch === 'function' && (
    candidate.type === ChannelType.GuildText
    || candidate.type === ChannelType.GuildAnnouncement
    || candidate.type === ChannelType.PublicThread
    || candidate.type === ChannelType.PrivateThread
    || candidate.type === ChannelType.AnnouncementThread
  );
}

async function shouldIncludeMessage(message: Message, filters: LatestMessageFilters) {
  if (!message.content?.trim()) {
    return false;
  }

  if (filters.ignoreBotMessages && message.author.bot) {
    return false;
  }

  if (filters.ignoreUserIds.has(message.author.id)) {
    return false;
  }

  if (filters.allowedUserIds.size > 0 && !filters.allowedUserIds.has(message.author.id)) {
    return false;
  }

  if (filters.messageContains && !message.content.toLowerCase().includes(filters.messageContains.toLowerCase())) {
    return false;
  }

  if (filters.ignoreRoleIds.size > 0) {
    let member = message.member;
    if (!member && message.guild) {
      member = await message.guild.members.fetch(message.author.id).catch(() => null);
    }

    if (member && member.roles.cache.some((role: { id: string }) => filters.ignoreRoleIds.has(role.id))) {
      return false;
    }
  }

  return true;
}

function serializeMessage(message: Message, channel: any) {
  const parentChannel = isThreadChannel(channel) ? channel.parent : null;
  const categoryId = isThreadChannel(channel)
    ? parentChannel?.parentId ?? null
    : channel.parentId ?? null;

  return {
    id: message.id,
    author: {
      id: message.author.id,
      username: message.author.username,
      display_name: message.member?.displayName || message.author.displayName || message.author.username,
    },
    content: message.content,
    created_at: message.createdAt.toISOString(),
    jump_url: message.url,
    category_id: categoryId,
    attachments: message.attachments.map((attachment: { id: string; name: string | null; contentType: string | null; url: string }) => ({
      id: attachment.id,
      filename: attachment.name,
      content_type: attachment.contentType,
      url: attachment.url,
    })),
    embeds: message.embeds.map((embed: { title?: string | null; description?: string | null; url?: string | null }) => ({
      title: embed.title ?? null,
      description: embed.description ?? null,
      url: embed.url ?? null,
    })),
  };
}

async function collectChannelMessages(channel: any, options: CollectLatestMessagesOptions) {
  const collected: ReturnType<typeof serializeMessage>[] = [];
  let before: string | undefined;

  while (collected.length < options.maxMessagesPerChannel) {
    const batchSize = Math.min(100, options.maxMessagesPerChannel - collected.length);
    const batch = await channel.messages.fetch({ limit: batchSize, before });
    if (!batch.size) {
      break;
    }

    const messages = [...batch.values()];
    let reachedWindowStart = false;

    for (const message of messages) {
      if (message.createdTimestamp > options.untilMs) {
        continue;
      }

      if (message.createdTimestamp < options.sinceMs) {
        reachedWindowStart = true;
        continue;
      }

      if (await shouldIncludeMessage(message, options.filters)) {
        collected.push(serializeMessage(message, channel));
      }
    }

    const oldest = messages.at(-1);
    if (!oldest || reachedWindowStart || batch.size < batchSize) {
      break;
    }

    before = oldest.id;
  }

  return collected.reverse();
}

async function listCollectableChannels(guildId: string, includeArchivedThreads: boolean) {
  const guild = await client.guilds.fetch(guildId);
  const fetchedChannels = await guild.channels.fetch();
  const channels: any[] = [];
  const skipped: Array<{ channel_id: string; reason: string }> = [];

  for (const channel of fetchedChannels.values()) {
    if (!isFetchableGuildChannel(channel)) {
      continue;
    }

    if (isThreadChannel(channel)) {
      continue;
    }

    channels.push(channel);
  }

  const activeThreads = await guild.channels.fetchActiveThreads().catch(() => null);
  if (activeThreads) {
    for (const thread of activeThreads.threads.values()) {
      if (isFetchableGuildChannel(thread)) {
        channels.push(thread);
      }
    }
  }

  if (includeArchivedThreads) {
    for (const channel of fetchedChannels.values()) {
      if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
        continue;
      }

      try {
        const archivedPublic = await channel.threads.fetchArchived({ type: 'public' }).catch(() => null);
        for (const thread of archivedPublic?.threads?.values() ?? []) {
          if (isFetchableGuildChannel(thread)) {
            channels.push(thread);
          }
        }

        const archivedPrivate = await channel.threads.fetchArchived({ type: 'private' }).catch(() => null);
        for (const thread of archivedPrivate?.threads?.values() ?? []) {
          if (isFetchableGuildChannel(thread)) {
            channels.push(thread);
          }
        }
      } catch {
        skipped.push({ channel_id: channel.id, reason: 'archived_threads_unavailable' });
      }
    }
  }

  return { channels, skipped };
}

async function collectLatestMessages(guildId: string, options: CollectLatestMessagesOptions) {
  const { channels, skipped } = await listCollectableChannels(guildId, options.includeArchivedThreads);
  const payloadChannels: any[] = [];
  let threadCount = 0;
  let messageCount = 0;

  for (const channel of channels) {
    try {
      const messages = await collectChannelMessages(channel, options);
      if (!messages.length) {
        continue;
      }

      const parentChannel = isThreadChannel(channel) ? channel.parent : null;
      const categoryId = isThreadChannel(channel)
        ? parentChannel?.parentId ?? null
        : channel.parentId ?? null;

      const channelEntry = {
        channel_id: channel.id,
        category_id: categoryId,
        channel_name: channel.name,
        channel_topic: typeof channel.topic === 'string' ? channel.topic : null,
        ...(isThreadChannel(channel)
          ? {
              thread_id: channel.id,
              thread_name: channel.name,
              parent_channel_id: parentChannel?.id ?? null,
              parent_channel_name: parentChannel?.name ?? null,
              is_thread: true,
            }
          : {}),
        messages,
      };

      payloadChannels.push(channelEntry);
      messageCount += messages.length;
      if (isThreadChannel(channel)) {
        threadCount += 1;
      }
    } catch {
      skipped.push({ channel_id: channel.id, reason: 'fetch_failed' });
    }
  }

  return {
    guild_id: guildId,
    since: new Date(options.sinceMs).toISOString(),
    until: new Date(options.untilMs).toISOString(),
    include_archived_threads: options.includeArchivedThreads,
    max_messages_per_channel: options.maxMessagesPerChannel,
    totals: {
      channels: payloadChannels.length,
      threads: threadCount,
      messages: messageCount,
    },
    skipped,
    channels: payloadChannels,
  };
}

function splitMessage(text: string, maxLength = 1900) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const boundary = remaining.lastIndexOf('\n', maxLength);
    const splitAt = boundary > 500 ? boundary : maxLength;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks.filter(Boolean);
}

function isExplicitMention(message: Message) {
  const botId = client.user?.id;
  if (!botId) {
    return false;
  }

  if (!message.mentions.users.has(botId)) {
    return false;
  }

  return message.content.includes(`<@${botId}>`) || message.content.includes(`<@!${botId}>`);
}

async function getHistory(channel: {
  messages: { fetch: (options: { limit: number }) => Promise<any> };
}) {
  const history = await channel.messages.fetch({ limit: Math.min(config.maxHistoryMessages, 25) }).catch(() => null);
  if (!history) {
    return [] as HistoryItem[];
  }

  return [...history.values()]
    .reverse()
    .filter((message) => message.content?.trim())
    .map((message) => ({
      authorName: message.member?.displayName || message.author.displayName || message.author.username,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isBot: message.author.bot,
    }));
}

async function resolveReplyChannel(message: Message): Promise<{
  id: string;
  type: ChannelType;
  sendTyping: () => Promise<unknown>;
  send: (content: string) => Promise<unknown>;
  messages: { fetch: (options: { limit: number }) => Promise<any> };
}> {
  if (!isSendableChannel(message.channel)) {
    throw new Error('Current Discord channel does not support replies');
  }

  if (isThreadChannel(message.channel)) {
    return message.channel;
  }

  if (typeof message.startThread === 'function') {
    try {
      const thread = await message.startThread({
        name: `chat-${message.author.username}`.slice(0, 90),
        autoArchiveDuration: 1440,
        reason: 'Prism Agent mention reply',
      });
      if (isSendableChannel(thread)) {
        return thread;
      }
    } catch {
      return message.channel;
    }
  }

  return message.channel;
}

async function requestChatResponse(message: Message, replyChannel: any) {
  const prompt = message.content.replace(/<@!?\d+>/g, '').trim() || 'Continue the conversation.';
  const history = await getHistory(replyChannel);
  const response = await fetch(config.chatResponseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Token': config.serviceToken,
    },
    body: JSON.stringify({
      prompt,
      guildId: message.guildId,
      channelId: message.channelId,
      threadId: isThreadChannel(replyChannel) ? replyChannel.id : null,
      authorName: message.member?.displayName || message.author.displayName || message.author.username,
      history,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`CHAT_RESPONSE_FAILED:${response.status}:${errorText.slice(0, 200)}`);
  }

  const payload = await response.json() as { responseText?: string };
  return payload.responseText?.trim() || 'No response received.';
}

client.on('ready', () => {
  console.log(`Discord wrapper ready as ${client.user?.tag ?? 'unknown-user'}`);
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot || !message.guildId || !isExplicitMention(message)) {
    return;
  }

  try {
    const replyChannel = await resolveReplyChannel(message);
    await replyChannel.sendTyping().catch(() => undefined);
    const replyText = await requestChatResponse(message, replyChannel);

    for (const chunk of splitMessage(replyText)) {
      await replyChannel.send(chunk);
    }
  } catch (error) {
    console.error('Failed to handle Discord mention', error);
    await message.reply('Sorry, I could not reach the chat service right now.').catch(() => undefined);
  }
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'prism-agent-discord-bot',
    discordReady: client.isReady(),
    defaultGuildId: config.defaultGuildId,
  });
});

app.get('/discord/latest-messages', requireCollectorApiKey, async (req, res) => {
  const guildId = typeof req.query.guild_id === 'string' ? req.query.guild_id.trim() : config.defaultGuildId;
  const now = Date.now();
  const sinceMs = parseTimeParam(req.query.since) ?? (now - 24 * 60 * 60 * 1000);
  const untilMs = parseTimeParam(req.query.until) ?? now;

  if (!guildId) {
    res.status(400).json({ ok: false, error: 'guild_id is required' });
    return;
  }

  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || sinceMs >= untilMs) {
    res.status(400).json({ ok: false, error: 'Invalid since/until window' });
    return;
  }

  const options: CollectLatestMessagesOptions = {
    sinceMs,
    untilMs,
    includeArchivedThreads: parseBooleanParam(req.query.include_archived_threads, false),
    maxMessagesPerChannel: clampMessageLimit(parseNumberParam(req.query.max_messages_per_channel, 200)),
    filters: {
      ignoreBotMessages: parseBooleanParam(req.query['filters.ignore_bot_messages'], false),
      ignoreUserIds: new Set(parseListParam(req.query['filters.ignore_user_ids'])),
      ignoreRoleIds: new Set(parseListParam(req.query['filters.ignore_roles'])),
      allowedUserIds: new Set(parseListParam(req.query['filters.allowed_user_ids'])),
      messageContains: typeof req.query['filters.message_contains'] === 'string'
        ? req.query['filters.message_contains'].trim() || null
        : null,
    },
  };

  try {
    const payload = await collectLatestMessages(guildId, options);
    res.json(payload);
  } catch (error) {
    console.error('Failed to collect latest Discord messages', error);
    res.status(500).json({ ok: false, error: 'LATEST_MESSAGES_FAILED' });
  }
});

async function start() {
  await client.login(config.discordToken);
  await new Promise<void>((resolve) => {
    if (client.isReady()) {
      resolve();
      return;
    }

    client.once('ready', () => resolve());
  });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Discord wrapper listening on ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start Discord wrapper', error);
  process.exit(1);
});