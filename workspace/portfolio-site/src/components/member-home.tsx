'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccountEditor } from '@/components/account-editor';
import { getClientAssetPath } from '@/lib/client-api';
import type { HomeModuleRecord } from '@/lib/home-modules';
import type {
  CommunityRoleCatalogEntry,
  IntegrationMeta,
  LeaderboardEntry,
  MemberProfile,
  SkillCatalogEntry,
} from '@/lib/api';

interface MemberHomeProps {
  profile: MemberProfile;
  points: {
    totalPoints: number;
    ledger: Array<{
      id: string;
      delta: number;
      sourceType: string;
      sourceId: string | null;
      reason: string;
      meta: Record<string, unknown>;
      createdAt: string;
    }>;
  };
  integrations: IntegrationMeta | null;
  skillsCatalog: SkillCatalogEntry[];
  communityRolesCatalog: CommunityRoleCatalogEntry[];
  homeModules: HomeModuleRecord[];
  leaderboard: LeaderboardEntry[];
}

function readModuleString(config: Record<string, unknown>, key: string, fallback: string) {
  const value = config[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readModulePositiveInteger(config: Record<string, unknown>, key: string, fallback: number, max: number) {
  const value = config[key];
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  if (normalized < 1) {
    return fallback;
  }

  return Math.min(normalized, max);
}

export function MemberHome({
  profile,
  points,
  integrations,
  skillsCatalog,
  communityRolesCatalog,
  homeModules,
  leaderboard,
}: MemberHomeProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const leaderboardRank = leaderboard.findIndex((entry) => entry.handle === profile.handle);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentEntries = points.ledger.filter((entry) => new Date(entry.createdAt).getTime() >= sevenDaysAgo);
  const recentPointsDelta = recentEntries.reduce((sum, entry) => sum + entry.delta, 0);
  const profileSummaryBadges = profile.badges.length ? profile.badges : [];

  const renderedModules = homeModules.map((module) => {
    if (module.type === 'profile-checklist') {
      const minSkills = readModulePositiveInteger(module.config, 'minSkills', 2, 10);
      const tasks = [
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
          title: `Reach ${minSkills} listed skills`,
          description: 'Skill coverage is the fastest way to make member search useful.',
          done: profile.skills.length >= minSkills,
        },
      ];
      const completedCount = tasks.filter((task) => task.done).length;

      return (
        <section key={module.id} className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Home module</p>
              <h2 className="section-title__title">{readModuleString(module.config, 'title', module.label)}</h2>
              <p className="section-title__copy">{readModuleString(module.config, 'description', module.description)}</p>
            </div>
            <span className={`status-chip status-chip--${completedCount === tasks.length ? 'opened' : 'pending'}`}>
              {completedCount}/{tasks.length} done
            </span>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
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
          <div className="inline-actions">
            <button className="button" onClick={() => setIsDrawerOpen(true)} type="button">
              Edit essentials
            </button>
            <Link className="button--secondary" href={`/u/${profile.handle}`}>
              View public page
            </Link>
          </div>
        </section>
      );
    }

    if (module.type === 'top-contributors') {
      const limit = readModulePositiveInteger(module.config, 'limit', 5, 12);
      const visibleEntries = leaderboard.slice(0, limit);

      return (
        <section key={module.id} className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Home module</p>
              <h2 className="section-title__title">{readModuleString(module.config, 'title', module.label)}</h2>
              <p className="section-title__copy">{readModuleString(module.config, 'description', module.description)}</p>
            </div>
            {leaderboardRank >= 0 ? <span className="pill">Your rank: #{leaderboardRank + 1}</span> : null}
          </div>
          {visibleEntries.length ? (
            <div className="leaderboard-list">
              {visibleEntries.map((entry) => {
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
                        <h3 className="leaderboard-card__name">{entry.displayName}</h3>
                        <p className="leaderboard-card__meta">@{entry.handle} · {entry.totalPoints} points</p>
                      </div>
                    </div>
                    <div className="leaderboard-card__badges">
                      {entry.badges.length
                        ? entry.badges.slice(0, 3).map((badge) => (
                            <span key={badge.slug} className="tag">
                              {badge.label}
                            </span>
                          ))
                        : <span className="tag">No badges yet</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted">The leaderboard is empty right now.</p>
          )}
        </section>
      );
    }

    if (module.type === 'daily-brief') {
      const prismEnabled = Boolean(integrations?.prism.enabled);

      return (
        <section key={module.id} className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Home module</p>
              <h2 className="section-title__title">{readModuleString(module.config, 'title', module.label)}</h2>
              <p className="section-title__copy">{readModuleString(module.config, 'description', module.description)}</p>
            </div>
            <span className={`status-chip status-chip--${prismEnabled ? 'opened' : 'pending'}`}>
              {prismEnabled ? 'Prism enabled' : 'Prism disabled'}
            </span>
          </div>
          <div className="step-list">
            <div className="step-list__item">
              <strong>Leaderboard status</strong>
              <p>
                {leaderboardRank >= 0
                  ? `You currently sit at #${leaderboardRank + 1} with ${points.totalPoints} total points.`
                  : `You have ${points.totalPoints} total points and will show up once your profile is eligible for the public leaderboard.`}
              </p>
            </div>
            <div className="step-list__item">
              <strong>Recent activity</strong>
              <p>
                {recentEntries.length
                  ? `${recentEntries.length} ledger event${recentEntries.length === 1 ? '' : 's'} in the last 7 days for ${recentPointsDelta > 0 ? `+${recentPointsDelta}` : recentPointsDelta} points.`
                  : 'No points activity was recorded in the last 7 days.'}
              </p>
            </div>
            <div className="step-list__item">
              <strong>Prism memory</strong>
              <p>
                {prismEnabled
                  ? `Prism is available at ${integrations?.prism.baseUrl || 'the configured endpoint'} and can enrich future brief summaries.`
                  : 'Prism is not enabled for this workspace yet, so this brief is currently derived from local app activity only.'}
              </p>
            </div>
          </div>
        </section>
      );
    }

    return null;
  }).filter(Boolean);

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  return (
    <>
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Profile handle</p>
          <p className="status-card__value">@{profile.handle}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Total points</p>
          <p className="status-card__value">{points.totalPoints}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Visibility</p>
          <p className="status-card__value">{profile.visibility}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Community link mode</p>
          <p className="status-card__value">{integrations?.displayName || 'Disabled'}</p>
        </article>
      </section>

      <section className="mini-grid">
        <button className="card card--link card--button" type="button" onClick={() => setIsDrawerOpen(true)}>
          <p className="card__eyebrow">Profile</p>
          <h2 className="card__title">Edit essentials</h2>
          <p className="card__copy">Open a quick editor for your profile, visibility, avatar, skills, and roles.</p>
        </button>
        <Link className="card card--link" href={`/u/${profile.handle}`}>
          <p className="card__eyebrow">Public profile</p>
          <h2 className="card__title">See your public page</h2>
          <p className="card__copy">Preview what members and guests can see on your public handle route.</p>
        </Link>
        <Link className="card card--link" href="/app/members">
          <p className="card__eyebrow">Members</p>
          <h2 className="card__title">Browse members</h2>
          <p className="card__copy">Search, filter, and explore the live member directory.</p>
        </Link>
      </section>

      {renderedModules.length ? <section className="stack">{renderedModules}</section> : null}

      <section className="card-grid">
        <article className="card">
          <p className="card__eyebrow">Profile</p>
          <h2 className="card__title">{profile.displayName}</h2>
          <p className="card__copy">{profile.bio || 'No bio has been added yet.'}</p>
          <div className="tag-list">
            {profile.skills.length
              ? profile.skills.map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))
              : <span className="tag">No skills yet</span>}
          </div>
        </article>
        <article className="card">
          <p className="card__eyebrow">Badges and roles</p>
          <h2 className="card__title">{profileSummaryBadges.length} badges</h2>
          <div className="tag-list">
            {profileSummaryBadges.length
              ? profileSummaryBadges.map((badge) => (
                  <span key={badge.slug} className="tag">
                    {badge.label}
                  </span>
                ))
              : <span className="tag">No badges yet</span>}
            {profile.communityRoles.map((role) => (
              <span key={role} className="tag">
                {role}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <div className="section-title">
          <div>
            <p className="section-title__eyebrow">Ledger</p>
            <h2 className="section-title__title">Recent points activity</h2>
          </div>
        </div>
        {points.ledger.length ? (
          <div className="ledger-list">
            {points.ledger.slice(0, 10).map((entry) => (
              <div key={entry.id} className="ledger-item">
                <strong className="ledger-item__delta">{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</strong>
                <div>
                  <div>{entry.reason}</div>
                  <div className="mono">{entry.sourceType}</div>
                </div>
                <div className="mono">{new Date(entry.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No points have been awarded yet.</p>
        )}
      </section>

      <div
        aria-hidden={!isDrawerOpen}
        className={`drawer-backdrop${isDrawerOpen ? ' drawer-backdrop--open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside
        aria-hidden={!isDrawerOpen}
        aria-label="Edit profile"
        className={`drawer${isDrawerOpen ? ' drawer--open' : ''}`}
        role="dialog"
      >
        <div className="drawer__header">
          <div>
            <p className="section-title__eyebrow">Profile</p>
            <h2 className="drawer__title">Edit essentials</h2>
            <p className="drawer__copy">Update your profile without leaving the member home view.</p>
          </div>
          <button className="button--secondary button--small" type="button" onClick={() => setIsDrawerOpen(false)}>
            Close
          </button>
        </div>
        <div className="drawer__body">
          <AccountEditor
            communityRolesCatalog={communityRolesCatalog}
            integrations={integrations}
            profile={profile}
            skillsCatalog={skillsCatalog}
          />
        </div>
      </aside>
    </>
  );
}