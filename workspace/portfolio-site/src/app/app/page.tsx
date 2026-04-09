import Link from 'next/link';
import { MemberHome } from '@/components/member-home';
import { SiteShell } from '@/components/site-shell';
import {
  getAuthMe,
  getCommunityRolesCatalog,
  getHomeModules,
  getIntegrationsMeta,
  getLeaderboard,
  getMyPoints,
  getMyProfile,
  getSkillsCatalog,
} from '@/lib/api';

export default async function AppPage() {
  const [user, profile, points, integrations, skillsCatalog, communityRolesCatalog, homeModules, leaderboard] = await Promise.all([
    getAuthMe(),
    getMyProfile(),
    getMyPoints(),
    getIntegrationsMeta(),
    getSkillsCatalog(),
    getCommunityRolesCatalog(),
    getHomeModules(),
    getLeaderboard(),
  ]);

  if (!user || !profile || !points) {
    return (
      <SiteShell
        pageKey="homeSignedOut"
        eyebrow="Authentication required"
      >
        <section className="empty-state">
          <h2 className="card__title">Sign in to open your home view</h2>
          <p className="card__copy">Use the seeded admin account or a registered member account to view the private profile and points summary.</p>
          <Link className="button" href="/login">
            Go to login
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageKey="home"
      eyebrow="Authenticated view"
      isAuthenticated
      showAdminNav={user.roleSlugs.includes('admin')}
      userLabel={user.displayName || user.handle || user.email}
    >
      <MemberHome
        communityRolesCatalog={communityRolesCatalog}
        homeModules={homeModules}
        integrations={integrations}
        leaderboard={leaderboard}
        points={points}
        profile={profile}
        skillsCatalog={skillsCatalog}
      />
    </SiteShell>
  );
}