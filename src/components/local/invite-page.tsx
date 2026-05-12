'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { loadSharedListByInviteToken } from '@/lib/shared-list';

export function InvitePage({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    loadSharedListByInviteToken(token)
      .then((list) => {
        router.replace(`/list/${list.id}`);
      })
      .catch(() => {
        router.replace('/');
      });
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-neutral-400">초대 링크를 확인하는 중...</p>
    </main>
  );
}
