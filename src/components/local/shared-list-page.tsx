'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addSharedListItem,
  loadSharedList,
  toggleSharedListItem,
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

  async function handleToggleComplete(itemId: string, completed: boolean) {
    await toggleSharedListItem(itemId, completed);
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
        <h2 className="mb-2 text-sm text-neutral-500">해야 할 항목</h2>
        <div>
          {pendingItems.map((item) => (
            <article key={item.id} className="flex min-h-11 items-center gap-3 py-1.5">
              <button
                aria-label={`${item.title} 완료`}
                className="h-5 w-5 shrink-0 rounded-full border border-neutral-300 bg-transparent transition hover:border-neutral-500"
                type="button"
                onClick={() => void handleToggleComplete(item.id, true)}
              />
              <h3 className="text-[15px] font-medium leading-6 text-neutral-950">{item.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-neutral-500">완료됨</h2>
        <div>
          {completedItems.map((item) => (
            <article key={item.id} className="flex min-h-10 items-center gap-3 py-1">
              <button
                aria-label={`${item.title} 다시 열기`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-50"
                type="button"
                onClick={() => void handleToggleComplete(item.id, false)}
              >
                <div className="h-2 w-2 rounded-full bg-neutral-400" />
              </button>
              <h3 className="text-[15px] leading-6 text-neutral-400 line-through">{item.title}</h3>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
