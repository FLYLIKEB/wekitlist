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
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadSharedListByInviteToken(token)
      .then((list) => {
        if (cancelled) return;
        setGroupName(list.group_name);
        setListId(list.id);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const code = err instanceof Error ? err.message : String(err);
        setError(code || 'unknown-error');
        setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || status !== 'ready') return;

    setStatus('joining');
    setJoinError('');

    try {
      await joinSharedListByInvite(token, name);
      router.replace(`/list/${listId}?as=${encodeURIComponent(name)}`);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : String(err);
      setJoinError(`참여에 실패했어요 (${code})`);
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
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-neutral-500">초대 링크를 열 수 없어요</p>
        <p className="mt-2 break-all text-xs text-neutral-400">
          token: {token}
        </p>
        <p className="mt-1 break-all text-xs text-red-400">
          reason: {error || 'unknown'}
        </p>
        <button
          type="button"
          className="mt-6 rounded-full bg-neutral-100 px-4 py-2 text-xs text-neutral-700"
          onClick={() => router.replace('/')}
        >
          홈으로
        </button>
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
        {joinError ? <p className="text-sm text-red-500">{joinError}</p> : null}
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
