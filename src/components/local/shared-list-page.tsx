'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addSharedListItem,
  completeSharedListItem,
  loadSharedList,
  type SharedListItem,
} from '@/lib/shared-list';

export function SharedListPage({ listId }: { listId: string }) {
  const [groupName, setGroupName] = useState('');
  const [items, setItems] = useState<SharedListItem[]>([]);
  const [title, setTitle] = useState('');

  const pendingItems = useMemo(() => items.filter((item) => !item.completed_at), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.completed_at), [items]);

  async function refresh() {
    const data = await loadSharedList(listId);
    setGroupName(data.list.group_name);
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;

    loadSharedList(listId).then((data) => {
      if (cancelled) {
        return;
      }

      setGroupName(data.list.group_name);
      setItems(data.items);
    });

    return () => {
      cancelled = true;
    };
  }, [listId]);

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    await addSharedListItem(listId, title.trim());
    setTitle('');
    await refresh();
  }

  async function handleComplete(itemId: string) {
    await completeSharedListItem(itemId);
    await refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-10">
      <p className="text-sm text-neutral-500">Shared list</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{groupName}</h1>

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
                  onClick={() => void handleComplete(item.id)}
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
