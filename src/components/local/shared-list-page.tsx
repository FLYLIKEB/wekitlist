'use client';

import { Plus } from 'lucide-react';
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
    await addSharedListItem(listId, { title: title.trim() });
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

      <form
        className="mt-7 flex items-center gap-3 rounded-[1.6rem] bg-neutral-50/80 px-4 py-2.5 ring-1 ring-inset ring-neutral-200/80"
        onSubmit={handleAddItem}
      >
        <input
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400"
          placeholder="새 항목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          aria-label="항목 추가"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:scale-[1.03] hover:bg-neutral-800 disabled:bg-neutral-300"
          type="submit"
          disabled={!title.trim()}
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
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
