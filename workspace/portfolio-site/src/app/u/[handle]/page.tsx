import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getPublicProfileByHandle } from '@/lib/api';
import { getClientAssetPath } from '@/lib/client-api';

interface PublicProfilePageProps {
  params: Promise<{ handle: string }>;
}

interface ProfileLink {
  label: string;
  href: string;
}

function sanitizeExternalHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function readProfileLinks(value: unknown[]): ProfileLink[] {
  const links: ProfileLink[] = [];

  for (const item of value) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const href = sanitizeExternalHref(trimmed);
      if (!href) continue;
      links.push({ label: trimmed.replace(/^https?:\/\//, ''), href });
      continue;
    }

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const href = [candidate.url, candidate.href, candidate.link].find((entry) => typeof entry === 'string') as string | undefined;
    if (!href?.trim()) {
      continue;
    }

    const sanitizedHref = sanitizeExternalHref(href.trim());
    if (!sanitizedHref) {
      continue;
    }

    const label = [candidate.label, candidate.title, candidate.name].find((entry) => typeof entry === 'string') as string | undefined;
    links.push({ label: label?.trim() || href.replace(/^https?:\/\//, ''), href: sanitizedHref });
  }

  return links;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params;
  const [user, profile] = await Promise.all([getAuthMe(), getPublicProfileByHandle(handle)]);

  if (!profile) {
    notFound();
  }

  const profileLinks = readProfileLinks(profile.links);
  const avatarUrl = getClientAssetPath(profile.avatarUrl);
  const isOwner = user?.handle === profile.handle;

  return (
    <SiteShell
      pageKey="publicProfile"
      title={profile.displayName}
      eyebrow="Public profile"
      isAuthenticated={Boolean(user)}
      showAdminNav={Boolean(user?.roleSlugs.includes('admin'))}
      userLabel={user ? user.displayName || user.handle || user.email : null}
    >
      <section className="profile-hero">
        <div className="profile-hero__avatar-wrap">
          {avatarUrl ? (
            <img alt={`${profile.displayName} avatar`} className="profile-hero__avatar" src={avatarUrl} />
          ) : (
            <div className="profile-hero__avatar profile-hero__avatar--placeholder">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-hero__content">
          <p className="card__eyebrow">@{profile.handle}</p>
          <h2 className="profile-hero__title">{profile.displayName}</h2>
          <p className="profile-hero__bio">{profile.bio || 'This member has not added a public bio yet.'}</p>
          <div className="profile-hero__meta">
            <span className="pill">{profile.pointsTotal} points</span>
            <span className="pill">{profile.badges.length} badges</span>
            {profile.location ? <span className="pill">{profile.location}</span> : null}
            {isOwner ? <span className="pill">Visibility: {profile.visibility}</span> : null}
          </div>
          <div className="inline-actions">
            <Link className="button--secondary" href="/app/members">
              Back to directory
            </Link>
            {isOwner ? (
              <Link className="button" href="/app">
                Edit your profile
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card-grid">
        <article className="card stack">
          <div>
            <p className="card__eyebrow">Skills</p>
            <h3 className="card__title">Areas of contribution</h3>
          </div>
          <div className="tag-list">
            {profile.skills.length
              ? profile.skills.map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))
              : <span className="tag">No skills listed yet</span>}
          </div>
        </article>

        <article className="card stack">
          <div>
            <p className="card__eyebrow">Community roles</p>
            <h3 className="card__title">Current roles</h3>
          </div>
          <div className="tag-list">
            {profile.communityRoles.length
              ? profile.communityRoles.map((role) => (
                  <span key={role} className="tag">
                    {role}
                  </span>
                ))
              : <span className="tag">No roles listed yet</span>}
          </div>
        </article>
      </section>

      <section className="stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Recognition</p>
            <h2 className="section-title__title">Badges</h2>
            <p className="section-title__copy">Reusable recognition badges awarded through the admin ops flow.</p>
          </div>
        </div>
        <div className="profile-badge-grid">
          {profile.badges.length ? profile.badges.map((badge) => {
            const badgeImageUrl = getClientAssetPath(badge.imageUrl);

            return (
              <article key={badge.slug} className="profile-badge-card">
                {badgeImageUrl ? (
                  <img alt={`${badge.label} badge`} className="profile-badge-card__image" src={badgeImageUrl} />
                ) : (
                  <div className="profile-badge-card__image profile-badge-card__image--placeholder">
                    {badge.label.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="stack stack--tight">
                  <p className="card__eyebrow">{badge.slug}</p>
                  <h3 className="profile-badge-card__title">{badge.label}</h3>
                  <p className="card__copy">{badge.description || 'No badge description yet.'}</p>
                </div>
              </article>
            );
          }) : (
            <div className="empty-state">
              <h3 className="card__title">No badges yet</h3>
              <p className="card__copy">Recognition will show up here once badges have been awarded.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card-grid">
        <article className="card stack">
          <div>
            <p className="card__eyebrow">Links</p>
            <h3 className="card__title">Public references</h3>
          </div>
          {profileLinks.length ? (
            <div className="profile-link-list">
              {profileLinks.map((link) => (
                <a key={`${link.label}-${link.href}`} className="profile-link" href={link.href} rel="noreferrer" target="_blank">
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="card__copy">No public links added yet.</p>
          )}
        </article>
      </section>
    </SiteShell>
  );
}