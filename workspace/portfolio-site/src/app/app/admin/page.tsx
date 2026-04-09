import Link from 'next/link';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { SiteShell } from '@/components/site-shell';
import { getAdminOverview, getAdminUsers, getAuthMe } from '@/lib/api';

export default async function AdminPage() {
  const [user, overview, users] = await Promise.all([
    getAuthMe(),
    getAdminOverview(),
    getAdminUsers(),
  ]);

  if (!user || !overview) {
    return (
      <SiteShell
        pageKey="adminSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account or extend the role system before exposing deeper admin actions here.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageKey="admin"
      eyebrow="Protected metrics"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Members</p>
          <p className="status-card__value">{overview.memberCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Activated imports</p>
          <p className="status-card__value">{overview.claimedProfileCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Pending change requests</p>
          <p className="status-card__value">{overview.pendingChangeRequestCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Enabled home modules</p>
          <p className="status-card__value">{overview.enabledHomeModules}</p>
        </article>
      </section>

      <AdminSectionNav />

      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Users</p>
            <h2 className="section-title__title">Operator-facing member table</h2>
            <p className="section-title__copy">Imported profiles become activated once a real account signs in and is linked to that imported record.</p>
          </div>
        </div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Points</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.displayName || member.handle || member.email || 'Unknown user'}</strong>
                    <div className="table-subtle mono">{member.email || 'No email'}</div>
                  </td>
                  <td>
                    <div className="tag-list">
                      {member.roleSlugs.map((role) => (
                        <span key={role} className="tag">{role}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="tag-list">
                      {member.claimedAt ? <span className="status-chip status-chip--opened">activated</span> : <span className="status-chip status-chip--pending">imported</span>}
                      {member.isBanned ? <span className="status-chip status-chip--closed">banned</span> : null}
                    </div>
                  </td>
                  <td>{member.pointsTotal}</td>
                  <td className="table-subtle">{member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Next steps</p>
            <h2 className="section-title__title">Use the admin tabs</h2>
            <p className="section-title__copy">Move to change requests for points and badge actions, or open the badge catalog for reusable badge maintenance.</p>
          </div>
          <div className="inline-actions">
            <Link className="button--secondary" href="/app/admin/content">
              Open brand and copy
            </Link>
            <Link className="button--secondary" href="/app/admin/requests">
              Open change requests
            </Link>
            <Link className="button--secondary" href="/app/admin/badges">
              Open badge catalog
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}