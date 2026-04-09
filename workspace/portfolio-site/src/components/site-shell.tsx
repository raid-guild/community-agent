import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { defaultSiteContent, getSiteContent, type SiteContentPageKey } from '@/lib/api';

interface SiteShellProps {
  title?: string;
  eyebrow?: string;
  intro?: string;
  pageKey?: SiteContentPageKey;
  userLabel?: string | null;
  isAuthenticated?: boolean;
  showAdminNav?: boolean;
  children: ReactNode;
}

export async function SiteShell({
  title,
  eyebrow,
  intro,
  pageKey,
  userLabel,
  isAuthenticated = false,
  showAdminNav = false,
  children,
}: SiteShellProps) {
  const siteContent = await getSiteContent();
  const shellContent = siteContent?.shell ?? defaultSiteContent.shell;
  const navigationContent = siteContent?.navigation ?? defaultSiteContent.navigation;
  const pageContent = pageKey ? siteContent?.pages?.[pageKey] ?? defaultSiteContent.pages[pageKey] : null;
  const brandLogoUrl = shellContent.logoUrl.trim();
  const baseNavigation = [
    { href: '/', label: navigationContent.overview },
    { href: '/app', label: navigationContent.home },
    { href: '/app/members', label: navigationContent.members },
    { href: '/app/leaderboard', label: navigationContent.leaderboard },
  ];
  const navigation = showAdminNav
    ? [...baseNavigation, { href: '/app/admin', label: navigationContent.admin }]
    : baseNavigation;
  const resolvedTitle = title ?? pageContent?.title ?? '';
  const resolvedIntro = intro ?? pageContent?.intro;
  const resolvedUserLabel = userLabel || shellContent.guestLabel;

  return (
    <div className="shell">
      <div className="shell__backdrop shell__backdrop--top" />
      <div className="shell__backdrop shell__backdrop--bottom" />
      <div className="shell__frame">
        <aside className="shell__sidebar">
          <div className="shell__sidebar-panel">
            <div className="shell__brand">
              {brandLogoUrl ? (
                <div className="shell__brand-logo">
                  <img className="shell__brand-logo-image" src={brandLogoUrl} alt={shellContent.logoAlt} />
                </div>
              ) : null}
              <p className="shell__eyebrow">{shellContent.brandName}</p>
            </div>
            <h1 className="shell__sidebar-title">{shellContent.sidebarTitle}</h1>
            <p className="shell__sidebar-copy">
              {shellContent.sidebarCopy}
            </p>
          </div>
          <nav className="shell__nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="shell__nav-link">
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <LogoutButton className="shell__nav-link shell__nav-link--button" />
            ) : (
              <Link href="/login" className="shell__nav-link">
                {shellContent.signInLabel}
              </Link>
            )}
          </nav>
          <div className="shell__sidebar-panel shell__sidebar-panel--muted">
            <p className="shell__eyebrow">{shellContent.sessionLabel}</p>
            <p className="shell__sidebar-copy">{resolvedUserLabel}</p>
            {eyebrow ? <span className="pill pill--accent">{eyebrow}</span> : null}
          </div>
        </aside>
        <main className="shell__main">
          <header className="shell__header">
            <div>
              <p className="shell__eyebrow">{shellContent.workspaceLabel}</p>
              <h1 className="shell__title">{resolvedTitle}</h1>
              {resolvedIntro ? <p className="shell__intro">{resolvedIntro}</p> : null}
            </div>
            <div className="shell__meta">
              <span className="pill">{resolvedUserLabel}</span>
            </div>
          </header>
          <div className="shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}