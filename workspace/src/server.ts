import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import multer from 'multer';
import { loadConfig } from './config.js';
import { getDb, runMigrations } from './db.js';
import { getIntegrationMeta } from './integrations.js';
import { normalizeSiteContent, readSiteContent, writeSiteContent } from './site-content.js';
import {
  applyAdminChangeRequest,
  claimCurrentProfile,
  createAdminChangeRequest,
  createAuditLog,
  createSession,
  getAdminChangeRequest,
  getAdminBadgeBySlug,
  getAdminOverview,
  getMyPoints,
  getPrivateProfileByUserId,
  getPublicProfileByHandle,
  getSessionSummary,
  getSessionUserByTokenHash,
  getUserByEmail,
  isUserAdmin,
  listAdminHomeModules,
  listAdminChangeRequests,
  listAdminBadges,
  listAdminUsers,
  listAdminPointsAudit,
  listBadgesCatalog,
  listCommunityRolesCatalog,
  listHomeModulesForUser,
  listLeaderboard,
  listMembers,
  listSkillsCatalog,
  registerOrClaimUser,
  revokeSession,
  touchSession,
  updateHomeModules,
  updateAdminBadge,
  updateAdminChangeRequest,
  updateProfile,
  updateUserLastSeen,
  upsertAdminBadge,
  type SessionUser,
} from './repository.js';
import { clearSessionCookie, createSessionRecord, createSessionToken, hashSessionToken, setSessionCookie } from './session.js';

const { compare, hash } = bcrypt;

const config = loadConfig();
const migrationResult = runMigrations();
const app = express();
const uploadsDir = path.resolve(config.workspaceRoot, 'uploads');
const avatarUploadsDir = path.join(uploadsDir, 'avatars');
const badgeUploadsDir = path.join(uploadsDir, 'badges');

fs.mkdirSync(avatarUploadsDir, { recursive: true });
fs.mkdirSync(badgeUploadsDir, { recursive: true });

function safeUploadExtension(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) {
    return extension;
  }

  return '.bin';
}

