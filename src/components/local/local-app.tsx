'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  addLocalItem,
  completeLocalItem,
  createLocalList,
  LOCAL_LIST_KEY,
  type LocalSharedList,
} from '@/lib/local-list';

function getInitialList(): LocalSharedList | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(LOCAL_LIST_KEY);
  return saved ? (JSON.parse(saved) as LocalSharedList) : null;
}

export function LocalApp() {
  const [list, setList] = useState<LocalSharedList | null>(getInitialList);
  const [groupName, setGroupName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');

  const pendingItems = useMemo(() => list?.items.filter((item) => !item.completedAt) ?? [], [list]);
  const completedItems = useMemo(() => list?.items.filter((item) => item.completedAt) ?? [], [list]);

  function persist(next: LocalSharedList) {
    setList(next);
    window.localStorage.setItem(LOCAL_LIST_KEY, JSON.stringify(next));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim() || !displayName.trim()) return;
    persist(createLocalList(groupName.trim(), displayName.trim()));
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!list || !title.trim()) return;
    persist(addLocalItem(list, title.trim()));
    setTitle('');
  }

  function handleComplete(itemId: string) {
    if (!list) return;
    persist(completeLocalItem(list, itemId));
  }

  if (!list) {
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
          <button className="mt-2 h-12 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white" type="submit">
            공유 리스트 만들기
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-10">
      <p className="text-sm text-neutral-500">{list.displayName}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{list.groupName}</h1>

      <form className="mt-8 space-y-3 rounded-[2rem] border border-neutral-200 p-4" onSubmit={handleAddItem}>
        <input
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none"
          placeholder="하고 싶은 일을 적어보세요"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button className="h-12 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white" type="submit">
          항목 추가
        </button>
      </form>

      <section className="mt-8">
        <h2 className="mb-3 text-sm text-neutral-500">해야 할 항목</h2>
        <div className="space-y-3">
          {pendingItems.map((item) => (
            <article key={item.id} className="rounded-3xl border border-neutral-200 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-medium text-neutral-950">{item.title}</h3>
                <button
                  className="h-8 rounded-full border border-neutral-200 px-3 text-xs text-neutral-700"
                  type="button"
                  onClick={() => handleComplete(item.id)}
                >
                  완료
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm text-neutral-500">완료됨</h2>
        <div className="space-y-3">
          {completedItems.map((item) => (
            <article key={item.id} className="rounded-3xl border border-neutral-200 px-4 py-4">
              <h3 className="text-base font-medium text-neutral-950">{item.title}</h3>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
