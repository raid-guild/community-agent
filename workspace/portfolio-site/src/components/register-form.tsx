'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { getClientApiPath } from '@/lib/client-api';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const response = await fetch(getClientApiPath('/api/auth/register'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        displayName: formData.get('displayName'),
        handle: formData.get('handle'),
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to register');
      return;
    }

    startTransition(() => {
      router.push('/app/account');
      router.refresh();
    });
  }

  return (
    <form
      className="stack stack--tight"
      action={(formData) => {
        void handleSubmit(formData);
      }}
    >
      <label className="field">
        <span className="field__label">Display name</span>
        <input className="field__input" name="displayName" required placeholder="How the cohort should see you" />
      </label>
      <label className="field">
        <span className="field__label">Handle</span>
        <input className="field__input" name="handle" required placeholder="your-handle" />
      </label>
      <label className="field">
        <span className="field__label">Email</span>
        <input className="field__input" name="email" type="email" required placeholder="you@example.com" />
      </label>
      <label className="field">
        <span className="field__label">Password</span>
        <input className="field__input" name="password" type="password" minLength={8} required placeholder="At least 8 characters" />
      </label>
      <p className="form-note">
        If your email matches a migrated seeded profile, registration will claim that profile instead of creating a duplicate.
      </p>
      {error ? <p className="status status--error">{error}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}