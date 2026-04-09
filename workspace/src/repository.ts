import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { getDb } from './db.js';
import { getDefaultHomeModules, getHomeModuleDefinition, normalizeHomeModuleConfig } from './home-modules.js';
import { normalizeSiteContent, writeSiteContent } from './site-content.js';

interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_banned: number;
  is_seeded: number;
}

interface ProfileRow {
  id: string;
  user_id: string | null;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  email: string | null;
  links_json: string;
  skills_json: string;
  cohorts_json: string;
  location: string | null;
  contact_json: string;
  visibility: string;
  visibility_json: string;
  seed_source: string | null;
  seed_external_id: string | null;
  seeded_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  points_total?: number;
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  last_seen_at: string;
  created_at: string;
  revoked_at: string | null;
}

interface CatalogSkillRow {
  id: number;
  slug: string;
  label: string;
  category: string | null;
  description: string | null;
  is_default: number;
  is_active: number;
}

interface CatalogCommunityRoleRow {
  id: number;
  slug: string;
  label: string;
  category: string | null;
  skill_type: string | null;
  description: string | null;
  is_default: number;
  is_active: number;
}

interface BadgeRow {
  slug: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
}

type VisibilityScope = 'public' | 'members' | 'private';

type ProfileFieldVisibilityKey =
  | 'bio'
  | 'location'
  | 'links'
  | 'skills'
  | 'communityRoles'
  | 'badges'
  | 'cohorts';

export type ProfileVisibilitySettings = Record<ProfileFieldVisibilityKey, VisibilityScope>;