function buildUploadStorage(destination: string) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, destination);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${safeUploadExtension(file.originalname)}`);
    },
  });
}

const uploadFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  callback(new Error('INVALID_IMAGE_TYPE'));
};

const avatarUpload = multer({
  storage: buildUploadStorage(avatarUploadsDir),
  fileFilter: uploadFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const badgeImageUpload = multer({
  storage: buildUploadStorage(badgeUploadsDir),
  fileFilter: uploadFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/uploads', express.static(uploadsDir));

function readSessionToken(req: express.Request) {
  const cookieValue = req.cookies?.[config.sessionCookieName];
  return typeof cookieValue === 'string' ? cookieValue : null;
}

function getRequestSessionUser(req: express.Request) {
  const token = readSessionToken(req);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const sessionUser = getSessionUserByTokenHash(tokenHash);
  if (!sessionUser) return null;

  touchSession(tokenHash);
  updateUserLastSeen(sessionUser.id);
  return sessionUser;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionUser = getRequestSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  res.locals.sessionUser = sessionUser;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionUser = getRequestSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  if (!isUserAdmin(sessionUser.id)) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  res.locals.sessionUser = sessionUser;
  next();
}

function getInternalServiceToken() {
  const explicitToken = process.env.INTERNAL_SERVICE_TOKEN?.trim() || process.env.SERVICE_SHARED_TOKEN?.trim();
  if (explicitToken) {
    return explicitToken;
  }

  return createHash('sha256')
    .update(`${config.adminPassword}:prism-agent-internal-service`)
    .digest('hex');
}

function readServiceToken(req: express.Request) {
  const directHeader = req.header('x-service-token')?.trim();
  if (directHeader) {
    return directHeader;
  }

  const authorization = req.header('authorization')?.trim();
  if (!authorization) {
    return null;
  }

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return authorization;
}

function requireServiceToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (readServiceToken(req) !== getInternalServiceToken()) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseNullableString(value: unknown) {
  if (value === null) return null;
  return typeof value === 'string' ? value.trim() : undefined;
}

function parseOptionalLimit(value: unknown, fallback?: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
}

function stringifyDiscordHistory(
  history: Array<{
    authorName: string;
    content: string;
    createdAt: string;
    isBot: boolean;
  }>,
) {
  return history
    .map((entry) => {
      const role = entry.isBot ? 'Assistant' : entry.authorName;
      return `[${entry.createdAt}] ${role}: ${entry.content}`;
    })
    .join('\n');
}

function readOpenAIResponseText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof candidate.output_text === 'string' && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  if (!Array.isArray(candidate.output)) {
    return null;
  }

  const parts = candidate.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((item): item is { type: string; text: string } => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter(Boolean);

  return parts.length ? parts.join('\n\n') : null;
}

interface DiscordChatResponseInput {
  prompt: string;
  guildId: string;
  channelId: string;
  threadId?: string | null;
  authorName: string;
  history: Array<{
    authorName: string;
    content: string;
    createdAt: string;
    isBot: boolean;
  }>;
}

interface DiscordChatResponseResult {
  model: string | null;
  provider: 'agent-endpoint';
  sessionId: string;
  text: string;
}

interface DiscordAgentAdapterInput {
  sessionId: string;
  prompt: string;
  guildId: string;
  channelId: string;
  threadId: string | null;
  authorName: string;
  history: Array<{
    authorName: string;
    content: string;
    createdAt: string;
    isBot: boolean;
  }>;
  metadata: Record<string, unknown>;
}

interface DiscordAgentAdapterResult {
  provider: string;
  model: string | null;
  responseText: string;
  sessionId: string;
}

function buildDiscordSessionId(input: DiscordChatResponseInput) {
  return `discord:${input.guildId}:${input.threadId || input.channelId}`;
}

function readJsonString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readAgentResponseText(payload: unknown): string | null {
  const openAiText = readOpenAIResponseText(payload);
  if (openAiText) {
    return openAiText;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    responseText?: unknown;
    text?: unknown;
    message?: unknown;
    content?: unknown;
    answer?: unknown;
    response?: { text?: unknown; content?: unknown; message?: unknown };
    data?: { text?: unknown; content?: unknown; message?: unknown };
  };

  return readJsonString(candidate.responseText)
    || readJsonString(candidate.text)
    || readJsonString(candidate.message)
    || readJsonString(candidate.content)
    || readJsonString(candidate.answer)
    || readJsonString(candidate.response?.text)
    || readJsonString(candidate.response?.content)
    || readJsonString(candidate.response?.message)
    || readJsonString(candidate.data?.text)
    || readJsonString(candidate.data?.content)
    || readJsonString(candidate.data?.message)
    || null;
}

function readAgentResponseModel(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    model?: unknown;
    response?: { model?: unknown };
    data?: { model?: unknown };
  };

  return readJsonString(candidate.model)
    || readJsonString(candidate.response?.model)
    || readJsonString(candidate.data?.model)
    || null;
}

function buildDiscordAgentMessages(input: DiscordAgentAdapterInput) {
  const historyMessages = input.history.map((entry) => ({
    role: entry.isBot ? 'assistant' : 'user',
    content: entry.content,
    authorName: entry.authorName,
    createdAt: entry.createdAt,
  }));

  return [
    ...historyMessages,
    {
      role: 'user',
      content: input.prompt,
      authorName: input.authorName,
      createdAt: new Date().toISOString(),
    },
  ];
}

async function generateOpenClawDiscordAgentResponse(
  input: DiscordAgentAdapterInput,
): Promise<DiscordAgentAdapterResult> {
  const endpoint = process.env.OPENCLAW_AGENT_ENDPOINT?.trim()
    || process.env.OPENCLAW_CHAT_ENDPOINT?.trim()
    || null;

  if (!endpoint) {
    throw new Error('OPENCLAW_AGENT_ENDPOINT_MISSING');
  }

  const authToken = process.env.OPENCLAW_AGENT_AUTH_TOKEN?.trim()
    || process.env.OPENCLAW_GATEWAY_TOKEN?.trim()
    || null;
  const configuredModel = process.env.OPENCLAW_AGENT_MODEL?.trim() || null;
  const timeoutMs = Number(
    process.env.OPENCLAW_AGENT_TIMEOUT_MS
      || process.env.DISCORD_AGENT_TIMEOUT_MS
      || 30_000,
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      source: 'discord',
      transport: 'discord',
      sessionId: input.sessionId,
      ...(configuredModel ? { model: configuredModel } : {}),
      prompt: input.prompt,
      input: input.prompt,
      message: input.prompt,
      author: {
        displayName: input.authorName,
      },
      messages: buildDiscordAgentMessages(input),
      history: input.history,
      context: {
        guildId: input.guildId,
        channelId: input.channelId,
        threadId: input.threadId,
      },
      metadata: {
        ...input.metadata,
        guildId: input.guildId,
        channelId: input.channelId,
        threadId: input.threadId,
        transport: 'discord',
      },
    }),
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? Math.max(1_000, timeoutMs) : 30_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OPENCLAW_AGENT_ENDPOINT_FAILED:${response.status}:${errorText.slice(0, 200)}`);
  }

  const payload = await response.json().catch(() => null);
  const responseText = readAgentResponseText(payload);
  if (!responseText) {
    throw new Error('OPENCLAW_AGENT_ENDPOINT_EMPTY');
  }

  return {
    provider: 'openclaw',
    model: readAgentResponseModel(payload) || configuredModel,
    responseText,
    sessionId: input.sessionId,
  };
}

