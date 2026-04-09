import Link from 'next/link';
import { AdminHomeModulesManager } from '@/components/admin-home-modules-manager';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { SiteShell } from '@/components/site-shell';
import { getAdminHomeModules, getAuthMe } from '@/lib/api';

export default async function AdminHomeModulesPage() {
  const [user, modules] = await Promise.all([
    getAuthMe(),
    getAdminHomeModules(),
  ]);

  if (!user || !user.roleSlugs.includes('admin')) {
    return (
      <SiteShell
        pageKey="adminHomeModulesSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account before configuring the member home modules.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageKey="adminHomeModules"
      eyebrow="Protected content"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <AdminSectionNav />
      <AdminHomeModulesManager initialModules={modules} />
    </SiteShell>
  );
}