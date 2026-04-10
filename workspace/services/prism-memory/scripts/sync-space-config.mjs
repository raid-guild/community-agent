#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const serviceRoot = path.resolve(scriptDir, '..');
const bundledRoot = path.join(serviceRoot, 'superprism_poc', 'raidguild');
const bundledConfigPath = path.join(bundledRoot, 'config', 'space.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function slugifyBucket(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function uniqueBucketSlug(label, used) {
  const base = slugifyBucket(label) || 'discord';
  let candidate = base;
  let counter = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  used.add(candidate);
  return candidate;
}

function getActiveDataRoot() {
  const explicit = process.env.PRISM_API_DATA_ROOT?.trim();
  if (explicit) {
    return explicit;
  }

  return bundledRoot;
}

function ensureCollector(config, key, defaults) {
  const collectors = Array.isArray(config.collectors) ? [...config.collectors] : [];
  const index = collectors.findIndex((collector) => collector?.key === key);
  const nextCollector = {
    type: 'builtin',
    window_minutes: 60,
    ...defaults,
    ...(index >= 0 ? collectors[index] : {}),
    key,
  };

  if (index >= 0) {
    collectors[index] = nextCollector;
  } else {
    collectors.push(nextCollector);
  }

  config.collectors = collectors;
}

function removeCollector(config, key) {
  const collectors = Array.isArray(config.collectors) ? config.collectors : [];
  config.collectors = collectors.filter((collector) => collector?.key !== key);
}

function normalizeExistingThreadIds(config) {
  const ids = config?.discord?.thread_promotion?.thread_ids;
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.map((value) => String(value).trim()).filter(Boolean);
}

async function fetchDiscordCategories(token, guildId) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${token}`,
      Accept: 'application/json',
      'User-Agent': 'prism-agent-space-sync',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Discord API ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Discord API returned an unexpected channel payload');
  }

  return payload
    .filter((channel) => channel && channel.type === 4 && typeof channel.id === 'string')
    .map((channel) => ({
      id: String(channel.id),
      name: String(channel.name || '').trim(),
    }))
    .filter((channel) => channel.name);
}

function buildAutoCategoryMap(categories) {
  const used = new Set();
  const entries = [...categories]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((category) => [category.id, uniqueBucketSlug(category.name, used)]);

  return Object.fromEntries(entries);
}

function categoryIdsMatch(existingMap, categories) {
  const existingIds = new Set(Object.keys(existingMap || {}));
  const currentIds = new Set(categories.map((category) => category.id));

  if (existingIds.size === 0 || currentIds.size === 0) {
    return false;
  }

  for (const id of existingIds) {
    if (currentIds.has(id)) {
      return true;
    }
  }

  return false;
}

function shouldManageConfig(liveConfig, bundledConfig, categories) {
  if (!liveConfig) {
    return true;
  }

  if (process.env.PRISM_SPACE_CONFIG_REFRESH === '1') {
    return true;
  }

  if (liveConfig?._template?.managed_by === 'prism-agent-space-sync') {
    return true;
  }

  const liveCategoryMap = liveConfig?.discord?.category_to_bucket || {};
  const bundledCategoryMap = bundledConfig?.discord?.category_to_bucket || {};
  const liveLooksBundled = JSON.stringify(liveCategoryMap) === JSON.stringify(bundledCategoryMap);

  if (liveLooksBundled) {
    return true;
  }

  if (!categoryIdsMatch(liveCategoryMap, categories)) {
    return true;
  }

  return false;
}

function cloneJson(payload) {
  return JSON.parse(JSON.stringify(payload));
}

async function main() {
  if (process.env.PRISM_SYNC_SPACE_CONFIG === '0') {
    console.log('[prism-space-sync] skipped (PRISM_SYNC_SPACE_CONFIG=0)');
    return;
  }

  const activeDataRoot = getActiveDataRoot();
  const liveConfigPath = path.join(activeDataRoot, 'config', 'space.json');
  const bundledConfig = readJson(bundledConfigPath);
  const liveConfig = fs.existsSync(liveConfigPath) ? readJson(liveConfigPath) : null;
  const nextConfig = cloneJson(liveConfig || bundledConfig);

  fs.mkdirSync(path.dirname(liveConfigPath), { recursive: true });

  const discordToken = process.env.DISCORD_BOT_TOKEN?.trim() || '';
  const guildId = process.env.DISCORD_GUILD_ID?.trim() || '';
  ensureCollector(nextConfig, 'discord_latest', {
    enabled: false,
    initial_backfill_hours: 72,
  });
  removeCollector(nextConfig, 'latest_meetings');

  nextConfig.discord = {
    category_to_bucket: {},
    bucket_defaults: { mode: 'high_signal' },
    bucket_overrides: {},
    thread_promotion: {
      enabled: true,
      thread_ids: normalizeExistingThreadIds(nextConfig),
      min_messages: 6,
      min_participants: 2,
    },
    ...(nextConfig.discord || {}),
  };

  nextConfig.space_slug = String(nextConfig.space_slug || process.env.PRISM_API_SPACE || 'raidguild');
  nextConfig.timezone = String(nextConfig.timezone || 'UTC');

  let categories = [];
  let autoManaged = false;
  let syncMessage = 'preserved existing live config';

  if (discordToken && guildId) {
    categories = await fetchDiscordCategories(discordToken, guildId);
    autoManaged = shouldManageConfig(liveConfig, bundledConfig, categories);
    if (autoManaged) {
      nextConfig.discord.category_to_bucket = buildAutoCategoryMap(categories);
      const discordCollector = nextConfig.collectors.find((collector) => collector.key === 'discord_latest');
      if (discordCollector) {
        discordCollector.enabled = true;
      }
      syncMessage = `synced ${categories.length} Discord categories`;
    }
  }

  nextConfig._template = {
    managed_by: autoManaged ? 'prism-agent-space-sync' : (liveConfig?._template?.managed_by || 'manual'),
    sync_mode: autoManaged ? 'auto' : 'preserve',
    synced_at: new Date().toISOString(),
    source_guild_id: guildId || null,
    discord_category_count: categories.length,
  };

  const currentSerialized = liveConfig ? `${JSON.stringify(liveConfig, null, 2)}\n` : null;
  const nextSerialized = `${JSON.stringify(nextConfig, null, 2)}\n`;

  if (currentSerialized === nextSerialized) {
    console.log(`[prism-space-sync] no changes (${syncMessage})`);
    return;
  }

  writeJsonAtomic(liveConfigPath, nextConfig);
  console.log(`[prism-space-sync] wrote ${liveConfigPath} (${syncMessage})`);
}

main().catch((error) => {
  console.error(`[prism-space-sync] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});