async function generateAgentEndpointDiscordChatResponse(
  input: DiscordChatResponseInput,
  endpoint: string,
): Promise<DiscordChatResponseResult> {
  const sessionId = buildDiscordSessionId(input);
  const timeoutMs = Number(process.env.DISCORD_AGENT_TIMEOUT_MS || 30_000);
  const authToken = process.env.DISCORD_AGENT_AUTH_TOKEN?.trim()
    || process.env.AGENT_CHAT_AUTH_TOKEN?.trim()
    || process.env.OPENCLAW_GATEWAY_TOKEN?.trim()
    || getInternalServiceToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      source: 'discord',
      sessionId,
      prompt: input.prompt,
      guildId: input.guildId,
      channelId: input.channelId,
      threadId: input.threadId ?? null,
      author: {
        displayName: input.authorName,
      },
      history: input.history,
      metadata: {
        transport: 'discord',
        sessionKeyType: input.threadId ? 'thread' : 'channel',
      },
    }),
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? Math.max(1_000, timeoutMs) : 30_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AGENT_ENDPOINT_FAILED:${response.status}:${errorText.slice(0, 200)}`);
  }

  const payload = await response.json().catch(() => null);
  const text = readAgentResponseText(payload);
  if (!text) {
    throw new Error('AGENT_ENDPOINT_EMPTY');
  }

  const model = payload && typeof payload === 'object'
    ? readAgentResponseModel(payload)
    : null;

  return {
    model,
    provider: 'agent-endpoint',
    sessionId,
    text,
  };
}

async function generateDiscordChatResponse(input: DiscordChatResponseInput): Promise<DiscordChatResponseResult> {
  const endpoint = process.env.DISCORD_AGENT_ENDPOINT?.trim()
    || process.env.AGENT_CHAT_ENDPOINT?.trim()
    || `http://127.0.0.1:${config.port}/api/internal/agents/discord/openclaw`;

  return generateAgentEndpointDiscordChatResponse(input, endpoint);
}

interface ParsedHomeModuleUpdate {
  id: string;
  enabled?: boolean;
  displayOrder?: number;
  visibilityRole?: string | null;
  config?: Record<string, unknown>;
}

function parseHomeModuleUpdate(value: unknown): ParsedHomeModuleUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = parseString(candidate.id);
  if (!id) {
    return null;
  }

  return {
    id,
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
    displayOrder: parseOptionalInteger(candidate.displayOrder),
    visibilityRole: candidate.visibilityRole === null ? null : parseNullableString(candidate.visibilityRole),
    config:
      candidate.config && typeof candidate.config === 'object' && !Array.isArray(candidate.config)
        ? candidate.config as Record<string, unknown>
        : undefined,
  };
}

function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    seen.add(trimmed);
  }

  return [...seen];
}