interface BadgeCatalogRow extends BadgeRow {
  id: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminBadgeCatalogRow extends BadgeCatalogRow {
  awardCount: number;
}

interface SessionUserRow extends UserRow {
  handle: string | null;
  display_name: string | null;
}

export interface SessionUser {
  id: string;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  roleSlugs: string[];
}

export interface ProfileRecord {
  id: string;
  userId: string | null;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  email: string | null;
  links: unknown[];
  skills: string[];
  communityRoles: string[];
  badges: BadgeRow[];
  cohorts: string[];
  location: string | null;
  contact: Record<string, unknown>;
  visibility: string;
  visibilitySettings: Partial<ProfileVisibilitySettings>;
  seededAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pointsTotal: number;
}

export interface RegisterInput {
  email: string;
  passwordHash: string;
  handle: string;
  displayName: string;
}

export interface UpdateProfileInput {
  handle?: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  walletAddress?: string | null;
  location?: string | null;
  links?: unknown[];
  contact?: Record<string, unknown>;
  skillSlugs?: unknown[];
  communityRoleSlugs?: unknown[];
  visibility?: string;
  visibilitySettings?: Record<string, unknown>;
}

export interface MemberQuery {
  q?: string;
  skill?: string;
  communityRole?: string;
  limit?: number;
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  isBanned: boolean;
  isSeeded: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  claimedAt: string | null;
  pointsTotal: number;
  roleSlugs: string[];
}

export interface AdminChangeRequestRecord {
  id: string;
  requestType: string;
  title: string;
  state: string;
  priority: string;
  payload: Record<string, unknown>;
  requestedByUserId: string | null;
  requestedByDisplayName: string | null;
  assignedToUserId: string | null;
  assignedToDisplayName: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface CreateAdminChangeRequestInput {
  requestType: string;
  title: string;
  priority?: string;
  payload?: Record<string, unknown>;
  requestedByUserId?: string | null;
  assignedToUserId?: string | null;
}

export interface UpdateAdminChangeRequestInput {
  state?: string;
  priority?: string;
  resolutionNote?: string | null;
  assignedToUserId?: string | null;
}

export interface AdminChangeRequestApplyResult {
  kind: 'points_adjustment' | 'badge_create' | 'badge_award' | 'badge_request' | 'site_content_update';
  affectedUserIds: string[];
  skippedUserIds: string[];
  pointsEntriesCreated?: number;
  badgeSlug?: string;
  badgeLabel?: string;
  badgeCreated?: boolean;
  badgeAwardsCreated?: number;
  siteContentUpdated?: boolean;
}

export interface AdminPointsAuditEntry {
  id: string;
  userId: string;
  memberHandle: string | null;
  memberDisplayName: string | null;
  delta: number;
  sourceType: string;
  sourceId: string | null;
  sourceTitle: string | null;
  reason: string;
  meta: Record<string, unknown>;
  actorUserId: string | null;
  actorDisplayName: string | null;
  createdAt: string;
}

interface HomeModuleRow {
  id: string;
  type: string;
  config_json: string;
  enabled: number;
  display_order: number;
  visibility_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeModuleRecord {
  id: string;
  type: string;
  label: string;
  description: string;
  config: Record<string, unknown>;
  enabled: boolean;
  displayOrder: number;
  visibilityRole: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHomeModuleInput {
  id: string;
  enabled?: boolean;
  displayOrder?: number;
  visibilityRole?: string | null;
  config?: Record<string, unknown>;
}

function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function ensureHomeModulesSeeded() {
  const db = getDb();
  const now = new Date().toISOString();
  const insertModule = db.prepare(
    `INSERT INTO home_modules (id, type, config_json, enabled, display_order, visibility_role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  );

  for (const moduleDefinition of getDefaultHomeModules()) {
    insertModule.run(
      moduleDefinition.id,
      moduleDefinition.type,
      JSON.stringify(moduleDefinition.defaultConfig),
      moduleDefinition.defaultEnabled ? 1 : 0,
      moduleDefinition.defaultDisplayOrder,
      moduleDefinition.defaultVisibilityRole,
      now,
      now,
    );
  }
}

function mapHomeModuleRow(row: HomeModuleRow): HomeModuleRecord {
  const definition = getHomeModuleDefinition(row.id, row.type);

  return {
    id: row.id,
    type: row.type,
    label: definition?.label || row.type,
    description: definition?.description || 'Configurable home module.',
    config: normalizeHomeModuleConfig(row.type, parseJsonValue<Record<string, unknown>>(row.config_json, {})),
    enabled: row.enabled === 1,
    displayOrder: row.display_order,
    visibilityRole: row.visibility_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_PROFILE_FIELD_VISIBILITY: ProfileVisibilitySettings = {
  bio: 'public',
  location: 'public',
  links: 'public',
  skills: 'public',
  communityRoles: 'public',
  badges: 'public',
  cohorts: 'public',
};

function normalizeVisibilityScope(value: unknown, fallback: VisibilityScope): VisibilityScope {
  return value === 'public' || value === 'members' || value === 'private' ? value : fallback;
}

function normalizeProfileVisibilitySettings(
  value: Record<string, unknown> | null | undefined,
): ProfileVisibilitySettings {
  return {
    bio: normalizeVisibilityScope(value?.bio, DEFAULT_PROFILE_FIELD_VISIBILITY.bio),
    location: normalizeVisibilityScope(value?.location, DEFAULT_PROFILE_FIELD_VISIBILITY.location),
    links: normalizeVisibilityScope(value?.links, DEFAULT_PROFILE_FIELD_VISIBILITY.links),
    skills: normalizeVisibilityScope(value?.skills, DEFAULT_PROFILE_FIELD_VISIBILITY.skills),
    communityRoles: normalizeVisibilityScope(
      value?.communityRoles,
      DEFAULT_PROFILE_FIELD_VISIBILITY.communityRoles,
    ),
    badges: normalizeVisibilityScope(value?.badges, DEFAULT_PROFILE_FIELD_VISIBILITY.badges),
    cohorts: normalizeVisibilityScope(value?.cohorts, DEFAULT_PROFILE_FIELD_VISIBILITY.cohorts),
  };
}

function canViewerAccessField(scope: VisibilityScope, requesterUserId?: string | null) {
  if (scope === 'public') {
    return true;
  }

  if (scope === 'members') {
    return Boolean(requesterUserId);
  }

  return false;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeHandle(handle: string) {
  return handle.trim();
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values: unknown) {
  if (!Array.isArray(values)) return [] as string[];

  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    seen.add(trimmed);
  }

  return [...seen];
}

function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleizeSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pointsTotalForUser(userId: string | null) {
  if (!userId) return 0;

  const row = getDb()
    .prepare('SELECT COALESCE(SUM(delta), 0) AS total FROM points_ledger WHERE user_id = ?')
    .get(userId) as { total: number } | undefined;

  return row?.total ?? 0;
}

function parseChangeRequestRow(
  row: {
    id: string;
    request_type: string;
    title: string;
    state: string;
    priority: string;
    payload_json: string;
    requested_by_user_id: string | null;
    requested_by_display_name: string | null;
    assigned_to_user_id: string | null;
    assigned_to_display_name: string | null;
    resolution_note: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  },
) {
  return {
    id: row.id,
    requestType: row.request_type,
    title: row.title,
    state: row.state,
    priority: row.priority,
    payload: parseJsonValue<Record<string, unknown>>(row.payload_json, {}),
    requestedByUserId: row.requested_by_user_id,
    requestedByDisplayName: row.requested_by_display_name,
    assignedToUserId: row.assigned_to_user_id,
    assignedToDisplayName: row.assigned_to_display_name,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  } satisfies AdminChangeRequestRecord;
}

function listSkillLabelsForUser(userId: string | null) {
  if (!userId) return [] as string[];

  const rows = getDb()
    .prepare(
      `SELECT s.label
       FROM user_skills us
       INNER JOIN skills_catalog s ON s.id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY s.label ASC`,
    )
    .all(userId) as Array<{ label: string }>;

  return rows.map((row) => row.label);
}

function listCommunityRoleLabelsForUser(userId: string | null) {
  if (!userId) return [] as string[];

  const rows = getDb()
    .prepare(
      `SELECT c.label
       FROM user_community_roles ucr
       INNER JOIN community_roles_catalog c ON c.id = ucr.community_role_id
       WHERE ucr.user_id = ?
       ORDER BY c.label ASC`,
    )
    .all(userId) as Array<{ label: string }>;

  return rows.map((row) => row.label);
}

function syncUserSkillSlugs(userId: string, values: unknown[]) {
  const slugs = uniqueStrings(values).map(slugifyValue).filter(Boolean);
  const db = getDb();
  const now = new Date().toISOString();

  const rows = slugs.length
    ? db
      .prepare(
        `SELECT id
         FROM skills_catalog
         WHERE is_active = 1 AND slug IN (${slugs.map(() => '?').join(', ')})`,
      )
      .all(...slugs) as Array<{ id: number }>
    : [];

  db.prepare('DELETE FROM user_skills WHERE user_id = ?').run(userId);

  const insert = db.prepare(
    `INSERT INTO user_skills (user_id, skill_id, proficiency, created_at)
     VALUES (?, ?, NULL, ?)`,
  );

  for (const row of rows) {
    insert.run(userId, row.id, now);
  }
}

function syncUserCommunityRoleSlugs(userId: string, values: unknown[]) {
  const slugs = uniqueStrings(values).map(slugifyValue).filter(Boolean);
  const db = getDb();
  const now = new Date().toISOString();

  const rows = slugs.length
    ? db
      .prepare(
        `SELECT id
         FROM community_roles_catalog
         WHERE is_active = 1 AND slug IN (${slugs.map(() => '?').join(', ')})`,
      )
      .all(...slugs) as Array<{ id: number }>
    : [];

  db.prepare('DELETE FROM user_community_roles WHERE user_id = ?').run(userId);

  const insert = db.prepare(
    `INSERT INTO user_community_roles (user_id, community_role_id, created_at)
     VALUES (?, ?, ?)`,
  );

  for (const row of rows) {
    insert.run(userId, row.id, now);
  }
}

function listBadgesForUser(userId: string | null) {
  if (!userId) return [] as BadgeRow[];

  return getDb()
    .prepare(
      `SELECT b.slug, b.label, b.description, b.image_url AS imageUrl
       FROM user_badges ub
       INNER JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = ?
       ORDER BY ub.awarded_at DESC`,
    )
    .all(userId) as BadgeRow[];
}

function getBadgeBySlug(slug: string) {
  return getDb()
    .prepare(
      `SELECT
         id,
         slug,
         label,
         description,
         image_url AS imageUrl,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM badges
       WHERE slug = ?`,
    )
    .get(slug) as BadgeCatalogRow | undefined;
}

export function getAdminBadgeBySlug(slug: string) {
  return getDb()
    .prepare(
      `SELECT
         b.id,
         b.slug,
         b.label,
         b.description,
         b.image_url AS imageUrl,
         b.created_at AS createdAt,
         b.updated_at AS updatedAt,
         COUNT(ub.id) AS awardCount
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id
       WHERE b.slug = ?
       GROUP BY b.id, b.slug, b.label, b.description, b.image_url, b.created_at, b.updated_at`,
    )
    .get(slug) as AdminBadgeCatalogRow | undefined;
}

export function listBadgesCatalog() {
  return getDb()
    .prepare(
      `SELECT
         id,
         slug,
         label,
         description,
         image_url AS imageUrl,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM badges
       ORDER BY label ASC`,
    )
    .all() as BadgeCatalogRow[];
}

export function listAdminBadges() {
  return getDb()
    .prepare(
      `SELECT
         b.id,
         b.slug,
         b.label,
         b.description,
         b.image_url AS imageUrl,
         b.created_at AS createdAt,
         b.updated_at AS updatedAt,
         COUNT(ub.id) AS awardCount
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id
       GROUP BY b.id, b.slug, b.label, b.description, b.image_url, b.created_at, b.updated_at
       ORDER BY b.label ASC`,
    )
    .all() as AdminBadgeCatalogRow[];
}

function listExistingUserIds(userIds: string[]) {
  if (!userIds.length) return [] as string[];

  const placeholders = userIds.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(`SELECT id FROM users WHERE id IN (${placeholders})`)
    .all(...userIds) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

function listExistingBadgeAwards(badgeId: number, userIds: string[]) {
  if (!userIds.length) return [] as string[];

  const placeholders = userIds.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(`SELECT user_id FROM user_badges WHERE badge_id = ? AND user_id IN (${placeholders})`)
    .all(badgeId, ...userIds) as Array<{ user_id: string }>;

  return rows.map((row) => row.user_id);
}

function ensureBadgeRecord(input: { slug: string; label: string; description?: string | null; imageUrl?: string | null }) {
  const existing = getBadgeBySlug(input.slug);
  if (existing) {
    const nextDescription = input.description ?? existing.description;
    const nextImageUrl = input.imageUrl ?? existing.imageUrl;

    if (input.label && (input.label !== existing.label || nextDescription !== existing.description || nextImageUrl !== existing.imageUrl)) {
      getDb()
        .prepare('UPDATE badges SET label = ?, description = ?, image_url = ?, updated_at = ? WHERE id = ?')
        .run(input.label, nextDescription, nextImageUrl, new Date().toISOString(), existing.id);
      return { ...getBadgeBySlug(input.slug)!, created: false };
    }

    return { ...existing, created: false };
  }

  const now = new Date().toISOString();
  const result = getDb()
    .prepare('INSERT INTO badges (slug, label, description, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.slug, input.label, input.description ?? null, input.imageUrl ?? null, now, now);

  return {
    id: Number(result.lastInsertRowid),
    slug: input.slug,
    label: input.label,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    createdAt: now,
    updatedAt: now,
    created: true,
  };
}

export function upsertAdminBadge(input: { slug: string; label: string; description?: string | null; imageUrl?: string | null }) {
  const badge = ensureBadgeRecord(input);
  return getAdminBadgeBySlug(badge.slug);
}

export function updateAdminBadge(
  slug: string,
  input: { label?: string; description?: string | null; imageUrl?: string | null },
) {
  const existing = getBadgeBySlug(slug);
  if (!existing) {
    return null;
  }

  const nextLabel = normalizeText(input.label) || existing.label;
  const nextDescription = input.description === undefined ? existing.description : input.description;
  const nextImageUrl = input.imageUrl === undefined ? existing.imageUrl : input.imageUrl;

  getDb()
    .prepare('UPDATE badges SET label = ?, description = ?, image_url = ?, updated_at = ? WHERE slug = ?')
    .run(nextLabel, nextDescription, nextImageUrl, new Date().toISOString(), slug);

  return getAdminBadgeBySlug(slug);
}

function mapProfileRow(row: ProfileRow): ProfileRecord {
  const fallbackSkills = parseJsonValue<string[]>(row.skills_json, []);
  const visibilitySettings = normalizeProfileVisibilitySettings(
    parseJsonValue<Record<string, unknown>>(row.visibility_json, {}),
  );

  return {
    id: row.id,
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    walletAddress: row.wallet_address,
    email: row.email,
    links: parseJsonValue<unknown[]>(row.links_json, []),
    skills: row.user_id ? listSkillLabelsForUser(row.user_id) : fallbackSkills,
    communityRoles: row.user_id ? listCommunityRoleLabelsForUser(row.user_id) : [],
    badges: row.user_id ? listBadgesForUser(row.user_id) : [],
    cohorts: parseJsonValue<string[]>(row.cohorts_json, []),
    location: row.location,
    contact: parseJsonValue<Record<string, unknown>>(row.contact_json, {}),
    visibility: row.visibility,
    visibilitySettings,
    seededAt: row.seeded_at,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pointsTotal: typeof row.points_total === 'number' ? row.points_total : pointsTotalForUser(row.user_id),
  };
}

function sanitizePublicProfile(profile: ProfileRecord, requesterUserId?: string | null) {
  const visibilitySettings = normalizeProfileVisibilitySettings(profile.visibilitySettings);

  return {
    ...profile,
    bio: canViewerAccessField(visibilitySettings.bio, requesterUserId) ? profile.bio : null,
    location: canViewerAccessField(visibilitySettings.location, requesterUserId) ? profile.location : null,
    links: canViewerAccessField(visibilitySettings.links, requesterUserId) ? profile.links : [],
    skills: canViewerAccessField(visibilitySettings.skills, requesterUserId) ? profile.skills : [],
    communityRoles: canViewerAccessField(visibilitySettings.communityRoles, requesterUserId)
      ? profile.communityRoles
      : [],
    badges: canViewerAccessField(visibilitySettings.badges, requesterUserId) ? profile.badges : [],
    cohorts: canViewerAccessField(visibilitySettings.cohorts, requesterUserId) ? profile.cohorts : [],
    userId: null,
    email: null,
    contact: {},
    walletAddress: null,
    visibilitySettings: {},
    seededAt: null,
    claimedAt: null,
  } satisfies ProfileRecord;
}

function getProfileRowByUserId(userId: string) {
  return getDb()
    .prepare(
      `SELECT p.*, COALESCE(points.total_points, 0) AS points_total
       FROM profiles p
       LEFT JOIN (
         SELECT user_id, SUM(delta) AS total_points
         FROM points_ledger
         GROUP BY user_id
       ) points ON points.user_id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as ProfileRow | undefined;
}

function getProfileRowByHandle(handle: string) {
  return getDb()
    .prepare(
      `SELECT p.*, COALESCE(points.total_points, 0) AS points_total
       FROM profiles p
       LEFT JOIN (
         SELECT user_id, SUM(delta) AS total_points
         FROM points_ledger
         GROUP BY user_id
       ) points ON points.user_id = p.user_id
       WHERE LOWER(p.handle) = LOWER(?)`,
    )
    .get(handle) as ProfileRow | undefined;
}

export function listSkillsCatalog() {
  return getDb()
    .prepare(
      `SELECT id, slug, label, category, description, is_default, is_active
       FROM skills_catalog
       WHERE is_active = 1
       ORDER BY label ASC`,
    )
    .all() as CatalogSkillRow[];
}

export function listCommunityRolesCatalog() {
  return getDb()
    .prepare(
      `SELECT id, slug, label, category, skill_type, description, is_default, is_active
       FROM community_roles_catalog
       WHERE is_active = 1
       ORDER BY label ASC`,
    )
    .all() as CatalogCommunityRoleRow[];
}

export function getUserByEmail(email: string) {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizeEmail(email)) as UserRow | undefined;
}

export function getUserById(userId: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
}

export function getSessionUserByTokenHash(tokenHash: string) {
  const row = getDb()
    .prepare(
      `SELECT u.*, p.handle, p.display_name
       FROM user_sessions s
       INNER JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    )
    .get(tokenHash, new Date().toISOString()) as SessionUserRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    displayName: row.display_name,
    roleSlugs: listRoleSlugsForUser(row.id),
  } satisfies SessionUser;
}

export function touchSession(tokenHash: string) {
  getDb()
    .prepare('UPDATE user_sessions SET last_seen_at = ? WHERE token_hash = ?')
    .run(new Date().toISOString(), tokenHash);
}

export function createSession(session: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  lastSeenAt: string;
  createdAt: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, last_seen_at, created_at)
       VALUES (@id, @userId, @tokenHash, @expiresAt, @lastSeenAt, @createdAt)`,
    )
    .run(session);
}

export function revokeSession(tokenHash: string) {
  getDb()
    .prepare('UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), tokenHash);
}

export function listRoleSlugsForUser(userId: string) {
  const rows = getDb()
    .prepare(
      `SELECT r.slug
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
    )
    .all(userId) as Array<{ slug: string }>;

  return rows.map((row) => row.slug);
}

export function isUserAdmin(userId: string) {
  return listRoleSlugsForUser(userId).includes('admin');
}

export function getPrivateProfileByUserId(userId: string) {
  const row = getProfileRowByUserId(userId);
  return row ? mapProfileRow(row) : null;
}

export function getPublicProfileByHandle(handle: string, requesterUserId?: string | null) {
  const row = getProfileRowByHandle(handle);
  if (!row) return null;

  const profile = mapProfileRow(row);
  const isOwner = requesterUserId && profile.userId === requesterUserId;

  if (profile.visibility === 'private' && !isOwner) {
    return null;
  }

  if (profile.visibility === 'members' && !requesterUserId && !isOwner) {
    return null;
  }

  if (isOwner) {
    return profile;
  }

  return sanitizePublicProfile(profile, requesterUserId);
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
  const current = getProfileRowByUserId(userId);
  if (!current) {
    return null;
  }

  const nextHandle = input.handle ? normalizeHandle(input.handle) : current.handle;
  const existingHandle = getProfileRowByHandle(nextHandle);

  if (existingHandle && existingHandle.user_id !== userId) {
    throw new Error('HANDLE_TAKEN');
  }

  const updatedAt = new Date().toISOString();

  getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE profiles
         SET handle = @handle,
             display_name = @displayName,
             bio = @bio,
             avatar_url = @avatarUrl,
             wallet_address = @walletAddress,
             location = @location,
             links_json = @linksJson,
             contact_json = @contactJson,
             visibility = @visibility,
             visibility_json = @visibilityJson,
             updated_at = @updatedAt
         WHERE user_id = @userId`,
      )
      .run({
        userId,
        handle: nextHandle,
        displayName: input.displayName?.trim() || current.display_name,
        bio: input.bio ?? current.bio,
        avatarUrl: input.avatarUrl ?? current.avatar_url,
        walletAddress: input.walletAddress ?? current.wallet_address,
        location: input.location ?? current.location,
        linksJson: JSON.stringify(input.links ?? parseJsonValue(current.links_json, [])),
        contactJson: JSON.stringify(input.contact ?? parseJsonValue(current.contact_json, {})),
        visibility: input.visibility?.trim() || current.visibility,
        visibilityJson: JSON.stringify(
          normalizeProfileVisibilitySettings(
            input.visibilitySettings ?? parseJsonValue(current.visibility_json, {}),
          ),
        ),
        updatedAt,
      });

    if (input.skillSlugs !== undefined) {
      syncUserSkillSlugs(userId, input.skillSlugs);
    }

    if (input.communityRoleSlugs !== undefined) {
      syncUserCommunityRoleSlugs(userId, input.communityRoleSlugs);
    }
  })();

  return getPrivateProfileByUserId(userId);
}

export function claimCurrentProfile(userId: string) {
  getDb()
    .prepare(
      'UPDATE profiles SET claimed_at = COALESCE(claimed_at, ?), updated_at = ? WHERE user_id = ?',
    )
    .run(new Date().toISOString(), new Date().toISOString(), userId);

  return getPrivateProfileByUserId(userId);
}

export function listMembers(query: MemberQuery, requesterUserId?: string | null) {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const clauses = ["(p.visibility = 'public' OR (@requesterUserId IS NOT NULL AND p.visibility = 'members') OR p.user_id = @requesterUserId)"];
  const params: Record<string, string | number | null> = { limit, requesterUserId: requesterUserId ?? null };

  if (query.q) {
    clauses.push('(LOWER(p.handle) LIKE @search OR LOWER(p.display_name) LIKE @search)');
    params.search = `%${query.q.trim().toLowerCase()}%`;
  }

  if (query.skill) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM user_skills us
      INNER JOIN skills_catalog s ON s.id = us.skill_id
      WHERE us.user_id = p.user_id AND s.slug = @skillSlug
    )`);
    params.skillSlug = query.skill;
  }

  if (query.communityRole) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM user_community_roles ucr
      INNER JOIN community_roles_catalog c ON c.id = ucr.community_role_id
      WHERE ucr.user_id = p.user_id AND c.slug = @communityRoleSlug
    )`);
    params.communityRoleSlug = query.communityRole;
  }

