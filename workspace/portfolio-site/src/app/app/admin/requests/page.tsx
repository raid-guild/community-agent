import Link from 'next/link';
import { AdminBoard } from '@/components/admin-board';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { SiteShell } from '@/components/site-shell';
import { getAdminChangeRequests, getAdminUsers, getAuthMe, getBadgesCatalog, getSiteContent } from '@/lib/api';

export default async function AdminRequestsPage() {
  const [user, changeRequests, users, badges, siteContent] = await Promise.all([
    getAuthMe(),
    getAdminChangeRequests(),
    getAdminUsers(),
    getBadgesCatalog(),
    getSiteContent(),
  ]);

  if (!user || !user.roleSlugs.includes('admin')) {
    return (
      <SiteShell
        pageKey="adminRequestsSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account before managing requests.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageKey="adminRequests"
      eyebrow="Protected requests"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <AdminSectionNav />
      <AdminBoard badges={badges} initialRequests={changeRequests} initialSiteContent={siteContent} users={users} />
    </SiteShell>
  );
}