function normalizeAdminChangeRequestPayload(requestType: string, value: unknown) {
  const payload = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  if (requestType === 'points_adjustment') {
    const userIds = readStringArray(payload.userIds);
    const delta = Number(payload.delta);
    const reason = parseString(payload.reason);

    if (!userIds.length) {
      throw new Error('NO_TARGET_USERS');
    }

    if (!Number.isInteger(delta) || delta === 0) {
      throw new Error('INVALID_POINTS_DELTA');
    }

    if (!reason) {
      throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
    }

    return { userIds, delta, reason };
  }

  if (requestType === 'badge_create') {
    const badge = payload.badge && typeof payload.badge === 'object' && !Array.isArray(payload.badge)
      ? payload.badge as Record<string, unknown>
      : {};
    const slug = parseString(badge.slug);
    const label = parseString(badge.label);
    const description = parseString(badge.description);
    const imageUrl = parseString(badge.imageUrl || badge.image_url);

    if (!slug && !label) {
      throw new Error('BADGE_DETAILS_REQUIRED');
    }

    return {
      badge: {
        ...(slug ? { slug } : {}),
        ...(label ? { label } : {}),
        ...(description ? { description } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    };
  }

  if (requestType === 'badge_award') {
    const userIds = readStringArray(payload.userIds);
    const reason = parseString(payload.reason);
    const badgeSlug = parseString(payload.badgeSlug || payload.badge_slug);
    const badgeLabel = parseString(payload.badgeLabel || payload.badge_label);

    if (!badgeSlug) {
      throw new Error('BADGE_SELECTION_REQUIRED');
    }

    if (!userIds.length) {
      throw new Error('NO_TARGET_USERS');
    }

    if (!reason) {
      throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
    }

    return {
      userIds,
      reason,
      badgeSlug,
      ...(badgeLabel ? { badgeLabel } : {}),
    };
  }

  if (requestType === 'badge_request') {
    const badge = payload.badge && typeof payload.badge === 'object' && !Array.isArray(payload.badge)
      ? payload.badge as Record<string, unknown>
      : {};
    const userIds = readStringArray(payload.userIds);
    const reason = parseString(payload.reason);
    const slug = parseString(badge.slug);
    const label = parseString(badge.label);
    const description = parseString(badge.description);
    const imageUrl = parseString(badge.imageUrl || badge.image_url);

    if (!slug && !label) {
      throw new Error('BADGE_DETAILS_REQUIRED');
    }

    if (userIds.length && !reason) {
      throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
    }

    return {
      userIds,
      reason,
      badge: {
        ...(slug ? { slug } : {}),
        ...(label ? { label } : {}),
        ...(description ? { description } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    };
  }

  if (requestType === 'site_content_update') {
    const siteContent = payload.siteContent ?? payload;

    if (!siteContent || typeof siteContent !== 'object' || Array.isArray(siteContent)) {
      throw new Error('SITE_CONTENT_REQUIRED');
    }

    return {
      siteContent: normalizeSiteContent(siteContent),
    };
  }

  return payload;
}

function readRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function requireSessionUser(res: express.Response): SessionUser {
  return res.locals.sessionUser as SessionUser;
}

function toUploadUrl(...segments: string[]) {
  return `/api/uploads/${segments.join('/').replace(/\\/g, '/')}`;
}

app.get('/api/health', (_req, res) => {
  const dbRow = getDb().prepare('SELECT COUNT(*) AS count FROM schema_migrations').get() as { count: number };

  res.json({
    ok: true,
    service: 'prism-agent',
    authMode: 'opaque-cookie-session',
    appliedMigrations: dbRow.count,
    startupMigrations: migrationResult.executed,
  });
});

app.post('/api/internal/discord/chat-response', requireServiceToken, async (req, res) => {
  const prompt = parseString(req.body?.prompt ?? req.body?.chatInput);
  const guildId = parseString(req.body?.guildId ?? req.body?.guild_id);
  const channelId = parseString(req.body?.channelId ?? req.body?.channel_id);
  const threadId = parseNullableString(req.body?.threadId ?? req.body?.thread_id) ?? null;
  const authorName = parseString(req.body?.authorName ?? req.body?.author?.displayName ?? req.body?.author?.username);
  const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
  const history = rawHistory
    .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      authorName: parseString(entry.authorName ?? entry.author_name ?? entry.author ?? 'User') || 'User',
      content: parseString(entry.content),
      createdAt: parseString(entry.createdAt ?? entry.created_at) || new Date().toISOString(),
      isBot: entry.isBot === true || entry.is_bot === true,
    }))
    .filter((entry: { content: string }) => entry.content);

  if (!prompt || !guildId || !channelId) {
    res.status(400).json({ ok: false, error: 'prompt, guildId, and channelId are required' });
    return;
  }

  try {
    const responsePayload = await generateDiscordChatResponse({
      prompt,
      guildId,
      channelId,
      threadId,
      authorName: authorName || 'User',
      history,
    });

    res.json({
      ok: true,
      model: responsePayload.model,
      provider: responsePayload.provider,
      responseText: responsePayload.text,
      sessionId: responsePayload.sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CHAT_RESPONSE_FAILED';
    const statusCode = message === 'OPENCLAW_AGENT_ENDPOINT_MISSING' ? 503 : 502;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.post('/api/internal/agents/discord/openclaw', requireServiceToken, async (req, res) => {
  const prompt = parseString(req.body?.prompt ?? req.body?.message ?? req.body?.input);
  const sessionId = parseString(req.body?.sessionId);
  const guildId = parseString(req.body?.guildId ?? req.body?.context?.guildId ?? req.body?.metadata?.guildId);
  const channelId = parseString(req.body?.channelId ?? req.body?.context?.channelId ?? req.body?.metadata?.channelId);
  const threadId = parseNullableString(
    req.body?.threadId
      ?? req.body?.context?.threadId
      ?? req.body?.metadata?.threadId,
  ) ?? null;
  const authorName = parseString(req.body?.author?.displayName ?? req.body?.authorName ?? req.body?.author?.username) || 'User';
  const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
  const history = rawHistory
    .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      authorName: parseString(entry.authorName ?? entry.author_name ?? entry.author ?? 'User') || 'User',
      content: parseString(entry.content),
      createdAt: parseString(entry.createdAt ?? entry.created_at) || new Date().toISOString(),
      isBot: entry.isBot === true || entry.is_bot === true,
    }))
    .filter((entry: { content: string }) => entry.content);

  if (!prompt || !sessionId || !guildId || !channelId) {
    res.status(400).json({ ok: false, error: 'sessionId, prompt, guildId, and channelId are required' });
    return;
  }

  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
    ? req.body.metadata as Record<string, unknown>
    : {};

  try {
    const responsePayload = await generateOpenClawDiscordAgentResponse({
      sessionId,
      prompt,
      guildId,
      channelId,
      threadId,
      authorName,
      history,
      metadata,
    });

    res.json({
      ok: true,
      provider: responsePayload.provider,
      model: responsePayload.model,
      responseText: responsePayload.responseText,
      sessionId: responsePayload.sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OPENCLAW_AGENT_ADAPTER_FAILED';
    const statusCode = message === 'OPENCLAW_AGENT_ENDPOINT_MISSING' ? 503 : 502;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get('/api/integrations/meta', (_req, res) => {
  res.json({ ok: true, integrations: getIntegrationMeta(config) });
});

app.get('/api/site-content', (_req, res) => {
  res.json({ ok: true, siteContent: readSiteContent(config) });
});

app.get('/api/auth/me', (req, res) => {
  const sessionUser = getRequestSessionUser(req);
  res.json({ ok: true, user: sessionUser });
});

app.post('/api/auth/register', async (req, res) => {
  const email = parseString(req.body?.email).toLowerCase();
  const password = parseString(req.body?.password);
  const handle = parseString(req.body?.handle);
  const displayName = parseString(req.body?.displayName || req.body?.display_name);

  if (!email || !password || !handle || !displayName) {
    res.status(400).json({ ok: false, error: 'email, password, handle, and displayName are required' });
    return;
  }

  try {
    const passwordHash = await hash(password, 10);
    const user = registerOrClaimUser({ email, passwordHash, handle, displayName });
    if (!user) {
      throw new Error('REGISTER_FAILED');
    }

    const rawSessionToken = createSessionToken();
    const sessionRecord = createSessionRecord(config, user.id, hashSessionToken(rawSessionToken));
    createSession(sessionRecord);
    setSessionCookie(res, config, rawSessionToken);
    createAuditLog({
      actorUserId: user.id,
      actionType: 'auth.register',
      targetType: 'user',
      targetId: user.id,
      meta: { email: user.email, handle: user.handle },
    });

    res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_IN_USE') {
      res.status(409).json({ ok: false, error: 'Email is already registered' });
      return;
    }

    if (error instanceof Error && error.message === 'HANDLE_TAKEN') {
      res.status(409).json({ ok: false, error: 'Handle is already taken' });
      return;
    }

    if (error instanceof Error && error.message === 'SEED_EMAIL_MISMATCH') {
      res.status(409).json({ ok: false, error: 'Seeded profile email does not match the registration email' });
      return;
    }

    res.status(500).json({ ok: false, error: 'Unable to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = parseString(req.body?.email).toLowerCase();
  const password = parseString(req.body?.password);

  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'email and password are required' });
    return;
  }

  const user = getUserByEmail(email);
  if (!user || !user.password_hash || user.is_banned) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }

  const passwordMatches = await compare(password, user.password_hash);
  if (!passwordMatches) {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
    return;
  }

  const rawSessionToken = createSessionToken();
  const sessionRecord = createSessionRecord(config, user.id, hashSessionToken(rawSessionToken));
  createSession(sessionRecord);
  setSessionCookie(res, config, rawSessionToken);

  const sessionUser = getSessionSummary(user.id);
  createAuditLog({
    actorUserId: user.id,
    actionType: 'auth.login',
    targetType: 'user',
    targetId: user.id,
  });

  res.json({ ok: true, user: sessionUser });
});

app.post('/api/auth/logout', (req, res) => {
  const token = readSessionToken(req);
  if (token) {
    revokeSession(hashSessionToken(token));
  }

  clearSessionCookie(res, config);
  res.json({ ok: true });
});

app.post('/api/profile/me/avatar', requireAuth, avatarUpload.single('file'), (req, res) => {
  const sessionUser = requireSessionUser(res);

  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Image file is required' });
    return;
  }

  const avatarUrl = toUploadUrl('avatars', req.file.filename);
  const profile = updateProfile(sessionUser.id, { avatarUrl });

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'profile.avatar.upload',
    targetType: 'profile',
    targetId: profile?.id ?? null,
    meta: {
      avatarUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({ ok: true, avatarUrl, profile });
});

app.get('/api/profile/me', requireAuth, (_req, res) => {
  const sessionUser = requireSessionUser(res);
  const profile = getPrivateProfileByUserId(sessionUser.id);
  res.json({ ok: true, profile });
});

app.put('/api/profile/me', requireAuth, (req, res) => {
  const sessionUser = requireSessionUser(res);

  try {
    const profile = updateProfile(sessionUser.id, {
      handle: typeof req.body?.handle === 'string' ? req.body.handle : undefined,
      displayName: typeof req.body?.displayName === 'string' ? req.body.displayName : undefined,
      bio: typeof req.body?.bio === 'string' || req.body?.bio === null ? req.body.bio : undefined,
      avatarUrl:
        typeof req.body?.avatarUrl === 'string' || req.body?.avatarUrl === null ? req.body.avatarUrl : undefined,
      walletAddress:
        typeof req.body?.walletAddress === 'string' || req.body?.walletAddress === null
          ? req.body.walletAddress
          : undefined,
      location:
        typeof req.body?.location === 'string' || req.body?.location === null ? req.body.location : undefined,
      links: Array.isArray(req.body?.links) ? req.body.links : undefined,
      contact:
        req.body?.contact && typeof req.body.contact === 'object' && !Array.isArray(req.body.contact)
          ? req.body.contact
          : undefined,
      skillSlugs: Array.isArray(req.body?.skillSlugs) ? req.body.skillSlugs : undefined,
      communityRoleSlugs: Array.isArray(req.body?.communityRoleSlugs) ? req.body.communityRoleSlugs : undefined,
      visibility: typeof req.body?.visibility === 'string' ? req.body.visibility : undefined,
      visibilitySettings:
        req.body?.visibilitySettings
        && typeof req.body.visibilitySettings === 'object'
        && !Array.isArray(req.body.visibilitySettings)
          ? req.body.visibilitySettings
          : undefined,
    });

    if (!profile) {
      res.status(404).json({ ok: false, error: 'Profile not found' });
      return;
    }

    createAuditLog({
      actorUserId: sessionUser.id,
      actionType: 'profile.update',
      targetType: 'profile',
      targetId: profile.id,
    });
    res.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Error && error.message === 'HANDLE_TAKEN') {
      res.status(409).json({ ok: false, error: 'Handle is already taken' });
      return;
    }

    res.status(500).json({ ok: false, error: 'Unable to update profile' });
  }
});

app.post('/api/profile/me/claim', requireAuth, (_req, res) => {
  const sessionUser = requireSessionUser(res);
  const profile = claimCurrentProfile(sessionUser.id);
  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'profile.claim',
    targetType: 'profile',
    targetId: profile?.id ?? null,
  });
  res.json({ ok: true, profile });
});

app.get('/api/profiles/:handle', (req, res) => {
  const sessionUser = getRequestSessionUser(req);
  const profile = getPublicProfileByHandle(req.params.handle, sessionUser?.id);

  if (!profile) {
    res.status(404).json({ ok: false, error: 'Profile not found' });
    return;
  }

  res.json({ ok: true, profile });
});

app.get('/api/members', (req, res) => {
  const sessionUser = getRequestSessionUser(req);
  const members = listMembers({
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    skill: typeof req.query.skill === 'string' ? req.query.skill : undefined,
    communityRole: typeof req.query.communityRole === 'string' ? req.query.communityRole : undefined,
    limit: parseOptionalLimit(req.query.limit),
  }, sessionUser?.id);

  res.json({ ok: true, members });
});

app.get('/api/points/me', requireAuth, (_req, res) => {
  const sessionUser = requireSessionUser(res);
  res.json({ ok: true, points: getMyPoints(sessionUser.id) });
});

app.get('/api/points/leaderboard', (req, res) => {
  const sessionUser = getRequestSessionUser(req);
  const limit = parseOptionalLimit(req.query.limit, 25) ?? 25;
  res.json({ ok: true, leaderboard: listLeaderboard(limit, sessionUser?.id) });
});

app.get('/api/home-modules', requireAuth, (_req, res) => {
  const sessionUser = requireSessionUser(res);
  res.json({ ok: true, modules: listHomeModulesForUser(sessionUser.id) });
});

app.get('/api/taxonomy/skills', (_req, res) => {
  res.json({ ok: true, skills: listSkillsCatalog() });
});

app.get('/api/taxonomy/community-roles', (_req, res) => {
  res.json({ ok: true, communityRoles: listCommunityRolesCatalog() });
});

app.get('/api/taxonomy/badges', (_req, res) => {
  res.json({ ok: true, badges: listBadgesCatalog() });
});

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  res.json({ ok: true, overview: getAdminOverview() });
});

app.get('/api/admin/home-modules', requireAdmin, (_req, res) => {
  res.json({ ok: true, modules: listAdminHomeModules() });
});

app.put('/api/admin/home-modules', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const incomingModules = Array.isArray(req.body?.modules)
    ? req.body.modules
    : Array.isArray(req.body)
      ? req.body
      : null;

  if (!incomingModules) {
    res.status(400).json({ ok: false, error: 'A modules array is required' });
    return;
  }

  const updates: ParsedHomeModuleUpdate[] = [];

  for (const item of incomingModules as unknown[]) {
    const parsed = parseHomeModuleUpdate(item);
    if (parsed) {
      updates.push(parsed);
    }
  }

  if (!updates.length) {
    res.status(400).json({ ok: false, error: 'At least one valid module update is required' });
    return;
  }

  const modules = updateHomeModules(updates);

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.home_modules.update',
    targetType: 'home_module',
    targetId: 'home-modules',
    meta: {
      moduleIds: updates.map((module) => module.id),
      updatedCount: updates.length,
    },
  });

  res.json({ ok: true, modules });
});