  const rows = getDb()
    .prepare(
      `SELECT p.*, COALESCE(points.total_points, 0) AS points_total
       FROM profiles p
       LEFT JOIN (
         SELECT user_id, SUM(delta) AS total_points
         FROM points_ledger
         GROUP BY user_id
       ) points ON points.user_id = p.user_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY points_total DESC, p.display_name ASC
       LIMIT @limit`,
    )
    .all(params) as ProfileRow[];

  return rows.map((row) => {
    const profile = mapProfileRow(row);

    return sanitizePublicProfile(profile, requesterUserId);
  });
}

export function listLeaderboard(limit = 25, requesterUserId?: string | null) {
  const rows = getDb()
    .prepare(
      `SELECT p.user_id, p.handle, p.display_name, p.avatar_url, COALESCE(SUM(pl.delta), 0) AS total_points
       FROM profiles p
       LEFT JOIN points_ledger pl ON pl.user_id = p.user_id
       WHERE (p.visibility = 'public' OR (@requesterUserId IS NOT NULL AND p.visibility = 'members') OR p.user_id = @requesterUserId)
       GROUP BY p.id
       ORDER BY total_points DESC, p.display_name ASC
       LIMIT @limit`,
    )
    .all({ limit, requesterUserId: requesterUserId ?? null }) as Array<{
      user_id: string | null;
      handle: string;
      display_name: string;
      avatar_url: string | null;
      total_points: number;
    }>;

  return rows.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    badges: row.user_id ? listBadgesForUser(row.user_id) : [],
    totalPoints: row.total_points,
  }));
}

