'use client';

import { ChevronDown, Link2, MapPin, Plus, Settings2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  addSharedListItem,
  deleteSharedListItem,
  getCurrentUserId,
  loadListMembers,
  loadSharedList,
  restoreSharedListItem,
  toggleSharedListItem,
  type ListMember,
  type SharedListItem,
} from '@/lib/shared-list';

function formatCreatedAt(createdAt: string, nowTimestamp: number): string {
  const date = new Date(createdAt);
  const diffMs = Math.max(0, nowTimestamp - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

function openKakaoMap(query: string) {
  const q = encodeURIComponent(query);
  const ua = window.navigator.userAgent;
  const isAndroid = /android/i.test(ua);

  if (isAndroid) {
    window.location.href = `intent://search?q=${q}#Intent;scheme=kakaomap;package=net.daum.android.map;end`;
    return;
  }

  window.location.href = `kakaomap://search?q=${q}`;
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
  const [undoItem, setUndoItem] = useState<SharedListItem | null>(null);
  const [completedVisibleCount, setCompletedVisibleCount] = useState(5);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const deleteRequestRef = useRef(new Map<string, Promise<void>>());

  const pendingItems = useMemo(() => items.filter((item) => !item.completed_at), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.completed_at), [items]);

  function showToast(message: string, durationMs = 2200) {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
      setUndoItem(null);
      toastTimerRef.current = null;
    }, durationMs);
  }

  function clearToast() {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage('');
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
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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

    Promise.all([loadListMembers(listId), getCurrentUserId()])
      .then(([nextMembers, uid]) => {
        if (cancelled) return;
        setMembers(nextMembers);
        setCurrentUserId(uid);
      })
      .catch(() => {
        // members header is non-critical
      });

    return () => {
      cancelled = true;
    };
  }, [listId]);

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextLinkUrl = linkUrl.trim();
    const nextTags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!nextTitle) return;

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticItem: SharedListItem = {
      id: optimisticId,
      title: nextTitle,
      link_url: nextLinkUrl || null,
      tags: nextTags.length ? nextTags : null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    setItems((current) => [optimisticItem, ...current]);
    setTitle('');
    setLinkUrl('');
    setTagsText('');
    setDetailOpen(false);
    titleInputRef.current?.focus();

    try {
      const createdItem = await addSharedListItem(listId, {
        title: nextTitle,
        linkUrl: nextLinkUrl,
        tags: nextTags,
      });
      setItems((current) => current.map((item) => (item.id === optimisticId ? createdItem : item)));
    } catch {
      setItems((current) => current.filter((item) => item.id !== optimisticId));
    } finally {
      titleInputRef.current?.focus();
    }
  }

  async function handleToggleComplete(itemId: string, completed: boolean) {
    await toggleSharedListItem(itemId, completed);
    await refresh();
  }

  async function handleDeleteItem(item: SharedListItem) {
    setItems((current) => current.filter((existing) => existing.id !== item.id));
    setUndoItem(item);
    showToast('항목을 삭제했어요', 10000);

    const deleteRequest = deleteSharedListItem(item.id);
    deleteRequestRef.current.set(item.id, deleteRequest);

    try {
      await deleteRequest;
    } catch {
      clearToast();
      setItems((current) => [item, ...current]);
      setUndoItem(null);
    } finally {
      deleteRequestRef.current.delete(item.id);
    }
  }

  async function handleUndoDelete(target: SharedListItem) {
    clearToast();
    const pendingDelete = deleteRequestRef.current.get(target.id);

    if (pendingDelete) {
      try {
        await pendingDelete;
      } catch {
        return;
      }
    }

    setItems((current) => {
      if (current.some((existing) => existing.id === target.id)) {
        return current;
      }
      return [target, ...current];
    });
    setUndoItem(null);

    try {
      await restoreSharedListItem(listId, target);
    } catch {
      setItems((current) => current.filter((existing) => existing.id !== target.id));
      showToast('되돌리기에 실패했어요');
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-10">
      <p className="text-xs text-neutral-400">
        {members.length === 0 ? (
          'Shared list'
        ) : (
          <>
            {members.map((member, index) => {
              const isMe = member.user_id === currentUserId;
              return (
                <span key={member.user_id}>
                  <span className={isMe ? 'font-medium text-neutral-700' : ''}>
                    {member.display_name}
                    {isMe ? ' (나)' : ''}
                  </span>
                  {index < members.length - 1 ? <span className="text-neutral-300"> · </span> : null}
                </span>
              );
            })}
          </>
        )}
      </p>
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
            <div className="motion-scale-in absolute right-0 top-full z-10 mt-2 flex min-w-[10rem] flex-col gap-1 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-neutral-200">
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
        <div className="motion-toast fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-neutral-950 px-5 py-2.5 text-sm text-white shadow-lg">
          <span>{toastMessage}</span>
          {undoItem ? (
            <button
              type="button"
              className="font-medium text-white underline-offset-2 transition hover:underline"
              onClick={() => void handleUndoDelete(undoItem)}
            >
              되돌리기
            </button>
          ) : null}
        </div>
      ) : null}

      <form className="mt-6 border-b border-neutral-200 pb-2" onSubmit={handleAddItem}>
        <div className="flex items-end gap-3">
          <input
            ref={titleInputRef}
            autoFocus
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400"
            placeholder="새 항목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="button"
            aria-label="상세설정"
            className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
            onClick={() => setDetailOpen((open) => !open)}
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
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
          <div className="motion-fade-up mt-2 flex flex-col gap-2">
            <input
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
              placeholder="링크 주소 (https://...)"
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
            <article key={item.id} className="motion-fade-up flex min-h-11 items-start gap-3 py-1.5">
              <button
                aria-label={`${item.title} 완료`}
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-neutral-300 bg-transparent transition hover:border-neutral-500"
                type="button"
                onClick={() => void handleToggleComplete(item.id, true)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <h3 className="text-[15px] font-medium leading-6 text-neutral-950">{item.title}</h3>
                    {item.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {item.link_url ? (
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="링크 열기"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                    >
                      <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${item.title} 카카오맵에서 검색`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-neutral-900 transition hover:brightness-95"
                    onClick={() => openKakaoMap(item.title)}
                  >
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${item.title} 삭제`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-700"
                    onClick={() => void handleDeleteItem(item)}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <p className="shrink-0 pt-0.5 text-xs text-neutral-400">{formatCreatedAt(item.created_at, nowTimestamp)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-neutral-500">완료됨</h2>
        <div>
          {completedItems.slice(0, completedVisibleCount).map((item) => (
            <article key={item.id} className="motion-fade-up flex min-h-10 items-center gap-3 py-1">
              <button
                aria-label={`${item.title} 다시 열기`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-50"
                type="button"
                onClick={() => void handleToggleComplete(item.id, false)}
              >
                <div className="h-2 w-2 rounded-full bg-neutral-400" />
              </button>
              <h3 className="min-w-0 flex-1 text-[15px] leading-6 text-neutral-400 line-through">{item.title}</h3>
              <button
                type="button"
                aria-label={`${item.title} 삭제`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700"
                onClick={() => void handleDeleteItem(item)}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </article>
          ))}
        </div>
        {completedItems.length > completedVisibleCount ? (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs text-neutral-500 transition hover:text-neutral-800"
            onClick={() => setCompletedVisibleCount((count) => count + 5)}
          >
            더보기
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </section>
    </main>
  );
}