app.put('/api/admin/site-content', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const siteContent = writeSiteContent(config, req.body?.siteContent ?? req.body);

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.site_content.update',
    targetType: 'site_content',
    targetId: 'site-content',
    meta: {
      navigation: Object.keys(siteContent.navigation),
      pages: Object.keys(siteContent.pages),
    },
  });

  res.json({ ok: true, siteContent });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
  res.json({ ok: true, users: listAdminUsers(limit) });
});

app.get('/api/admin/points/audit', requireAdmin, (req, res) => {
  const limit = parseOptionalLimit(req.query.limit, 200) ?? 200;
  res.json({ ok: true, auditEntries: listAdminPointsAudit(limit) });
});

app.get('/api/admin/badges', requireAdmin, (_req, res) => {
  res.json({ ok: true, badges: listAdminBadges() });
});

app.get('/api/admin/change-requests', requireAdmin, (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  res.json({ ok: true, changeRequests: listAdminChangeRequests(state) });
});

app.get('/api/admin/change-requests/:id', requireAdmin, (req, res) => {
  const changeRequestId = readRouteParam(req.params.id);
  const changeRequest = getAdminChangeRequest(changeRequestId);

  if (!changeRequest) {
    res.status(404).json({ ok: false, error: 'Change request not found' });
    return;
  }

  res.json({ ok: true, changeRequest });
});

