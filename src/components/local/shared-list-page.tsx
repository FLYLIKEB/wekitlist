'use client';

import { Check, ChevronDown, Link2, MapPin, Plus, RefreshCw, Settings2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { FormEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addSharedListItem,
  deleteSharedListItem,
  loadListMembers,
  loadSharedList,
  registerMember,
  restoreSharedListItem,
  toggleSharedListItem,
  updateSharedListItem,
  type ListMember,
  type SharedListItem,
} from '@/lib/shared-list';
import { openInstallPrompt } from './install-prompt';

type EditingDraft = {
  title: string;
  linkUrl: string;
  tagsText: string;
};

const LONG_PRESS_MS = 450;
const SWIPE_OPEN_OFFSET = 88;
const SWIPE_OPEN_THRESHOLD = 56;
const SWIPE_START_THRESHOLD = 12;

type SwipeState = {
  itemId: string | null;
  offsetX: number;
  pointerId: number | null;
  startX: number;
  startY: number;
  locked: 'pending' | 'horizontal' | 'vertical';
};

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
  const [pendingVisibleCount, setPendingVisibleCount] = useState(20);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EditingDraft>({
    title: '',
    linkUrl: '',
    tagsText: '',
  });
  const [openSwipeItemId, setOpenSwipeItemId] = useState<string | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    itemId: null,
    offsetX: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
    locked: 'pending',
  });
  const searchParams = useSearchParams();
  const myName = searchParams.get('as')?.trim() ?? '';
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const deleteRequestRef = useRef(new Map<string, Promise<void>>());
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const swipeStateRef = useRef<SwipeState>({
    itemId: null,
    offsetX: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
    locked: 'pending',
  });

  const pendingItemsAll = useMemo(() => items.filter((item) => !item.completed_at), [items]);
  const completedItemsAll = useMemo(() => items.filter((item) => item.completed_at), [items]);
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const item of items) {
      item.tags?.forEach((tag) => tagSet.add(tag));
    }
    return Array.from(tagSet);
  }, [items]);
  const effectiveSelectedTag =
    selectedTag && availableTags.includes(selectedTag) ? selectedTag : null;
  const pendingItems = useMemo(() => {
    if (!effectiveSelectedTag) return pendingItemsAll;
    return pendingItemsAll.filter((item) => item.tags?.includes(effectiveSelectedTag));
  }, [pendingItemsAll, effectiveSelectedTag]);
  const completedItems = useMemo(() => {
    if (!effectiveSelectedTag) return completedItemsAll;
    return completedItemsAll.filter((item) => item.tags?.includes(effectiveSelectedTag));
  }, [completedItemsAll, effectiveSelectedTag]);
  const pendingCountByTag = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of pendingItemsAll) {
      item.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    }
    return counts;
  }, [pendingItemsAll]);

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
    const url = new URL(window.location.href);
    url.searchParams.delete('as');
    const href = url.toString();
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      // clipboard may be unavailable in some environments
    }
    localStorage.setItem('lastCopiedCurrentPath', url.pathname);
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

  const refreshAndFocus = useCallback(() => {
    titleInputRef.current?.focus();
    void loadSharedList(listId)
      .then((data) => {
        setGroupName(data.list.group_name);
        setInviteToken(data.list.invite_token);
        setItems(data.items);
      })
      .finally(() => {
        titleInputRef.current?.focus();
      });
  }, [listId]);

  useEffect(() => {
    let startY = 0;
    let tracking = false;
    let triggered = false;

    function currentScrollTop(): number {
      return Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        document.documentElement.scrollTop,
      );
    }

    function isInteractiveTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      return !!el?.closest('input, textarea, [contenteditable="true"], button, a');
    }

    function start(y: number, target: EventTarget | null) {
      if (currentScrollTop() > 4) {
        tracking = false;
        return;
      }
      if (isInteractiveTarget(target)) {
        tracking = false;
        return;
      }
      tracking = true;
      triggered = false;
      startY = y;
    }

    function move(y: number) {
      if (!tracking || triggered) return;
      if (currentScrollTop() > 4) {
        tracking = false;
        return;
      }
      if (y - startY > 70) {
        triggered = true;
        tracking = false;
        refreshAndFocus();
      }
    }

    function end() {
      tracking = false;
    }

    function onTouchStart(event: TouchEvent) {
      const t = event.touches[0];
      if (!t) return;
      start(t.clientY, event.target);
    }
    function onTouchMove(event: TouchEvent) {
      const t = event.touches[0];
      if (!t) return;
      move(t.clientY);
    }
    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse') return;
      start(event.clientY, event.target);
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'mouse') return;
      move(event.clientY);
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerup', end, { passive: true });
    document.addEventListener('pointercancel', end, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
    };
  }, [refreshAndFocus]);

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

    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    const path = `/list/${listId}${myName ? `?as=${encodeURIComponent(myName)}` : ''}`;
    try {
      localStorage.setItem('lastVisitedListPath', path);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [listId, myName]);

  useEffect(() => {
    let cancelled = false;

    async function loadAndRegister() {
      try {
        if (myName) {
          await registerMember(listId, myName);
        }
        const nextMembers = await loadListMembers(listId);
        if (cancelled) return;
        setMembers(nextMembers);
      } catch {
        // members header is non-critical
      }
    }
    void loadAndRegister();

    return () => {
      cancelled = true;
    };
  }, [listId, myName]);

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
    setOpenSwipeItemId(null);
    resetSwipeState();
    await toggleSharedListItem(itemId, completed);
    await refresh();
  }

  async function handleDeleteItem(item: SharedListItem) {
    setOpenSwipeItemId(null);
    resetSwipeState();
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

  function startEditing(item: SharedListItem) {
    setOpenSwipeItemId(null);
    resetSwipeState();
    setEditingItemId(item.id);
    setEditingDraft({
      title: item.title,
      linkUrl: item.link_url ?? '',
      tagsText: item.tags?.join(', ') ?? '',
    });
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditingDraft({ title: '', linkUrl: '', tagsText: '' });
  }

  function parseDraftTags(tagsText: string): string[] {
    return tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function toggleTagInText(currentText: string, tag: string): string {
    const tags = parseDraftTags(currentText);
    const isSelected = tags.includes(tag);
    const nextTags = isSelected ? tags.filter((existing) => existing !== tag) : [...tags, tag];
    return nextTags.join(', ');
  }

  function toggleDraftTag(tag: string) {
    setEditingDraft((current) => ({ ...current, tagsText: toggleTagInText(current.tagsText, tag) }));
  }

  function toggleNewItemTag(tag: string) {
    setTagsText((current) => toggleTagInText(current, tag));
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleLongPressStart(item: SharedListItem) {
    if (editingItemId === item.id) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      longPressTimerRef.current = null;
      startEditing(item);
    }, LONG_PRESS_MS);
  }

  function handleLongPressEnd() {
    clearLongPressTimer();
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editingItemId) {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }
  }, [editingItemId]);

  function resetSwipeState() {
    const nextState = {
      itemId: null,
      offsetX: 0,
      pointerId: null,
      startX: 0,
      startY: 0,
      locked: 'pending' as const,
    };
    swipeStateRef.current = nextState;
    setSwipeState(nextState);
  }

  function beginSwipe(item: SharedListItem, clientX: number, clientY: number, target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (el?.closest('button, a, input, textarea')) {
      return;
    }
    handleLongPressStart(item);
    const nextState: SwipeState = {
      itemId: item.id,
      offsetX: openSwipeItemId === item.id ? -SWIPE_OPEN_OFFSET : 0,
      pointerId: 1,
      startX: clientX,
      startY: clientY,
      locked: 'pending',
    };
    swipeStateRef.current = nextState;
    setSwipeState(nextState);
  }

  function updateSwipe(clientX: number, clientY: number) {
    const current = swipeStateRef.current;
    if (current.itemId === null) {
      return;
    }
    const dx = clientX - current.startX;
    const dy = clientY - current.startY;
    const nextLocked =
      current.locked === 'pending'
        ? Math.abs(dx) > SWIPE_START_THRESHOLD && Math.abs(dx) > Math.abs(dy)
          ? 'horizontal'
          : Math.abs(dy) > SWIPE_START_THRESHOLD
            ? 'vertical'
            : 'pending'
        : current.locked;

    if (nextLocked === 'vertical') {
      clearLongPressTimer();
      const nextState = { ...current, locked: 'vertical' as const };
      swipeStateRef.current = nextState;
      setSwipeState(nextState);
      return;
    }

    if (nextLocked !== 'horizontal') {
      return;
    }

    clearLongPressTimer();
    const baseOffset = openSwipeItemId === current.itemId ? -SWIPE_OPEN_OFFSET : 0;
    const offsetX = Math.max(-SWIPE_OPEN_OFFSET, Math.min(0, baseOffset + dx));
    const nextState = { ...current, locked: 'horizontal' as const, offsetX };
    swipeStateRef.current = nextState;
    setSwipeState(nextState);
  }

  function endSwipe(clientX: number, clientY: number) {
    const current = swipeStateRef.current;
    if (current.itemId === null) {
      return;
    }
    const dx = clientX - current.startX;
    const dy = clientY - current.startY;
    const effectiveLock =
      current.locked === 'pending'
        ? Math.abs(dx) > SWIPE_START_THRESHOLD && Math.abs(dx) > Math.abs(dy)
          ? 'horizontal'
          : Math.abs(dy) > SWIPE_START_THRESHOLD
            ? 'vertical'
            : 'pending'
        : current.locked;
    const baseOffset = openSwipeItemId === current.itemId ? -SWIPE_OPEN_OFFSET : 0;
    const finalOffset = Math.max(-SWIPE_OPEN_OFFSET, Math.min(0, baseOffset + dx));
    setOpenSwipeItemId(effectiveLock === 'horizontal' && Math.abs(finalOffset) >= SWIPE_OPEN_THRESHOLD ? current.itemId : null);
    resetSwipeState();
    handleLongPressEnd();
  }

  function handleSwipePointerDown(item: SharedListItem, event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse') {
      return;
    }
    beginSwipe(item, event.clientX, event.clientY, event.target);
  }

  function handleSwipePointerMove(event: ReactPointerEvent<HTMLElement>) {
    updateSwipe(event.clientX, event.clientY);
  }

  function handleSwipePointerEnd(event: ReactPointerEvent<HTMLElement>) {
    endSwipe(event.clientX, event.clientY);
  }

  function handleSwipeTouchStart(item: SharedListItem, event: ReactTouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    beginSwipe(item, touch.clientX, touch.clientY, event.target);
  }

  function handleSwipeTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    updateSwipe(touch.clientX, touch.clientY);
  }

  function handleSwipeTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    endSwipe(touch.clientX, touch.clientY);
  }

  useEffect(() => {
    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-swipe-row="true"]')) {
        setOpenSwipeItemId(null);
      }
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, []);

  function getSwipeOffset(itemId: string) {
    if (swipeState.itemId === itemId && swipeState.pointerId !== null && swipeState.locked === 'horizontal') {
      return swipeState.offsetX;
    }
    return openSwipeItemId === itemId ? -SWIPE_OPEN_OFFSET : 0;
  }

  async function commitEditing(item: SharedListItem) {
    const nextTitle = editingDraft.title.trim();
    if (!nextTitle) {
      cancelEditing();
      return;
    }

    const nextLinkUrl = editingDraft.linkUrl.trim();
    const nextTags = editingDraft.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const previousTitle = item.title;
    const previousLinkUrl = item.link_url;
    const previousTags = item.tags;

    const tagsChanged =
      (previousTags ?? []).length !== nextTags.length ||
      nextTags.some((tag, index) => tag !== (previousTags ?? [])[index]);
    const linkChanged = (previousLinkUrl ?? '') !== nextLinkUrl;
    const titleChanged = previousTitle !== nextTitle;

    if (!tagsChanged && !linkChanged && !titleChanged) {
      cancelEditing();
      return;
    }

    setItems((current) =>
      current.map((existing) =>
        existing.id === item.id
          ? {
              ...existing,
              title: nextTitle,
              link_url: nextLinkUrl || null,
              tags: nextTags.length ? nextTags : null,
            }
          : existing,
      ),
    );
    cancelEditing();

    try {
      await updateSharedListItem(item.id, {
        title: nextTitle,
        linkUrl: nextLinkUrl,
        tags: nextTags,
      });
    } catch {
      setItems((current) =>
        current.map((existing) =>
          existing.id === item.id
            ? {
                ...existing,
                title: previousTitle,
                link_url: previousLinkUrl,
                tags: previousTags,
              }
            : existing,
        ),
      );
      showToast('수정에 실패했어요');
    }
  }

  async function handleUndoDelete(target: SharedListItem) {
    clearToast();
    setOpenSwipeItemId(null);
    resetSwipeState();
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
              const isMe = member.display_name === myName;
              return (
                <span key={member.display_name}>
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
        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            aria-label="새로고침"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
            onClick={refreshAndFocus}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
          </button>
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
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                onClick={() => {
                  setShareOpen(false);
                  openInstallPrompt();
                }}
              >
                앱으로 설치
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
            onClick={() => {
              setDetailOpen((open) => {
                const next = !open;
                if (next) {
                  window.requestAnimationFrame(() => {
                    linkInputRef.current?.focus();
                  });
                }
                return next;
              });
            }}
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
              ref={linkInputRef}
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
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const selected = parseDraftTags(tagsText).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        selected
                          ? 'bg-neutral-950 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                      onClick={() => toggleNewItemTag(tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      {availableTags.length > 0 ? (
        <div className="-mx-6 mt-4 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5">
            <button
              type="button"
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
                effectiveSelectedTag === null
                  ? 'bg-neutral-950 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedTag(null)}
            >
              전체
              <span
                className={`ml-1 ${
                  effectiveSelectedTag === null ? 'text-neutral-300' : 'text-neutral-400'
                }`}
              >
                {pendingItemsAll.length}
              </span>
            </button>
            {availableTags.map((tag) => {
              const count = pendingCountByTag.get(tag) ?? 0;
              const active = effectiveSelectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
                    active
                      ? 'bg-neutral-950 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                  onClick={() => setSelectedTag((current) => (current === tag ? null : tag))}
                >
                  {tag}
                  <span className={`ml-1 ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-neutral-500">해야 할 항목</h2>
        <div>
          {pendingItems.slice(0, pendingVisibleCount).map((item) => {
            const swipeOffset = getSwipeOffset(item.id);
            const isSwipeOpen = openSwipeItemId === item.id || (swipeState.itemId === item.id && swipeState.locked === 'horizontal' && swipeOffset !== 0);
            return (
              <div
                key={item.id}
                data-swipe-row="true"
                data-swipe-open={isSwipeOpen ? 'true' : 'false'}
                data-testid={`swipe-row-${item.id}`}
                className="motion-fade-up relative overflow-hidden rounded-2xl"
                onPointerDown={(event) => handleSwipePointerDown(item, event)}
                onPointerMove={handleSwipePointerMove}
                onPointerUp={handleSwipePointerEnd}
                onPointerCancel={handleSwipePointerEnd}
                onTouchStart={(event) => handleSwipeTouchStart(item, event)}
                onTouchMove={handleSwipeTouchMove}
                onTouchEnd={handleSwipeTouchEnd}
                onTouchCancel={handleLongPressEnd}
              >
                <div className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center rounded-2xl bg-rose-500">
                  <button
                    type="button"
                    aria-label={`${item.title} 삭제`}
                    className="flex h-full w-full items-center justify-center text-white"
                    onClick={() => void handleDeleteItem(item)}
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>
                <article
                  className="group flex min-h-11 items-start gap-3 bg-white py-1.5 transition-transform duration-200"
                  style={{ transform: `translateX(${swipeOffset}px)` }}
                >
                  <button
                    aria-label={`${item.title} 완료`}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-neutral-300 bg-transparent transition hover:border-neutral-500"
                    type="button"
                    onClick={() => void handleToggleComplete(item.id, true)}
                  />
                  <div className="min-w-0 flex-1">
                    {editingItemId === item.id ? (
                      <div className="motion-fade-up flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            ref={editingInputRef}
                            className="h-9 min-w-0 flex-1 rounded-lg bg-neutral-50 px-3 text-[15px] font-medium text-neutral-950 outline-none ring-1 ring-neutral-300 focus:ring-neutral-500"
                            placeholder="항목"
                            value={editingDraft.title}
                            onChange={(event) =>
                              setEditingDraft((current) => ({ ...current, title: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void commitEditing(item);
                              } else if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelEditing();
                              }
                            }}
                          />
                          <button
                            type="button"
                            aria-label="취소"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800"
                            onClick={cancelEditing}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            aria-label="저장"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                            onClick={() => void commitEditing(item)}
                            disabled={!editingDraft.title.trim()}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </button>
                        </div>
                        <input
                          className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-950 outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 placeholder:text-neutral-400"
                          placeholder="링크 주소 (https://...)"
                          value={editingDraft.linkUrl}
                          onChange={(event) =>
                            setEditingDraft((current) => ({ ...current, linkUrl: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void commitEditing(item);
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelEditing();
                            }
                          }}
                        />
                        <input
                          className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-950 outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 placeholder:text-neutral-400"
                          placeholder="태그를 쉼표로 나눠 적어보세요"
                          value={editingDraft.tagsText}
                          onChange={(event) =>
                            setEditingDraft((current) => ({ ...current, tagsText: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void commitEditing(item);
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelEditing();
                            }
                          }}
                        />
                        {availableTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {availableTags.map((tag) => {
                              const selected = parseDraftTags(editingDraft.tagsText).includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-xs transition ${
                                    selected
                                      ? 'bg-neutral-950 text-white'
                                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                  }`}
                                  onClick={() => toggleDraftTag(tag)}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex min-w-0 flex-1 cursor-text select-none flex-wrap items-center gap-x-1.5 gap-y-1"
                          onPointerUp={handleLongPressEnd}
                          onPointerLeave={handleLongPressEnd}
                          onPointerCancel={handleLongPressEnd}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            startEditing(item);
                          }}
                        >
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
                        <p className="shrink-0 pt-0.5 text-xs text-neutral-400">{formatCreatedAt(item.created_at, nowTimestamp)}</p>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        {pendingItems.length > pendingVisibleCount ? (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs text-neutral-500 transition hover:text-neutral-800"
            onClick={() => setPendingVisibleCount((count) => count + 20)}
          >
            더보기
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-neutral-500">완료됨</h2>
        <div>
          {completedItems.slice(0, completedVisibleCount).map((item) => {
            const swipeOffset = getSwipeOffset(item.id);
            const isSwipeOpen = openSwipeItemId === item.id || (swipeState.itemId === item.id && swipeState.locked === 'horizontal' && swipeOffset !== 0);
            return (
              <div
                key={item.id}
                data-swipe-row="true"
                data-swipe-open={isSwipeOpen ? 'true' : 'false'}
                data-testid={`swipe-row-${item.id}`}
                className="motion-fade-up relative overflow-hidden rounded-2xl"
                onPointerDown={(event) => handleSwipePointerDown(item, event)}
                onPointerMove={handleSwipePointerMove}
                onPointerUp={handleSwipePointerEnd}
                onPointerCancel={handleSwipePointerEnd}
                onTouchStart={(event) => handleSwipeTouchStart(item, event)}
                onTouchMove={handleSwipeTouchMove}
                onTouchEnd={handleSwipeTouchEnd}
                onTouchCancel={handleLongPressEnd}
              >
                <div className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center rounded-2xl bg-rose-500">
                  <button
                    type="button"
                    aria-label={`${item.title} 삭제`}
                    className="flex h-full w-full items-center justify-center text-white"
                    onClick={() => void handleDeleteItem(item)}
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>
                <article
                  className="flex min-h-10 items-center gap-3 bg-white py-1 transition-transform duration-200"
                  style={{ transform: `translateX(${swipeOffset}px)` }}
                >
                  <button
                    aria-label={`${item.title} 다시 열기`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-50"
                    type="button"
                    onClick={() => void handleToggleComplete(item.id, false)}
                  >
                    <div className="h-2 w-2 rounded-full bg-neutral-400" />
                  </button>
                  {editingItemId === item.id ? (
                    <div className="motion-fade-up flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={editingInputRef}
                          className="h-9 min-w-0 flex-1 rounded-lg bg-neutral-50 px-3 text-[15px] text-neutral-700 outline-none ring-1 ring-neutral-300 focus:ring-neutral-500"
                          placeholder="항목"
                          value={editingDraft.title}
                          onChange={(event) =>
                            setEditingDraft((current) => ({ ...current, title: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void commitEditing(item);
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelEditing();
                            }
                          }}
                        />
                        <button
                          type="button"
                          aria-label="취소"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800"
                          onClick={cancelEditing}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          aria-label="저장"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                          onClick={() => void commitEditing(item)}
                          disabled={!editingDraft.title.trim()}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                        </button>
                      </div>
                      <input
                        className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-700 outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 placeholder:text-neutral-400"
                        placeholder="링크 주소 (https://...)"
                        value={editingDraft.linkUrl}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, linkUrl: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void commitEditing(item);
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                      />
                      <input
                        className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm text-neutral-700 outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 placeholder:text-neutral-400"
                        placeholder="태그를 쉼표로 나눠 적어보세요"
                        value={editingDraft.tagsText}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, tagsText: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void commitEditing(item);
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                      />
                      {availableTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.map((tag) => {
                            const selected = parseDraftTags(editingDraft.tagsText).includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                className={`rounded-full px-3 py-1 text-xs transition ${
                                  selected
                                    ? 'bg-neutral-950 text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                                onClick={() => toggleDraftTag(tag)}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <h3
                      className="min-w-0 flex-1 cursor-text select-none text-[15px] leading-6 text-neutral-400 line-through"
                      onPointerUp={handleLongPressEnd}
                      onPointerLeave={handleLongPressEnd}
                      onPointerCancel={handleLongPressEnd}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        startEditing(item);
                      }}
                    >
                      {item.title}
                    </h3>
                  )}
                </article>
              </div>
            );
          })}
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
