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
  const [inviteToken, setInviteToken] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const pendingItems = useMemo(() => items.filter((item) => !item.completed_at), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.completed_at), [items]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2200);
  }

  async function copyCurrentLink() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      // clipboard may be unavailable in some environments
    }
    localStorage.setItem('lastCopiedCurrentPath', new URL(href).pathname);
    showToast('링크를 복사했어요');
    setShareOpen(false);
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // clipboard may be unavailable in some environments
    }
    localStorage.setItem('lastCopiedInvitePath', `/invite/${inviteToken}`);
    showToast('초대 링크를 복사했어요');
    setShareOpen(false);
  }

  async function refresh() {
    const data = await loadSharedList(listId);
    setGroupName(data.list.group_name);
    setInviteToken(data.list.invite_token);
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;

    loadSharedList(listId).then((data) => {
      if (cancelled) {
        return;
      }

      setGroupName(data.list.group_name);
      setInviteToken(data.list.invite_token);
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
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">{groupName}</h1>
        <div className="relative">
          <button
            type="button"
            className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
            onClick={() => setShareOpen((open) => !open)}
          >
            공유
          </button>
          {shareOpen ? (
            <div className="absolute right-0 top-full z-10 mt-2 flex min-w-[10rem] flex-col gap-1 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-neutral-200">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                onClick={() => void copyCurrentLink()}
              >
                현재 링크 복사
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                onClick={() => void copyInviteLink()}
              >
                초대 링크 복사
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {toastMessage ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}

      <form className="mt-6 flex items-end gap-3 border-b border-neutral-200 pb-2" onSubmit={handleAddItem}>
        <input
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400"
          placeholder="새 항목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          aria-label="항목 추가"
          className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:scale-[1.03] hover:bg-neutral-800 disabled:bg-neutral-300"
          type="submit"
          disabled={!title.trim()}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
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