app.post('/api/admin/uploads/badge-image', requireAdmin, badgeImageUpload.single('file'), (req, res) => {
  const sessionUser = requireSessionUser(res);

  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Image file is required' });
    return;
  }

  const imageUrl = toUploadUrl('badges', req.file.filename);

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.badge_image.upload',
    targetType: 'upload',
    targetId: imageUrl,
    meta: {
      imageUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({ ok: true, imageUrl });
});

app.post('/api/admin/badges', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const label = parseString(req.body?.label);
  const requestedSlug = parseString(req.body?.slug);
  const description = parseNullableString(req.body?.description);
  const imageUrl = parseNullableString(req.body?.imageUrl || req.body?.image_url);
  const slug = slugifyValue(requestedSlug || label);

  if (!slug || !label) {
    res.status(400).json({ ok: false, error: 'Badge label and slug are required' });
    return;
  }

  const badge = upsertAdminBadge({ slug, label, description: description ?? null, imageUrl: imageUrl ?? null });

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.badge.upsert',
    targetType: 'badge',
    targetId: badge?.slug ?? slug,
    meta: { slug, label },
  });

  res.status(201).json({ ok: true, badge });
});

app.patch('/api/admin/badges/:slug', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const slug = readRouteParam(req.params.slug);
  const existing = getAdminBadgeBySlug(slug);

  if (!existing) {
    res.status(404).json({ ok: false, error: 'Badge not found' });
    return;
  }

  const label = parseString(req.body?.label);
  const description = parseNullableString(req.body?.description);
  const imageUrl = parseNullableString(req.body?.imageUrl || req.body?.image_url);
  const badge = updateAdminBadge(slug, {
    ...(label ? { label } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  });

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.badge.update',
    targetType: 'badge',
    targetId: slug,
    meta: {
      label: badge?.label ?? existing.label,
      imageUrl: badge?.imageUrl ?? existing.imageUrl,
    },
  });

  res.json({ ok: true, badge });
});

