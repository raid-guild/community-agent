import { cookies } from 'next/headers';
import type { HomeModuleRecord } from './home-modules';

function normalizeBasePath(value: string | undefined, fallback = '') {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
}

const defaultApiBasePath = '/api';
const apiBasePath = normalizeBasePath(process.env.API_BASE_PATH, defaultApiBasePath) || defaultApiBasePath;
const apiOrigin = normalizeOrigin(process.env.ADMIN_APP_ORIGIN)
  || 'http://127.0.0.1:4433';

function resolveApiPath(pathname: string) {
  if (pathname === defaultApiBasePath || pathname.startsWith(`${defaultApiBasePath}/`)) {
    if (apiBasePath === defaultApiBasePath) {
      return pathname;
    }

    return `${apiBasePath}${pathname.slice(defaultApiBasePath.length)}`;
  }

  if (pathname === apiBasePath || pathname.startsWith(`${apiBasePath}/`)) {
    return pathname;
  }

  return `${apiBasePath}${pathname}`;
}

export type VisibilityScope = 'public' | 'members' | 'private';

export interface ProfileVisibilitySettings {
  bio: VisibilityScope;
  location: VisibilityScope;
  links: VisibilityScope;
  skills: VisibilityScope;
  communityRoles: VisibilityScope;
  badges: VisibilityScope;
  cohorts: VisibilityScope;
}

export interface SessionUser {
  id: string;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  roleSlugs: string[];
}

