import Link from 'next/link';
import { AccountEditor } from '@/components/account-editor';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getCommunityRolesCatalog, getIntegrationsMeta, getMyPoints, getMyProfile, getSkillsCatalog } from '@/lib/api';

export default async function AccountPage() {
  const [user, profile, points, integrations, skillsCatalog, communityRolesCatalog] = await Promise.all([
    getAuthMe(),
    getMyProfile(),
    getMyPoints(),
    getIntegrationsMeta(),
    getSkillsCatalog(),
    getCommunityRolesCatalog(),
  ]);

  if (!user || !profile || !points) {
    return (
      <SiteShell
        pageKey="accountSignedOut"
        eyebrow="Authentication required"
      >
        <section className="empty-state">
          <h2 className="card__title">Sign in to edit your profile</h2>
          <p className="card__copy">Use the seeded admin account or a registered member account to access the account workspace.</p>
          <Link className="button" href="/login">
            Go to login
          </Link>
        </section>
      </SiteShell>
    );
  }

  const onboardingTasks = [
    {
      title: 'Add a short bio',
      description: 'Tell people what you work on and what kinds of work you want to be known for.',
      done: Boolean(profile.bio?.trim()),
    },
    {
      title: 'Set a location',
      description: 'Give members context for timezone, geography, or remote status.',
      done: Boolean(profile.location?.trim()),
    },
    {
      title: 'Add an avatar',
      description: 'A stable avatar makes the directory and admin views much easier to scan.',
      done: Boolean(profile.avatarUrl?.trim()),
    },
    {
      title: 'Reach two listed skills',
      description: 'Skill coverage is the fastest way to make member search useful.',
      done: profile.skills.length >= 2,
    },
  ];

  const needsOnboarding = onboardingTasks.some((task) => !task.done);

  return (
    <SiteShell
      pageKey="account"
      eyebrow="Editable profile"
      isAuthenticated
      showAdminNav={user.roleSlugs.includes('admin')}
      userLabel={user.displayName || user.handle || user.email}
    >
      {needsOnboarding ? (
        <section className="card onboarding-grid">
          <div className="stack">
            <div>
              <p className="section-title__eyebrow">Onboarding</p>
              <h2 className="section-title__title">Finish your first profile pass</h2>
              <p className="section-title__copy">
                You are already signed in. Complete the essentials below, then move into the member directory with a profile other people can actually use.
              </p>
            </div>
            <div className="task-list">
              {onboardingTasks.map((task) => (
                <div key={task.title} className="task-list__item">
                  <div className="task-list__copy">
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                  </div>
                  <span className={`status-chip status-chip--${task.done ? 'opened' : 'pending'}`}>
                    {task.done ? 'done' : 'next'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="stack">
            <article className="card">
              <p className="card__eyebrow">After setup</p>
              <h2 className="card__title">Use the workspace</h2>
              <p className="card__copy">
                Once the basics are filled in, head to members to see how your profile reads in the live directory and then check the leaderboard surface.
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="card-grid">
        <article className="card">
          <p className="card__eyebrow">Points</p>
          <h2 className="card__title">{points.totalPoints}</h2>
          <p className="card__copy">Current point total from the live ledger.</p>
        </article>
        <article className="card">
          <p className="card__eyebrow">Badges</p>
          <h2 className="card__title">{profile.badges.length}</h2>
          <p className="card__copy">Recognition already attached to your profile.</p>
        </article>
      </section>
      <AccountEditor
        communityRolesCatalog={communityRolesCatalog}
        integrations={integrations}
        profile={profile}
        skillsCatalog={skillsCatalog}
      />
    </SiteShell>
  );
}