app.post('/api/admin/change-requests', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const requestType = parseString(req.body?.requestType || req.body?.request_type);
  const title = parseString(req.body?.title);
  const priority = parseString(req.body?.priority) || 'normal';

  if (!requestType || !title) {
    res.status(400).json({ ok: false, error: 'requestType and title are required' });
    return;
  }

  let payload: Record<string, unknown>;

  try {
    payload = normalizeAdminChangeRequestPayload(requestType, req.body?.payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_TARGET_USERS') {
      res.status(400).json({ ok: false, error: 'Select at least one target user for points requests' });
      return;
    }

    if (error instanceof Error && error.message === 'INVALID_POINTS_DELTA') {
      res.status(400).json({ ok: false, error: 'Points requests require a non-zero integer delta' });
      return;
    }

    if (error instanceof Error && error.message === 'CHANGE_REQUEST_REASON_REQUIRED') {
      res.status(400).json({ ok: false, error: 'A reason is required for points and badge issuance requests' });
      return;
    }

    if (error instanceof Error && error.message === 'BADGE_DETAILS_REQUIRED') {
      res.status(400).json({ ok: false, error: 'Badge requests require a badge slug or label' });
      return;
    }

    if (error instanceof Error && error.message === 'BADGE_SELECTION_REQUIRED') {
      res.status(400).json({ ok: false, error: 'Badge award requests require an existing badge selection' });
      return;
    }

    if (error instanceof Error && error.message === 'SITE_CONTENT_REQUIRED') {
      res.status(400).json({ ok: false, error: 'Brand and copy requests require a site content JSON payload' });
      return;
    }

    throw error;
  }

  const changeRequest = createAdminChangeRequest({
    requestType,
    title,
    priority,
    payload,
    requestedByUserId: sessionUser.id,
  });

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.change_request.create',
    targetType: 'admin_change_request',
    targetId: changeRequest?.id ?? null,
    meta: { requestType, priority },
  });

  res.status(201).json({ ok: true, changeRequest });
});

