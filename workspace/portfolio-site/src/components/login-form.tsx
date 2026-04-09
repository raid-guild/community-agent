'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { getClientApiPath } from '@/lib/client-api';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const response = await fetch(getClientApiPath('/api/auth/login'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to log in');
      return;
    }

    startTransition(() => {
      router.push('/app');
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
        <span className="field__label">Email</span>
        <input className="field__input" name="email" type="email" required placeholder="admin@local.agent" />
      </label>
      <label className="field">
        <span className="field__label">Password</span>
        <input className="field__input" name="password" type="password" required placeholder="••••••••" />
      </label>
      {error ? <p className="status status--error">{error}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}