export function getMyPoints(userId: string) {
  const ledger = getDb()
    .prepare(
      `SELECT id, delta, source_type, source_id, reason, meta_json, created_at
       FROM points_ledger
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
    )
    .all(userId) as Array<{
      id: string;
      delta: number;
      source_type: string;
      source_id: string | null;
      reason: string;
      meta_json: string;
      created_at: string;
    }>;

  return {
    totalPoints: pointsTotalForUser(userId),
    ledger: ledger.map((entry) => ({
      id: entry.id,
      delta: entry.delta,
      sourceType: entry.source_type,
      sourceId: entry.source_id,
      reason: entry.reason,
      meta: parseJsonValue<Record<string, unknown>>(entry.meta_json, {}),
      createdAt: entry.created_at,
    })),
  };
}

export function getAdminOverview() {
  ensureHomeModulesSeeded();
  const memberCount = (getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
  const claimedProfileCount = (
    getDb().prepare('SELECT COUNT(*) AS count FROM profiles WHERE claimed_at IS NOT NULL').get() as { count: number }
  ).count;
  const pendingChangeRequestCount = (
    getDb().prepare("SELECT COUNT(*) AS count FROM admin_change_requests WHERE state = 'pending'").get() as { count: number }
  ).count;
  const enabledHomeModules = (
    getDb().prepare('SELECT COUNT(*) AS count FROM home_modules WHERE enabled = 1').get() as { count: number }
  ).count;

  return {
    memberCount,
    claimedProfileCount,
    pendingChangeRequestCount,
    enabledHomeModules,
  };
}

export function listAdminHomeModules() {
  ensureHomeModulesSeeded();

  const rows = getDb()
    .prepare(
      `SELECT id, type, config_json, enabled, display_order, visibility_role, created_at, updated_at
       FROM home_modules
       ORDER BY display_order ASC, created_at ASC, id ASC`,
    )
    .all() as HomeModuleRow[];

  return rows.map(mapHomeModuleRow);
}

export function listHomeModulesForUser(userId: string) {
  const roleSlugs = new Set(listRoleSlugsForUser(userId));

  return listAdminHomeModules().filter((module) => {
    if (!module.enabled) {
      return false;
    }

    if (!module.visibilityRole) {
      return true;
    }

    return roleSlugs.has(module.visibilityRole);
  });
}

export function updateHomeModules(input: UpdateHomeModuleInput[]) {
  ensureHomeModulesSeeded();

  const currentModules = new Map(listAdminHomeModules().map((module) => [module.id, module]));
  const now = new Date().toISOString();
  const updateModule = getDb().prepare(
    `UPDATE home_modules
     SET config_json = ?,
         enabled = ?,
         display_order = ?,
         visibility_role = ?,
         updated_at = ?
     WHERE id = ?`,
  );

  for (const item of input) {
    const current = currentModules.get(item.id);
    if (!current) {
      continue;
    }

    const nextConfig = item.config ? normalizeHomeModuleConfig(current.type, item.config) : current.config;
    const nextEnabled = typeof item.enabled === 'boolean' ? item.enabled : current.enabled;
    const nextDisplayOrder = Number.isInteger(item.displayOrder) ? item.displayOrder : current.displayOrder;
    const nextVisibilityRole = item.visibilityRole === undefined
      ? current.visibilityRole
      : normalizeText(item.visibilityRole) || null;

    updateModule.run(
      JSON.stringify(nextConfig),
      nextEnabled ? 1 : 0,
      nextDisplayOrder,
      nextVisibilityRole,
      now,
      current.id,
    );
  }

  return listAdminHomeModules();
}

export function listAdminPointsAudit(limit = 200) {
  const rows = getDb()
    .prepare(
      `SELECT
         pl.id,
         pl.user_id,
         pl.delta,
         pl.source_type,
         pl.source_id,
         pl.reason,
         pl.meta_json,
         pl.created_at,
         p.handle AS member_handle,
         p.display_name AS member_display_name,
         acr.title AS source_title
       FROM points_ledger pl
       LEFT JOIN profiles p ON p.user_id = pl.user_id
       LEFT JOIN admin_change_requests acr ON acr.id = pl.source_id AND pl.source_type = 'admin_change_request'
       ORDER BY pl.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
      id: string;
      user_id: string;
      delta: number;
      source_type: string;
      source_id: string | null;
      reason: string;
      meta_json: string;
      created_at: string;
      member_handle: string | null;
      member_display_name: string | null;
      source_title: string | null;
    }>;

  const actorLabelCache = new Map<string, string | null>();

  return rows.map((row) => {
    const meta = parseJsonValue<Record<string, unknown>>(row.meta_json, {});
    const actorUserId = typeof meta.actorUserId === 'string' ? meta.actorUserId : null;

    let actorDisplayName: string | null = null;
    if (actorUserId) {
      if (actorLabelCache.has(actorUserId)) {
        actorDisplayName = actorLabelCache.get(actorUserId) ?? null;
      } else {
        const actor = getSessionSummary(actorUserId);
        actorDisplayName = actor?.displayName || actor?.handle || actor?.email || null;
        actorLabelCache.set(actorUserId, actorDisplayName);
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      memberHandle: row.member_handle,
      memberDisplayName: row.member_display_name,
      delta: row.delta,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceTitle: row.source_title,
      reason: row.reason,
      meta,
      actorUserId,
      actorDisplayName,
      createdAt: row.created_at,
    } satisfies AdminPointsAuditEntry;
  });
}

export function listAdminUsers(limit = 100) {
  const rows = getDb()
    .prepare(
      `SELECT
         u.id,
         u.email,
         u.is_banned,
         u.is_seeded,
         u.last_seen_at,
         u.created_at,
         p.handle,
         p.display_name,
         p.claimed_at,
         COALESCE(points.total_points, 0) AS total_points
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN (
         SELECT user_id, SUM(delta) AS total_points
         FROM points_ledger
         GROUP BY user_id
       ) points ON points.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
      id: string;
      email: string | null;
      is_banned: number;
      is_seeded: number;
      last_seen_at: string | null;
      created_at: string;
      handle: string | null;
      display_name: string | null;
      claimed_at: string | null;
      total_points: number;
    }>;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    handle: row.handle,
    displayName: row.display_name,
    isBanned: Boolean(row.is_banned),
    isSeeded: Boolean(row.is_seeded),
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    pointsTotal: row.total_points,
    roleSlugs: listRoleSlugsForUser(row.id),
  } satisfies AdminUserSummary));
}

export function listAdminChangeRequests(state?: string) {
  const params: Array<string> = [];
  let sql = `SELECT
      acr.id,
      acr.request_type,
      acr.title,
      acr.state,
      acr.priority,
      acr.payload_json,
      acr.requested_by_user_id,
      requester.display_name AS requested_by_display_name,
      acr.assigned_to_user_id,
      assignee.display_name AS assigned_to_display_name,
      acr.resolution_note,
      acr.created_at,
      acr.updated_at,
      acr.resolved_at
    FROM admin_change_requests acr
    LEFT JOIN profiles requester ON requester.user_id = acr.requested_by_user_id
    LEFT JOIN profiles assignee ON assignee.user_id = acr.assigned_to_user_id`;

  if (state) {
    sql += ' WHERE acr.state = ?';
    params.push(state);
  }

  sql += ' ORDER BY CASE acr.state WHEN \'pending\' THEN 0 WHEN \'opened\' THEN 1 ELSE 2 END, acr.created_at DESC';

  const rows = getDb().prepare(sql).all(...params) as Array<{
    id: string;
    request_type: string;
    title: string;
    state: string;
    priority: string;
    payload_json: string;
    requested_by_user_id: string | null;
    requested_by_display_name: string | null;
    assigned_to_user_id: string | null;
    assigned_to_display_name: string | null;
    resolution_note: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>;

  return rows.map(parseChangeRequestRow);
}

export function getAdminChangeRequest(changeRequestId: string) {
  const row = getDb()
    .prepare(
      `SELECT
         acr.id,
         acr.request_type,
         acr.title,
         acr.state,
         acr.priority,
         acr.payload_json,
         acr.requested_by_user_id,
         requester.display_name AS requested_by_display_name,
         acr.assigned_to_user_id,
         assignee.display_name AS assigned_to_display_name,
         acr.resolution_note,
         acr.created_at,
         acr.updated_at,
         acr.resolved_at
       FROM admin_change_requests acr
       LEFT JOIN profiles requester ON requester.user_id = acr.requested_by_user_id
       LEFT JOIN profiles assignee ON assignee.user_id = acr.assigned_to_user_id
       WHERE acr.id = ?`,
    )
    .get(changeRequestId) as
    | {
        id: string;
        request_type: string;
        title: string;
        state: string;
        priority: string;
        payload_json: string;
        requested_by_user_id: string | null;
        requested_by_display_name: string | null;
        assigned_to_user_id: string | null;
        assigned_to_display_name: string | null;
        resolution_note: string | null;
        created_at: string;
        updated_at: string;
        resolved_at: string | null;
      }
    | undefined;

  return row ? parseChangeRequestRow(row) : null;
}

export function createAdminChangeRequest(input: CreateAdminChangeRequestInput) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDb()
    .prepare(
      `INSERT INTO admin_change_requests (
         id, request_type, title, state, priority, payload_json,
         requested_by_user_id, assigned_to_user_id, created_at, updated_at
       ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.requestType,
      input.title,
      input.priority || 'normal',
      JSON.stringify(input.payload ?? {}),
      input.requestedByUserId ?? null,
      input.assignedToUserId ?? null,
      now,
      now,
    );

  return getAdminChangeRequest(id);
}

export function updateAdminChangeRequest(changeRequestId: string, input: UpdateAdminChangeRequestInput) {
  const current = getAdminChangeRequest(changeRequestId);
  if (!current) {
    return null;
  }

  const nextState = input.state ?? current.state;
  const nextPriority = input.priority ?? current.priority;
  const nextResolutionNote = input.resolutionNote ?? current.resolutionNote;
  const nextAssignedToUserId = input.assignedToUserId ?? current.assignedToUserId;
  const updatedAt = new Date().toISOString();
  const resolvedAt = nextState === 'closed' ? current.resolvedAt ?? updatedAt : null;

  getDb()
    .prepare(
      `UPDATE admin_change_requests
       SET state = ?,
           priority = ?,
           assigned_to_user_id = ?,
           resolution_note = ?,
           updated_at = ?,
           resolved_at = ?
       WHERE id = ?`,
    )
    .run(nextState, nextPriority, nextAssignedToUserId, nextResolutionNote, updatedAt, resolvedAt, changeRequestId);

  return getAdminChangeRequest(changeRequestId);
}

export function applyAdminChangeRequest(changeRequestId: string, actorUserId: string, resolutionNote?: string) {
  const current = getAdminChangeRequest(changeRequestId);
  if (!current) {
    return null;
  }

  if (current.state === 'closed') {
    throw new Error('ALREADY_APPLIED');
  }

  const transaction = getDb().transaction(() => {
    const now = new Date().toISOString();
    let applyResult: AdminChangeRequestApplyResult;

    if (current.requestType === 'points_adjustment') {
      const requestedUserIds = uniqueStrings(current.payload.userIds);
      const validUserIds = listExistingUserIds(requestedUserIds);
      const skippedUserIds = requestedUserIds.filter((userId) => !validUserIds.includes(userId));
      const delta = Number(current.payload.delta);
      const reason = normalizeText(current.payload.reason);

      if (!requestedUserIds.length) {
        throw new Error('NO_TARGET_USERS');
      }

      if (!validUserIds.length) {
        throw new Error('NO_VALID_TARGET_USERS');
      }

      if (!Number.isInteger(delta) || delta === 0) {
        throw new Error('INVALID_POINTS_DELTA');
      }

      if (!reason) {
        throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
      }

      const insertLedger = getDb().prepare(
        `INSERT INTO points_ledger (id, user_id, delta, source_type, source_id, reason, meta_json, created_at)
         VALUES (?, ?, ?, 'admin_change_request', ?, ?, ?, ?)`,
      );

      for (const userId of validUserIds) {
        insertLedger.run(
          randomUUID(),
          userId,
          delta,
          changeRequestId,
          reason,
          JSON.stringify({ requestType: current.requestType, actorUserId }),
          now,
        );
      }

      applyResult = {
        kind: 'points_adjustment',
        affectedUserIds: validUserIds,
        skippedUserIds,
        pointsEntriesCreated: validUserIds.length,
      };
    } else if (current.requestType === 'badge_create') {
      const payloadBadge = current.payload.badge && typeof current.payload.badge === 'object' && !Array.isArray(current.payload.badge)
        ? current.payload.badge as Record<string, unknown>
        : null;
      const badgeSlugInput = normalizeText(current.payload.badgeSlug) || normalizeText(payloadBadge?.slug);
      const badgeLabelInput = normalizeText(current.payload.badgeLabel) || normalizeText(payloadBadge?.label);
      const badgeDescription = normalizeText(current.payload.badgeDescription) || normalizeText(payloadBadge?.description) || null;
      const badgeImageUrl = normalizeText(current.payload.badgeImageUrl) || normalizeText(payloadBadge?.imageUrl) || normalizeText(payloadBadge?.image_url) || null;
      const badgeSlug = slugifyValue(badgeSlugInput || badgeLabelInput);
      const badgeLabel = badgeLabelInput || titleizeSlug(badgeSlug);

      if (!badgeSlug || !badgeLabel) {
        throw new Error('BADGE_DETAILS_REQUIRED');
      }

      const badge = ensureBadgeRecord({
        slug: badgeSlug,
        label: badgeLabel,
        description: badgeDescription,
        imageUrl: badgeImageUrl,
      });

      applyResult = {
        kind: 'badge_create',
        affectedUserIds: [],
        skippedUserIds: [],
        badgeSlug: badge.slug,
        badgeLabel: badge.label,
        badgeCreated: badge.created,
      };
    } else if (current.requestType === 'badge_award') {
      const badgeSlug = normalizeText(current.payload.badgeSlug);
      const badgeLabel = normalizeText(current.payload.badgeLabel) || titleizeSlug(badgeSlug);
      const reason = normalizeText(current.payload.reason);
      const requestedUserIds = uniqueStrings(current.payload.userIds);
      const validUserIds = listExistingUserIds(requestedUserIds);
      const invalidUserIds = requestedUserIds.filter((userId) => !validUserIds.includes(userId));

      if (!badgeSlug) {
        throw new Error('BADGE_SELECTION_REQUIRED');
      }

      if (!requestedUserIds.length) {
        throw new Error('NO_TARGET_USERS');
      }

      if (!validUserIds.length) {
        throw new Error('NO_VALID_TARGET_USERS');
      }

      if (!reason) {
        throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
      }

      const badge = getBadgeBySlug(badgeSlug);
      if (!badge) {
        throw new Error('BADGE_NOT_FOUND');
      }

      const existingAwards = listExistingBadgeAwards(badge.id, validUserIds);
      const awardableUserIds = validUserIds.filter((userId) => !existingAwards.includes(userId));
      const insertAward = getDb().prepare(
        `INSERT INTO user_badges (id, user_id, badge_id, awarded_by_user_id, awarded_at, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );

      for (const userId of awardableUserIds) {
        insertAward.run(randomUUID(), userId, badge.id, actorUserId, now, reason);
      }

      applyResult = {
        kind: 'badge_award',
        affectedUserIds: awardableUserIds,
        skippedUserIds: [...invalidUserIds, ...existingAwards],
        badgeSlug: badge.slug,
        badgeLabel: badge.label || badgeLabel,
        badgeCreated: false,
        badgeAwardsCreated: awardableUserIds.length,
      };
    } else if (current.requestType === 'badge_request') {
      const payloadBadge = current.payload.badge && typeof current.payload.badge === 'object' && !Array.isArray(current.payload.badge)
        ? current.payload.badge as Record<string, unknown>
        : null;
      const badgeSlugInput = normalizeText(payloadBadge?.slug);
      const badgeLabelInput = normalizeText(payloadBadge?.label);
      const badgeDescription = normalizeText(payloadBadge?.description) || null;
      const badgeImageUrl = normalizeText(payloadBadge?.imageUrl) || normalizeText(payloadBadge?.image_url) || null;
      const badgeSlug = slugifyValue(badgeSlugInput || badgeLabelInput);
      const badgeLabel = badgeLabelInput || titleizeSlug(badgeSlug);
      const reason = normalizeText(current.payload.reason);
      const requestedUserIds = uniqueStrings(current.payload.userIds);
      const validUserIds = listExistingUserIds(requestedUserIds);
      const invalidUserIds = requestedUserIds.filter((userId) => !validUserIds.includes(userId));

      if (!badgeSlug || !badgeLabel) {
        throw new Error('BADGE_DETAILS_REQUIRED');
      }

      if (requestedUserIds.length && !validUserIds.length) {
        throw new Error('NO_VALID_TARGET_USERS');
      }

      if (requestedUserIds.length && !reason) {
        throw new Error('CHANGE_REQUEST_REASON_REQUIRED');
      }

      const badge = ensureBadgeRecord({
        slug: badgeSlug,
        label: badgeLabel,
        description: badgeDescription,
        imageUrl: badgeImageUrl,
      });

      const existingAwards = listExistingBadgeAwards(badge.id, validUserIds);
      const awardableUserIds = validUserIds.filter((userId) => !existingAwards.includes(userId));
      const insertAward = getDb().prepare(
        `INSERT INTO user_badges (id, user_id, badge_id, awarded_by_user_id, awarded_at, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );

      for (const userId of awardableUserIds) {
        insertAward.run(randomUUID(), userId, badge.id, actorUserId, now, reason || `Awarded via ${current.title}`);
      }

      applyResult = {
        kind: 'badge_request',
        affectedUserIds: awardableUserIds,
        skippedUserIds: [...invalidUserIds, ...existingAwards],
        badgeSlug: badge.slug,
        badgeLabel: badge.label,
        badgeCreated: badge.created,
        badgeAwardsCreated: awardableUserIds.length,
      };
    } else if (current.requestType === 'site_content_update') {
      const siteContentValue = current.payload.siteContent;

      if (!siteContentValue || typeof siteContentValue !== 'object' || Array.isArray(siteContentValue)) {
        throw new Error('SITE_CONTENT_REQUIRED');
      }

      writeSiteContent(loadConfig(), normalizeSiteContent(siteContentValue));

      applyResult = {
        kind: 'site_content_update',
        affectedUserIds: [],
        skippedUserIds: [],
        siteContentUpdated: true,
      };
    } else {
      throw new Error('UNSUPPORTED_REQUEST_TYPE');
    }

    getDb()
      .prepare(
        `UPDATE admin_change_requests
         SET state = 'closed',
             assigned_to_user_id = ?,
             resolution_note = ?,
             updated_at = ?,
             resolved_at = ?
         WHERE id = ?`,
      )
      .run(actorUserId, resolutionNote ?? current.resolutionNote ?? 'Applied through admin board', now, now, changeRequestId);

    return applyResult;
  });

  const applyResult = transaction();
  const changeRequest = getAdminChangeRequest(changeRequestId);

  if (!changeRequest) {
    throw new Error('APPLY_RESULT_MISSING');
  }

  return {
    changeRequest,
    applyResult,
  };
}

export function createAuditLog(entry: {
  actorUserId: string | null;
  actionType: string;
  targetType: string;
  targetId: string | null;
  meta?: Record<string, unknown>;
}) {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, actor_user_id, action_type, target_type, target_id, meta_json, created_at)
       VALUES (@id, @actorUserId, @actionType, @targetType, @targetId, @metaJson, @createdAt)`,
    )
    .run({
      id: randomUUID(),
      actorUserId: entry.actorUserId,
      actionType: entry.actionType,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metaJson: JSON.stringify(entry.meta ?? {}),
      createdAt: new Date().toISOString(),
    });
}

export function registerOrClaimUser(input: RegisterInput) {
  const db = getDb();
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const handle = normalizeHandle(input.handle);

  const userByEmail = getUserByEmail(email);
  const profileByHandle = getProfileRowByHandle(handle);

  if (userByEmail?.password_hash) {
    throw new Error('EMAIL_IN_USE');
  }

  if (profileByHandle && profileByHandle.claimed_at && profileByHandle.user_id !== userByEmail?.id) {
    throw new Error('HANDLE_TAKEN');
  }

  const transaction = db.transaction(() => {
    if (userByEmail) {
      db.prepare(
        `UPDATE users
         SET password_hash = ?, updated_at = ?, last_seen_at = ?
         WHERE id = ?`,
      ).run(input.passwordHash, now, now, userByEmail.id);

      const existingProfile = getProfileRowByUserId(userByEmail.id);

      if (existingProfile) {
        const conflictingHandle = getProfileRowByHandle(handle);
        if (!conflictingHandle || conflictingHandle.user_id === userByEmail.id) {
          db.prepare(
            `UPDATE profiles
             SET handle = ?, display_name = ?, email = ?, claimed_at = COALESCE(claimed_at, ?), updated_at = ?
             WHERE user_id = ?`,
          ).run(handle, input.displayName.trim(), email, now, now, userByEmail.id);
        } else {
          db.prepare(
            `UPDATE profiles
             SET display_name = ?, email = ?, claimed_at = COALESCE(claimed_at, ?), updated_at = ?
             WHERE user_id = ?`,
          ).run(input.displayName.trim(), email, now, now, userByEmail.id);
        }
      } else {
        db.prepare(
          `INSERT INTO profiles (
             id, user_id, handle, display_name, email, seed_source, claimed_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(randomUUID(), userByEmail.id, handle, input.displayName.trim(), email, null, now, now, now);
      }

      return userByEmail.id;
    }

    if (profileByHandle && !profileByHandle.claimed_at && profileByHandle.user_id) {
      const seededUser = getUserById(profileByHandle.user_id);

      if (seededUser?.password_hash) {
        throw new Error('HANDLE_TAKEN');
      }

      if (seededUser?.email && seededUser.email !== email) {
        throw new Error('SEED_EMAIL_MISMATCH');
      }

      db.prepare(
        `UPDATE users
         SET email = ?, password_hash = ?, updated_at = ?, last_seen_at = ?
         WHERE id = ?`,
      ).run(email, input.passwordHash, now, now, profileByHandle.user_id);

      db.prepare(
        `UPDATE profiles
         SET display_name = ?, email = ?, claimed_at = COALESCE(claimed_at, ?), updated_at = ?
         WHERE id = ?`,
      ).run(input.displayName.trim(), email, now, now, profileByHandle.id);

      return profileByHandle.user_id;
    }

    if (profileByHandle) {
      throw new Error('HANDLE_TAKEN');
    }

    const userId = randomUUID();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(userId, email, input.passwordHash, now, now, now);

    db.prepare(
      `INSERT INTO profiles (
         id, user_id, handle, display_name, email, claimed_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), userId, handle, input.displayName.trim(), email, now, now, now);

    return userId;
  });

  const userId = transaction();
  return getSessionSummary(userId);
}

export function getSessionSummary(userId: string) {
  const user = getUserById(userId);
  if (!user) return null;

  const profile = getProfileRowByUserId(userId);

  return {
    id: user.id,
    email: user.email,
    handle: profile?.handle ?? null,
    displayName: profile?.display_name ?? null,
    roleSlugs: listRoleSlugsForUser(userId),
  } satisfies SessionUser;
}

export function updateUserLastSeen(userId: string) {
  getDb()
    .prepare('UPDATE users SET last_seen_at = ?, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), new Date().toISOString(), userId);
}