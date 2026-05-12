'use client';

import { Plus } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addSharedListItem,
  loadSharedList,
  toggleSharedListItem,
  type SharedListItem,
} from '@/lib/shared-list';

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '생성됨 방금 전';
  if (diffMin < 60) return `생성됨 ${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `생성됨 ${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `생성됨 ${diffDay}일 전`;
}

export function SharedListPage({ listId }: { listId: string }) {
  const [groupName, setGroupName] = useState('');
  const [items, setItems] = useState<SharedListItem[]>([]);
  const [title, setTitle] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
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
    await addSharedListItem(listId, {
      title: title.trim(),
      linkUrl: linkUrl.trim(),
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setTitle('');
    setLinkUrl('');
    setTagsText('');
    setDetailOpen(false);
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

      <form className="mt-6 border-b border-neutral-200 pb-2" onSubmit={handleAddItem}>
        <div className="flex items-end gap-3">
          <input
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400"
            placeholder="하고 싶은 일을 적어보세요"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="button"
            className="mb-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200"
            onClick={() => setDetailOpen((open) => !open)}
          >
            상세설정
          </button>
          <button
            aria-label="항목 추가"
            className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:scale-[1.03] hover:bg-neutral-800 disabled:bg-neutral-300"
            type="submit"
            disabled={!title.trim()}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          </button>
        </div>
        {detailOpen ? (
          <div className="mt-2 flex flex-col gap-2">
            <input
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
              placeholder="주소를 붙여넣어도 돼요"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
            <input
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
              placeholder="태그를 쉼표로 나눠 적어보세요"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
            />
          </div>
        ) : null}
      </form>

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-neutral-500">해야 할 항목</h2>
        <div>
          {pendingItems.map((item) => (
            <article key={item.id} className="flex min-h-11 items-start gap-3 py-1.5">
              <button
                aria-label={`${item.title} 완료`}
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-neutral-300 bg-transparent transition hover:border-neutral-500"
                type="button"
                onClick={() => void handleToggleComplete(item.id, true)}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-medium leading-6 text-neutral-950">{item.title}</h3>
                {item.link_url ? (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-blue-500 underline"
                  >
                    {item.link_url}
                  </a>
                ) : null}
                {item.tags?.length ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-0.5 text-xs text-neutral-400">{formatCreatedAt(item.created_at)}</p>
              </div>
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