export interface MemberProfile {
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
  badges: Array<{ slug: string; label: string; description: string | null; imageUrl?: string | null }>;
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

export interface LeaderboardEntry {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  badges: Array<{ slug: string; label: string; description: string | null; imageUrl?: string | null }>;
  totalPoints: number;
}

export interface IntegrationMeta {
  provider: 'discord' | 'slack' | 'telegram' | null;
  linkingEnabled: boolean;
  displayName: string | null;
  prism: {
    enabled: boolean;
    baseUrl: string;
  };
}

export interface SkillCatalogEntry {
  id: number;
  slug: string;
  label: string;
  category: string | null;
  description: string | null;
  is_default: number;
  is_active: number;
}

export interface CommunityRoleCatalogEntry {
  id: number;
  slug: string;
  label: string;
  category: string | null;
  skill_type: string | null;
  description: string | null;
  is_default: number;
  is_active: number;
}

export interface BadgeCatalogEntry {
  id: number;
  slug: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBadgeCatalogEntry extends BadgeCatalogEntry {
  awardCount: number;
}

export interface AdminOverview {
  memberCount: number;
  claimedProfileCount: number;
  pendingChangeRequestCount: number;
  enabledHomeModules: number;
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

export interface AdminChangeRequest {
  id: string;
  requestType: string;
  title: string;
  state: 'pending' | 'opened' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
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

export interface SiteContentTextBlock {
  title: string;
  intro: string;
}

export interface SiteContent {
  shell: {
    brandName: string;
    logoUrl: string;
    logoAlt: string;
    sidebarTitle: string;
    sidebarCopy: string;
    workspaceLabel: string;
    sessionLabel: string;
    guestLabel: string;
    signInLabel: string;
  };
  navigation: {
    overview: string;
    home: string;
    members: string;
    leaderboard: string;
    admin: string;
  };
  pages: {
    overview: SiteContentTextBlock;
    homeSignedOut: SiteContentTextBlock;
    home: SiteContentTextBlock;
    accountSignedOut: SiteContentTextBlock;
    account: SiteContentTextBlock;
    members: SiteContentTextBlock;
    leaderboard: SiteContentTextBlock;
    login: SiteContentTextBlock;
    adminSignedOut: SiteContentTextBlock;
    admin: SiteContentTextBlock;
    adminRequestsSignedOut: SiteContentTextBlock;
    adminRequests: SiteContentTextBlock;
    adminBadgesSignedOut: SiteContentTextBlock;
    adminBadges: SiteContentTextBlock;
    adminPointsSignedOut: SiteContentTextBlock;
    adminPoints: SiteContentTextBlock;
    adminContentSignedOut: SiteContentTextBlock;
    adminContent: SiteContentTextBlock;
    adminHomeModulesSignedOut: SiteContentTextBlock;
    adminHomeModules: SiteContentTextBlock;
    publicProfile: SiteContentTextBlock;
  };
}

export type SiteContentPageKey = keyof SiteContent['pages'];

export const defaultSiteContent: SiteContent = {
  shell: {
    brandName: 'Prism Agent',
    logoUrl: '',
    logoAlt: 'Prism Agent logo',
    sidebarTitle: 'Profiles, points, and operator tooling.',
    sidebarCopy:
      'A member directory and operations surface with explicit boundaries between SQLite app state, Prism community memory, and agent continuity.',
    workspaceLabel: 'Workspace',
    sessionLabel: 'Session',
    guestLabel: 'Guest mode',
    signInLabel: 'Sign in',
  },
  navigation: {
    overview: 'Overview',
    home: 'Home',
    members: 'Members',
    leaderboard: 'Leaderboard',
    admin: 'Admin',
  },
  pages: {
    overview: {
      title: 'Overview',
      intro:
        'The public shell reads from the live API and normalized integration metadata without collapsing the boundary between app state, community memory, and agent continuity.',
    },
    homeSignedOut: {
      title: 'Home',
      intro: 'The member home only renders private data when the backend session cookie is present.',
    },
    home: {
      title: 'Home',
      intro: 'Your member home shows the current profile summary, live points activity, and a quick-edit drawer for essentials.',
    },
    accountSignedOut: {
      title: 'Profile settings',
      intro: 'The editable account view is ready, but it requires a valid session cookie from the backend auth layer.',
    },
    account: {
      title: 'Profile settings',
      intro:
        'This page is the first profile-management surface aligned with the design brief: essentials first, sectioned editing, and clear visibility controls.',
    },
    members: {
      title: 'Member directory',
      intro:
        'This page consumes the normalized `/api/members` endpoint with live search and taxonomy filters, moving the directory closer to the design brief.',
    },
    leaderboard: {
      title: 'Leaderboard',
      intro:
        'This ranking view is already backed by the live points aggregation endpoint and can expand into time-bounded tabs later.',
    },
    login: {
      title: 'Sign in',
      intro:
        'This auth surface now supports both operator sign-in and member registration against the same normalized backend auth routes.',
    },
    adminSignedOut: {
      title: 'Admin',
      intro:
        'The admin page already points at the protected backend endpoint, but it only resolves when the session belongs to an admin user.',
    },
    admin: {
      title: 'Admin',
      intro:
        'Use the admin tabs to move between the member table, change requests, and badge catalog without mixing unrelated workflows on one screen.',
    },
    adminRequestsSignedOut: {
      title: 'Change requests',
      intro: 'The change-request board is an admin-only surface for triage, points actions, and badge awards.',
    },
    adminRequests: {
      title: 'Change requests',
      intro:
        'Triage operational requests, run points or badge actions, and move items through their resolution states without crowding the member table.',
    },
    adminBadgesSignedOut: {
      title: 'Badge catalog',
      intro: 'The badge catalog is an admin-only surface for managing reusable badge definitions and images.',
    },
    adminBadges: {
      title: 'Badge catalog',
      intro:
        'A dedicated admin subpage for reusable badge definitions, image management, and quick catalog hygiene without crowding the ops board.',
    },
    adminPointsSignedOut: {
      title: 'Points audit',
      intro: 'The points audit is an admin-only surface for reviewing individual ledger events.',
    },
    adminPoints: {
      title: 'Points audit',
      intro:
        'Review individual points ledger events with the target member, source, reason, and actor who initiated the change when available.',
    },
    adminContentSignedOut: {
      title: 'Brand and copy',
      intro: 'The brand and copy editor is an admin-only surface for runtime shell and page wording.',
    },
    adminContent: {
      title: 'Brand and copy',
      intro: 'Edit the runtime JSON for brand, navigation, and page title or intro copy with validation before saving.',
    },
    adminHomeModulesSignedOut: {
      title: 'Home modules',
      intro: 'The home-modules manager is an admin-only surface for ordering and configuring the member home stack.',
    },
    adminHomeModules: {
      title: 'Home modules',
      intro: 'Enable, order, and configure the built-in member home modules without rebuilding the site.',
    },
    publicProfile: {
      title: 'Public profile',
      intro:
        'A handle-based public profile sourced from the live `/api/profiles/:handle` endpoint with the current visibility rules applied server-side.',
    },
  },
};

interface ApiEnvelope<T> {
  ok: boolean;
  user?: T;
  profile?: T;
  points?: T;
  modules?: T;
  members?: T;
  leaderboard?: T;
  integrations?: T;
  overview?: T;
  skills?: T;
  communityRoles?: T;
  badges?: T;
  badge?: T;
  users?: T;
  auditEntries?: T;
  changeRequests?: T;
  changeRequest?: T;
  applyResult?: T;
  siteContent?: T;
}

async function apiFetch<T>(pathname: string, init?: RequestInit): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiOrigin}${resolveApiPath(pathname)}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function getHealth() {
  return apiFetch<{
    ok: boolean;
    service: string;
    authMode: string;
    appliedMigrations: number;
    startupMigrations: string[];
  }>('/api/health');
}

export async function getSiteContent() {
  const response = await apiFetch<ApiEnvelope<SiteContent>>('/api/site-content');
  return response?.siteContent ?? defaultSiteContent;
}

export async function getAuthMe() {
  const response = await apiFetch<ApiEnvelope<SessionUser | null>>('/api/auth/me');
  return response?.user ?? null;
}

export async function getIntegrationsMeta() {
  const response = await apiFetch<ApiEnvelope<IntegrationMeta>>('/api/integrations/meta');
  return response?.integrations ?? null;
}

export async function getMembers(params?: {
  q?: string;
  skill?: string;
  communityRole?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.q) {
    searchParams.set('q', params.q);
  }

  if (params?.skill) {
    searchParams.set('skill', params.skill);
  }

  if (params?.communityRole) {
    searchParams.set('communityRole', params.communityRole);
  }

  const suffix = searchParams.size ? `?${searchParams.toString()}` : '';
  const response = await apiFetch<ApiEnvelope<MemberProfile[]>>(`/api/members${suffix}`);
  return response?.members ?? [];
}

export async function getLeaderboard() {
  const response = await apiFetch<ApiEnvelope<LeaderboardEntry[]>>('/api/points/leaderboard');
  return response?.leaderboard ?? [];
}

export async function getHomeModules() {
  const response = await apiFetch<ApiEnvelope<HomeModuleRecord[]>>('/api/home-modules');
  return response?.modules ?? [];
}

export async function getMyProfile() {
  const response = await apiFetch<ApiEnvelope<MemberProfile>>('/api/profile/me');
  return response?.profile ?? null;
}

export async function getPublicProfileByHandle(handle: string) {
  const response = await apiFetch<ApiEnvelope<MemberProfile>>(`/api/profiles/${encodeURIComponent(handle)}`);
  return response?.profile ?? null;
}

export async function getMyPoints() {
  const response = await apiFetch<ApiEnvelope<{
    totalPoints: number;
    ledger: Array<{
      id: string;
      delta: number;
      sourceType: string;
      sourceId: string | null;
      reason: string;
      meta: Record<string, unknown>;
      createdAt: string;
    }>;
  }>>('/api/points/me');

  return response?.points ?? null;
}

export async function getAdminOverview() {
  const response = await apiFetch<ApiEnvelope<AdminOverview>>('/api/admin/overview');
  return response?.overview ?? null;
}

export async function getAdminHomeModules() {
  const response = await apiFetch<ApiEnvelope<HomeModuleRecord[]>>('/api/admin/home-modules');
  return response?.modules ?? [];
}

export async function getAdminUsers() {
  const response = await apiFetch<ApiEnvelope<AdminUserSummary[]>>('/api/admin/users');
  return response?.users ?? [];
}

export async function getAdminChangeRequests(state?: string) {
  const suffix = state ? `?state=${encodeURIComponent(state)}` : '';
  const response = await apiFetch<ApiEnvelope<AdminChangeRequest[]>>(`/api/admin/change-requests${suffix}`);
  return response?.changeRequests ?? [];
}

export async function getAdminPointsAudit(limit?: number) {
  const suffix = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const response = await apiFetch<ApiEnvelope<AdminPointsAuditEntry[]>>(`/api/admin/points/audit${suffix}`);
  return response?.auditEntries ?? [];
}

export async function getSkillsCatalog() {
  const response = await apiFetch<ApiEnvelope<SkillCatalogEntry[]>>('/api/taxonomy/skills');
  return response?.skills ?? [];
}

export async function getCommunityRolesCatalog() {
  const response = await apiFetch<ApiEnvelope<CommunityRoleCatalogEntry[]>>('/api/taxonomy/community-roles');
  return response?.communityRoles ?? [];
}

export async function getBadgesCatalog() {
  const response = await apiFetch<ApiEnvelope<BadgeCatalogEntry[]>>('/api/taxonomy/badges');
  return response?.badges ?? [];
}

export async function getAdminBadges() {
  const response = await apiFetch<ApiEnvelope<AdminBadgeCatalogEntry[]>>('/api/admin/badges');
  return response?.badges ?? [];
}