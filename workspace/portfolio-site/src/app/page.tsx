import Link from 'next/link';
import { PublicMemberCard } from '@/components/public-member-card';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getHealth, getIntegrationsMeta, getLeaderboard, getMembers } from '@/lib/api';
import { getClientAssetPath } from '@/lib/client-api';

export default async function Page() {
  const [health, integrations, members, leaderboard, user] = await Promise.all([
    getHealth(),
    getIntegrationsMeta(),
    getMembers(),
    getLeaderboard(),
    getAuthMe(),
  ]);

  const featuredMembers = members.slice(0, 3);
  const topEntries = leaderboard.slice(0, 5);

  return (
    <SiteShell
      pageKey="overview"
      eyebrow={health?.service || 'Template preview'}
      isAuthenticated={Boolean(user)}
      showAdminNav={Boolean(user?.roleSlugs.includes('admin'))}
      userLabel={user ? `${user.displayName || user.handle} signed in` : null}
    >
      <section className="hero">
        <p className="shell__eyebrow">Live scaffold</p>
        <h2 className="hero__title">One database. One member directory. Clear boundaries.</h2>
        <p className="hero__copy">
          SQLite holds application truth, Prism remains the community-memory layer, and the workspace keeps agent continuity explicit instead of magical.
        </p>
        <div className="hero__actions">
          <Link className="button" href="/app">
            Open member home
          </Link>
          <Link className="button--secondary" href="/login">
            Sign in
          </Link>
        </div>
      </section>

      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Applied migrations</p>
          <p className="status-card__value">{health?.appliedMigrations ?? 0}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Visible members</p>
          <p className="status-card__value">{members.length}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Community provider</p>
          <p className="status-card__value">{integrations?.displayName || 'None'}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Prism source</p>
          <p className="status-card__value">{integrations?.prism.enabled ? 'Enabled' : 'Configured later'}</p>
        </article>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="card__eyebrow">API health</p>
          <h3 className="card__title">API online</h3>
          <p className="card__copy">Session model: {health?.authMode || 'Unknown mode'}.</p>
        </article>
        <article className="card">
          <p className="card__eyebrow">Integration boundary</p>
          <h3 className="card__title">Prism stays external</h3>
          <p className="card__copy">
            Community summaries belong in Prism. Profiles, sessions, points, and admin actions stay local in SQLite.
          </p>
        </article>
        <article className="card">
          <p className="card__eyebrow">Template posture</p>
          <h3 className="card__title">Operationally explicit</h3>
          <p className="card__copy">
            Routes, sessions, backups, and agent continuity are all documented instead of being inferred from runtime behavior.
          </p>
        </article>
      </section>

      <section className="stack">
        <div className="section-title">
          <div>
            <p className="section-title__eyebrow">Featured members</p>
            <h2 className="section-title__title">Preview the directory</h2>
            <p className="section-title__copy">A few member cards pulled from the live directory endpoint.</p>
          </div>
          <Link className="button--secondary" href="/app/members">
            View full directory
          </Link>
        </div>
        <div className="member-grid">
          {featuredMembers.map((member) => (
            <PublicMemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="section-title">
          <div>
            <p className="section-title__eyebrow">Points</p>
            <h2 className="section-title__title">Leaderboard snapshot</h2>
          </div>
          <Link className="button--secondary" href="/app/leaderboard">
            Open rankings
          </Link>
        </div>
        <div className="leaderboard-list">
          {topEntries.map((entry, index) => {
            const avatarUrl = getClientAssetPath(entry.avatarUrl);

            return (
              <Link key={entry.handle} href={`/u/${entry.handle}`} className="leaderboard-card card--link">
                <div className="leaderboard-card__header">
                  {avatarUrl ? (
                    <img alt={`${entry.displayName} avatar`} className="leaderboard-card__avatar" src={avatarUrl} />
                  ) : (
                    <div className="leaderboard-card__avatar leaderboard-card__avatar--placeholder">
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="card__eyebrow">Rank {index + 1}</p>
                    <h3 className="leaderboard-card__name">{entry.displayName}</h3>
                    <p className="leaderboard-card__meta">@{entry.handle} · {entry.totalPoints} points</p>
                  </div>
                </div>
                <div className="leaderboard-card__badges">
                  {entry.badges.length
                    ? entry.badges.slice(0, 2).map((badge) => (
                        <span key={badge.slug} className="tag">{badge.label}</span>
                      ))
                    : <span className="tag">No badges yet</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}