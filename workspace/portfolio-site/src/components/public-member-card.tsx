import Link from 'next/link';
import type { MemberProfile } from '@/lib/api';
import { getClientAssetPath } from '@/lib/client-api';

interface PublicMemberCardProps {
  member: MemberProfile;
  skillLimit?: number;
}

export function PublicMemberCard({ member, skillLimit = 4 }: PublicMemberCardProps) {
  const avatarUrl = getClientAssetPath(member.avatarUrl);
  const visibleSkills = member.skills.slice(0, skillLimit);
  const visibleBadges = member.badges.slice(0, 2);

  return (
    <Link href={`/u/${member.handle}`} className="member-card card--link">
      <div className="member-card__header">
        {avatarUrl ? (
          <img alt={`${member.displayName} avatar`} className="member-card__avatar" src={avatarUrl} />
        ) : (
          <div className="member-card__avatar member-card__avatar--placeholder">
            {member.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="stack stack--tight">
          <p className="card__eyebrow">@{member.handle}</p>
          <h2 className="member-card__name">{member.displayName}</h2>
        </div>
      </div>

      <p className="member-card__bio">{member.bio || 'No public bio yet.'}</p>

      <div className="member-card__meta">
        <span className="pill">{member.pointsTotal} points</span>
        {member.location ? <span className="pill">{member.location}</span> : null}
      </div>

      <div className="tag-list">
        {visibleSkills.length
          ? visibleSkills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))
          : <span className="tag">No skills listed</span>}
      </div>

      <div className="member-card__badge-list">
        {visibleBadges.length
          ? visibleBadges.map((badge) => {
              const badgeImageUrl = getClientAssetPath(badge.imageUrl);

              return (
                <span key={badge.slug} className="member-card__badge-chip">
                  {badgeImageUrl ? (
                    <img alt="" aria-hidden="true" className="member-card__badge-image" src={badgeImageUrl} />
                  ) : (
                    <span className="member-card__badge-image member-card__badge-image--placeholder" aria-hidden="true">
                      {badge.label.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span>{badge.label}</span>
                </span>
              );
            })
          : <span className="tag">No badges yet</span>}
      </div>
    </Link>
  );
}