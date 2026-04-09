import Link from 'next/link';
import { PublicMemberCard } from '@/components/public-member-card';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe, getCommunityRolesCatalog, getMembers, getSkillsCatalog } from '@/lib/api';

interface MembersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = searchParams ? await searchParams : {};
  const query = firstParam(params.q)?.trim() || '';
  const skill = firstParam(params.skill)?.trim() || '';
  const communityRole = firstParam(params.communityRole)?.trim() || '';

  const [user, members, skills, communityRoles] = await Promise.all([
    getAuthMe(),
    getMembers({ q: query || undefined, skill: skill || undefined, communityRole: communityRole || undefined }),
    getSkillsCatalog(),
    getCommunityRolesCatalog(),
  ]);

  return (
    <SiteShell
      pageKey="members"
      eyebrow="Public member data"
      isAuthenticated={Boolean(user)}
      showAdminNav={Boolean(user?.roleSlugs.includes('admin'))}
      userLabel={user ? user.displayName || user.handle || user.email : null}
    >
      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Filters</p>
            <h2 className="section-title__title">Find people by skill, role, or name</h2>
          </div>
        </div>
        <form className="form-grid" method="get">
          <label className="field">
            <span className="field__label">Search</span>
            <input className="field__input" name="q" defaultValue={query} placeholder="Handle or display name" />
          </label>
          <label className="field">
            <span className="field__label">Skill</span>
            <select className="field__input" name="skill" defaultValue={skill}>
              <option value="">All skills</option>
              {skills.map((entry) => (
                <option key={entry.id} value={entry.slug}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Community role</span>
            <select className="field__input" name="communityRole" defaultValue={communityRole}>
              <option value="">All roles</option>
              {communityRoles.map((entry) => (
                <option key={entry.id} value={entry.slug}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar toolbar--align-end">
            <button className="button" type="submit">Apply filters</button>
          </div>
        </form>
      </section>

      {members.length ? (
      <section className="member-grid">
        {members.map((member) => (
          <PublicMemberCard key={member.id} member={member} />
        ))}
      </section>
      ) : (
        <section className="empty-state">
          <h2 className="card__title">No members matched</h2>
          <p className="card__copy">Try a broader query or clear one of the taxonomy filters.</p>
        </section>
      )}
    </SiteShell>
  );
}