'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { getClientApiPath } from '@/lib/client-api';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch(getClientApiPath('/api/auth/logout'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    }).catch(() => null);

    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  return (
    <button className={className} type="button" onClick={() => void handleLogout()}>
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}