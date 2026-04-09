import Link from 'next/link';
import { AdminBadgesManager } from '@/components/admin-badges-manager';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { SiteShell } from '@/components/site-shell';
import { getAdminBadges, getAdminOverview, getAuthMe } from '@/lib/api';

export default async function AdminBadgesPage() {
  const [user, overview, badges] = await Promise.all([
    getAuthMe(),
    getAdminOverview(),
    getAdminBadges(),
  ]);

  if (!user || !overview) {
    return (
      <SiteShell
        pageKey="adminBadgesSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account before editing the badge catalog.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  const totalAwards = badges.reduce((sum, badge) => sum + badge.awardCount, 0);

  return (
    <SiteShell
      pageKey="adminBadges"
      eyebrow="Protected badges"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Reusable badges</p>
          <p className="status-card__value">{badges.length}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Total awards</p>
          <p className="status-card__value">{totalAwards}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Activated imports</p>
          <p className="status-card__value">{overview.claimedProfileCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Pending change requests</p>
          <p className="status-card__value">{overview.pendingChangeRequestCount}</p>
        </article>
      </section>

      <AdminSectionNav />
      <AdminBadgesManager initialBadges={badges} />
    </SiteShell>
  );
}