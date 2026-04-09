import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getLeaderboard } from '@/lib/api';
import { getClientAssetPath } from '@/lib/client-api';

export default async function LeaderboardPage() {
  const [user, leaderboard] = await Promise.all([getAuthMe(), getLeaderboard()]);

  return (
    <SiteShell
      pageKey="leaderboard"
      eyebrow="Points view"
      isAuthenticated={Boolean(user)}
      showAdminNav={Boolean(user?.roleSlugs.includes('admin'))}
      userLabel={user ? user.displayName || user.handle || user.email : null}
    >
      <section className="leaderboard-list">
        {leaderboard.map((entry, index) => {
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
                  <h2 className="leaderboard-card__name">{entry.displayName}</h2>
                  <p className="leaderboard-card__meta">@{entry.handle} · {entry.totalPoints} points</p>
                </div>
              </div>
              <div className="leaderboard-card__badges">
                {entry.badges.length
                  ? entry.badges.slice(0, 3).map((badge) => (
                      <span key={badge.slug} className="tag">{badge.label}</span>
                    ))
                  : <span className="tag">No badges yet</span>}
              </div>
            </Link>
          );
        })}
      </section>
    </SiteShell>
  );
}