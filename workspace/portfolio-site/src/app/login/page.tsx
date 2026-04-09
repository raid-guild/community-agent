import { LoginForm } from '@/components/login-form';
import { RegisterForm } from '@/components/register-form';
import { SiteShell } from '@/components/site-shell';
import { getAuthMe } from '@/lib/api';

export default async function LoginPage() {
  const user = await getAuthMe();

  return (
    <SiteShell
      pageKey="login"
      eyebrow="Opaque cookie session"
      isAuthenticated={Boolean(user)}
      showAdminNav={Boolean(user?.roleSlugs.includes('admin'))}
      userLabel={user ? user.displayName || user.handle || user.email : null}
    >
      <section className="auth-grid">
        <section className="login-panel stack">
          <div>
            <p className="section-title__eyebrow">Seeded admin</p>
            <h2 className="section-title__title">Use the backend that already exists</h2>
            <p className="section-title__copy">
              The seeded admin email is <span className="mono">admin@local.agent</span>. The password comes from <span className="mono">ADMIN_PASSWORD</span> and falls back to <span className="mono">changeme</span> in local development.
            </p>
          </div>
          <LoginForm />
        </section>

        <section className="login-panel stack">
          <div>
            <p className="section-title__eyebrow">Member registration</p>
            <h2 className="section-title__title">Create your account</h2>
            <p className="section-title__copy">
              New members can register here. If the email matches imported profile data, the backend will attach the account to the existing profile record.
            </p>
          </div>
          <RegisterForm />
        </section>
      </section>

      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">First pass</p>
            <h2 className="section-title__title">What happens after registration</h2>
          </div>
        </div>
        <div className="step-list">
          <div className="step-list__item">
            <strong>1. Land in account setup</strong>
            <p>New registrations are immediately signed in and routed to the account workspace.</p>
          </div>
          <div className="step-list__item">
            <strong>2. Fill profile essentials</strong>
            <p>Display name, bio, location, avatar, and visibility are the first editable profile fields.</p>
          </div>
          <div className="step-list__item">
            <strong>3. Move into the directory</strong>
            <p>After the first pass, members can browse the member directory and leaderboard from the authenticated shell.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}