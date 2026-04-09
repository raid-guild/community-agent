import Link from 'next/link';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { AdminSiteContentEditor } from '@/components/admin-site-content-editor';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getSiteContent } from '@/lib/api';

export default async function AdminContentPage() {
  const [user, siteContent] = await Promise.all([
    getAuthMe(),
    getSiteContent(),
  ]);

  if (!user || !user.roleSlugs.includes('admin')) {
    return (
      <SiteShell
        pageKey="adminContentSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account before editing brand and copy.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageKey="adminContent"
      eyebrow="Protected content"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <AdminSectionNav />
      <AdminSiteContentEditor initialContent={siteContent} />
    </SiteShell>
  );
}