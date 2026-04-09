import Link from 'next/link';
import { AdminSectionNav } from '@/components/admin-section-nav';
import { SiteShell } from '@/components/site-shell';
import { getAdminPointsAudit, getAuthMe } from '@/lib/api';

function formatSignedDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export default async function AdminPointsAuditPage() {
  const [user, auditEntries] = await Promise.all([
    getAuthMe(),
    getAdminPointsAudit(),
  ]);

  if (!user || !user.roleSlugs.includes('admin')) {
    return (
      <SiteShell
        pageKey="adminPointsSignedOut"
        eyebrow="Protected view"
      >
        <section className="empty-state">
          <h2 className="card__title">Admin access required</h2>
          <p className="card__copy">Sign in with the seeded admin account before reviewing points history.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </SiteShell>
    );
  }

  const awardedTotal = auditEntries.filter((entry) => entry.delta > 0).reduce((sum, entry) => sum + entry.delta, 0);
  const deductedTotal = auditEntries.filter((entry) => entry.delta < 0).reduce((sum, entry) => sum + Math.abs(entry.delta), 0);
  const affectedMembers = new Set(auditEntries.map((entry) => entry.userId)).size;

  return (
    <SiteShell
      pageKey="adminPoints"
      eyebrow="Protected ledger"
      isAuthenticated
      showAdminNav
      userLabel={user.displayName || user.handle || user.email}
    >
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Ledger rows</p>
          <p className="status-card__value">{auditEntries.length}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Points awarded</p>
          <p className="status-card__value">{awardedTotal}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Points deducted</p>
          <p className="status-card__value">{deductedTotal}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Members affected</p>
          <p className="status-card__value">{affectedMembers}</p>
        </article>
      </section>

      <AdminSectionNav />

      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Ledger</p>
            <h2 className="section-title__title">Points audit table</h2>
            <p className="section-title__copy">This is the row-level history from <span className="mono">points_ledger</span>, not the member summary table.</p>
          </div>
        </div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Member</th>
                <th>Delta</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="table-subtle">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>
                    <strong>{entry.memberDisplayName || entry.memberHandle || 'Unknown member'}</strong>
                    <div className="table-subtle mono">
                      {entry.memberHandle ? `@${entry.memberHandle}` : entry.userId}
                    </div>
                  </td>
                  <td>
                    <strong className={`points-delta ${entry.delta >= 0 ? 'points-delta--positive' : 'points-delta--negative'}`}>
                      {formatSignedDelta(entry.delta)}
                    </strong>
                  </td>
                  <td>
                    <div>{entry.reason}</div>
                    {entry.sourceId ? <div className="table-subtle mono">{entry.sourceId}</div> : null}
                  </td>
                  <td>
                    <span className="tag">{entry.sourceTitle || entry.sourceType}</span>
                  </td>
                  <td>
                    <div>{entry.actorDisplayName || 'Unknown actor'}</div>
                    {entry.actorUserId ? <div className="table-subtle mono">{entry.actorUserId}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}