app.post('/api/admin/change-requests/:id/apply', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const changeRequestId = readRouteParam(req.params.id);
  const resolutionNote = typeof req.body?.resolutionNote === 'string' ? req.body.resolutionNote : undefined;

  try {
    const result = applyAdminChangeRequest(changeRequestId, sessionUser.id, resolutionNote);

    if (!result) {
      res.status(404).json({ ok: false, error: 'Change request not found' });
      return;
    }

    createAuditLog({
      actorUserId: sessionUser.id,
      actionType: 'admin.change_request.apply',
      targetType: 'admin_change_request',
      targetId: result.changeRequest.id,
      meta: { ...result.applyResult },
    });

    res.json({ ok: true, changeRequest: result.changeRequest, applyResult: result.applyResult });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_APPLIED') {
      res.status(409).json({ ok: false, error: 'This change request has already been applied' });
      return;
    }

    if (error instanceof Error && error.message === 'NO_TARGET_USERS') {
      res.status(400).json({ ok: false, error: 'Select at least one target user before applying the request' });
      return;
    }

    if (error instanceof Error && error.message === 'NO_VALID_TARGET_USERS') {
      res.status(400).json({ ok: false, error: 'No valid target users were found for this request' });
      return;
    }

    if (error instanceof Error && error.message === 'INVALID_POINTS_DELTA') {
      res.status(400).json({ ok: false, error: 'Points requests require a non-zero integer delta' });
      return;
    }

    if (error instanceof Error && error.message === 'CHANGE_REQUEST_REASON_REQUIRED') {
      res.status(400).json({ ok: false, error: 'A reason is required before issuing points or badges' });
      return;
    }

    if (error instanceof Error && error.message === 'BADGE_DETAILS_REQUIRED') {
      res.status(400).json({ ok: false, error: 'Badge requests require a badge slug or label' });
      return;
    }

    if (error instanceof Error && error.message === 'BADGE_SELECTION_REQUIRED') {
      res.status(400).json({ ok: false, error: 'Choose an existing badge before applying this request' });
      return;
    }

    if (error instanceof Error && error.message === 'BADGE_NOT_FOUND') {
      res.status(400).json({ ok: false, error: 'The selected badge no longer exists' });
      return;
    }

    if (error instanceof Error && error.message === 'SITE_CONTENT_REQUIRED') {
      res.status(400).json({ ok: false, error: 'This request is missing a valid site content payload' });
      return;
    }

    if (error instanceof Error && error.message === 'UNSUPPORTED_REQUEST_TYPE') {
      res.status(400).json({ ok: false, error: 'Only points, badge, and brand or copy requests can be applied from the admin board right now' });
      return;
    }

    throw error;
  }
});

app.patch('/api/admin/change-requests/:id', requireAdmin, (req, res) => {
  const sessionUser = requireSessionUser(res);
  const changeRequestId = readRouteParam(req.params.id);
  const nextState = typeof req.body?.state === 'string' ? req.body.state : undefined;
  const nextPriority = typeof req.body?.priority === 'string' ? req.body.priority : undefined;
  const resolutionNote = typeof req.body?.resolutionNote === 'string' ? req.body.resolutionNote : undefined;

  if (nextState && !['pending', 'opened', 'closed'].includes(nextState)) {
    res.status(400).json({ ok: false, error: 'Invalid state' });
    return;
  }

  if (nextPriority && !['low', 'normal', 'high', 'urgent'].includes(nextPriority)) {
    res.status(400).json({ ok: false, error: 'Invalid priority' });
    return;
  }

  const changeRequest = updateAdminChangeRequest(changeRequestId, {
    state: nextState,
    priority: nextPriority,
    resolutionNote,
    assignedToUserId: sessionUser.id,
  });

  if (!changeRequest) {
    res.status(404).json({ ok: false, error: 'Change request not found' });
    return;
  }

  createAuditLog({
    actorUserId: sessionUser.id,
    actionType: 'admin.change_request.update',
    targetType: 'admin_change_request',
    targetId: changeRequest.id,
    meta: {
      state: changeRequest.state,
      priority: changeRequest.priority,
      resolutionNote: changeRequest.resolutionNote,
    },
  });

  res.json({ ok: true, changeRequest });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ ok: false, error: 'Image upload must be 5MB or smaller' });
    return;
  }

  if (error instanceof Error && error.message === 'INVALID_IMAGE_TYPE') {
    res.status(400).json({ ok: false, error: 'Only image uploads are supported' });
    return;
  }

  console.error(error);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Prism Agent API listening on ${config.port}`);
});