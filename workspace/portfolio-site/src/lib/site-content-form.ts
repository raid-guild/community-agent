import { defaultSiteContent, type SiteContent } from '@/lib/site-content';

const shellKeys = [
  'brandName',
  'logoUrl',
  'logoAlt',
  'sidebarTitle',
  'sidebarCopy',
  'workspaceLabel',
  'sessionLabel',
  'guestLabel',
  'signInLabel',
] as const;

const navigationKeys = ['overview', 'home', 'members', 'leaderboard', 'admin'] as const;

const pageKeys = Object.keys(defaultSiteContent.pages) as Array<keyof SiteContent['pages']>;

export function stringifySiteContent(content: SiteContent) {
  return JSON.stringify(content, null, 2);
}

export function validateSiteContentJson(value: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false as const, error: 'Invalid JSON. Fix syntax errors before saving.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false as const, error: 'Top-level JSON must be an object.' };
  }

  const candidate = parsed as Record<string, unknown>;
  const shell = candidate.shell;
  const navigation = candidate.navigation;
  const pages = candidate.pages;

  if (!shell || typeof shell !== 'object' || Array.isArray(shell)) {
    return { ok: false as const, error: 'Expected shell to be an object.' };
  }

  for (const key of shellKeys) {
    if (typeof (shell as Record<string, unknown>)[key] !== 'string') {
      return { ok: false as const, error: `shell.${key} must be a string.` };
    }
  }

  if (!navigation || typeof navigation !== 'object' || Array.isArray(navigation)) {
    return { ok: false as const, error: 'Expected navigation to be an object.' };
  }

  for (const key of navigationKeys) {
    if (typeof (navigation as Record<string, unknown>)[key] !== 'string') {
      return { ok: false as const, error: `navigation.${key} must be a string.` };
    }
  }

  if (!pages || typeof pages !== 'object' || Array.isArray(pages)) {
    return { ok: false as const, error: 'Expected pages to be an object.' };
  }

  for (const key of pageKeys) {
    const page = (pages as Record<string, unknown>)[key];
    if (!page || typeof page !== 'object' || Array.isArray(page)) {
      return { ok: false as const, error: `pages.${key} must be an object.` };
    }

    const textBlock = page as Record<string, unknown>;
    if (typeof textBlock.title !== 'string') {
      return { ok: false as const, error: `pages.${key}.title must be a string.` };
    }

    if (typeof textBlock.intro !== 'string') {
      return { ok: false as const, error: `pages.${key}.intro must be a string.` };
    }
  }

  return { ok: true as const, parsed: parsed as SiteContent };
}