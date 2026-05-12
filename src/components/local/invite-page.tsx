'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { joinSharedListByInvite, loadSharedListByInviteToken } from '@/lib/shared-list';

type Status = 'loading' | 'ready' | 'invalid' | 'joining';

export function InvitePage({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [groupName, setGroupName] = useState('');
  const [listId, setListId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadSharedListByInviteToken(token)
      .then((list) => {
        if (cancelled) return;
        setGroupName(list.group_name);
        setListId(list.id);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status === 'invalid') {
      const timer = window.setTimeout(() => router.replace('/'), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [status, router]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || status !== 'ready') return;

    setStatus('joining');
    setError('');

    try {
      await joinSharedListByInvite(token, name);
      router.replace(`/list/${listId}`);
    } catch {
      setError('참여에 실패했어요. 다시 시도해주세요.');
      setStatus('ready');
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-400">초대 링크를 확인하는 중...</p>
      </main>
    );
  }

  if (status === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-400">유효하지 않은 초대 링크예요</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-neutral-500">초대받았어요</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{groupName}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        이 리스트에 함께 참여하려면 이름을 알려주세요.
      </p>
      <form className="mt-8 space-y-3" onSubmit={handleJoin}>
        <input
          autoFocus
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none"
          placeholder="내 이름"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={status === 'joining'}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          className="mt-2 h-12 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white disabled:bg-neutral-300"
          disabled={status === 'joining' || !displayName.trim()}
        >
          {status === 'joining' ? '참여하는 중...' : '참여하기'}
        </button>
      </form>
    </main>
  );
}
