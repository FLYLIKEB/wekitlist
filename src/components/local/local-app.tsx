'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSharedList } from '@/lib/shared-list';

export function LocalApp() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim() || !displayName.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const list = await createSharedList(groupName.trim(), displayName.trim());
      router.push(`/list/${list.id}`);
    } catch {
      setError('리스트를 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-neutral-500">Wekitlist</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        같이 쓰는 버킷리스트
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600">
        커플이나 친구가 빠르게 함께 기록하고 완료하는 초경량 공유 리스트.
      </p>
      <form className="mt-10 space-y-3" onSubmit={handleCreate}>
        <input
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none"
          placeholder="우리 리스트 이름"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        />
        <input
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none"
          placeholder="내 이름"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button className="mt-2 h-12 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white" type="submit" disabled={submitting}>
          {submitting ? '만드는 중...' : '공유 리스트 만들기'}
        </button>
      </form>
    </main>
  );
}
