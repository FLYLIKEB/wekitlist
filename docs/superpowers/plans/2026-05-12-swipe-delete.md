# Swipe Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace always-visible delete buttons in the shared list with a mobile-first swipe-to-reveal delete action that still uses explicit tap-to-delete and preserves undo.

**Architecture:** Keep the change inside `src/components/local/shared-list-page.tsx` so the backend and item CRUD flows stay untouched. Add one shared swipe state machine for the currently active row, render a hidden destructive action behind each row, and cover the interaction with focused component tests in `tests/shared-list-page.test.tsx`.

**Tech Stack:** Next.js, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Add failing interaction tests

**Files:**
- Modify: `tests/shared-list-page.test.tsx`
- Modify: `src/components/local/shared-list-page.tsx`

- [ ] **Step 1: Write the failing test for revealed delete on pending items**

```tsx
it('reveals delete for a pending item after left swipe and deletes only after tapping the revealed action', async () => {
  render(<SharedListPage listId="list-1" />);

  const row = await screen.findByTestId('swipe-row-item-1');
  fireEvent.pointerDown(row, { pointerId: 1, clientX: 220, clientY: 20, pointerType: 'touch' });
  fireEvent.pointerMove(row, { pointerId: 1, clientX: 120, clientY: 20, pointerType: 'touch' });
  fireEvent.pointerUp(row, { pointerId: 1, clientX: 120, clientY: 20, pointerType: 'touch' });

  expect(screen.getByRole('button', { name: '한강 산책 삭제' })).toBeVisible();
  expect(sharedListMocks.deleteSharedListItem).not.toHaveBeenCalled();

  await userEvent.setup().click(screen.getByRole('button', { name: '한강 산책 삭제' }));

  await waitFor(() => {
    expect(sharedListMocks.deleteSharedListItem).toHaveBeenCalledWith('item-1');
  });
});
```

- [ ] **Step 2: Write the failing test for single-open-row behavior**

```tsx
it('keeps only one swipe row open at a time', async () => {
  render(<SharedListPage listId="list-1" />);

  const firstRow = await screen.findByTestId('swipe-row-item-1');
  const secondRow = await screen.findByTestId('swipe-row-item-2');

  fireSwipeOpen(firstRow, 220, 120);
  expect(firstRow).toHaveAttribute('data-swipe-open', 'true');

  fireSwipeOpen(secondRow, 220, 120);
  expect(secondRow).toHaveAttribute('data-swipe-open', 'true');
  expect(firstRow).toHaveAttribute('data-swipe-open', 'false');
});
```

- [ ] **Step 3: Write the failing test for closing by outside tap**

```tsx
it('closes an open swipe row when the user taps outside', async () => {
  render(<SharedListPage listId="list-1" />);

  const row = await screen.findByTestId('swipe-row-item-1');
  fireSwipeOpen(row, 220, 120);
  expect(row).toHaveAttribute('data-swipe-open', 'true');

  fireEvent.pointerDown(document.body, { clientX: 10, clientY: 10, pointerType: 'touch' });

  await waitFor(() => {
    expect(row).toHaveAttribute('data-swipe-open', 'false');
  });
});
```

- [ ] **Step 4: Run the focused test file and confirm failure**

Run: `npm test -- tests/shared-list-page.test.tsx`
Expected: FAIL with missing swipe-row test ids / swipe-open state assertions.

- [ ] **Step 5: Commit the failing tests**

```bash
git add tests/shared-list-page.test.tsx
git commit -m "test: cover swipe delete interactions"
```

### Task 2: Implement shared swipe row behavior

**Files:**
- Modify: `src/components/local/shared-list-page.tsx:20-1095`
- Modify: `tests/shared-list-page.test.tsx`

- [ ] **Step 1: Add minimal swipe state and constants**

```tsx
const SWIPE_OPEN_OFFSET = 88;
const SWIPE_OPEN_THRESHOLD = 56;
const SWIPE_START_THRESHOLD = 12;

type SwipeState = {
  itemId: string | null;
  offsetX: number;
  draggingItemId: string | null;
  pointerId: number | null;
  startX: number;
  startY: number;
  locked: 'pending' | 'horizontal' | 'vertical';
};
```

- [ ] **Step 2: Add row-level pointer handlers that open and close rows**

```tsx
function handleSwipePointerDown(itemId: string, event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType === 'mouse') return;
  setSwipeState((current) => ({
    ...current,
    itemId: current.itemId === itemId ? itemId : current.itemId,
    draggingItemId: itemId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    locked: 'pending',
  }));
}
```

```tsx
function handleSwipePointerMove(event: PointerEvent) {
  setSwipeState((current) => {
    if (current.pointerId !== event.pointerId || !current.draggingItemId) return current;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const nextLock =
      current.locked === 'pending'
        ? Math.abs(dx) > SWIPE_START_THRESHOLD && Math.abs(dx) > Math.abs(dy)
          ? 'horizontal'
          : Math.abs(dy) > SWIPE_START_THRESHOLD
            ? 'vertical'
            : 'pending'
        : current.locked;
    if (nextLock !== 'horizontal') return { ...current, locked: nextLock };
    return {
      ...current,
      itemId: current.draggingItemId,
      locked: 'horizontal',
      offsetX: Math.max(-SWIPE_OPEN_OFFSET, Math.min(0, dx + (current.itemId === current.draggingItemId ? -SWIPE_OPEN_OFFSET : 0))),
    };
  });
}
```

- [ ] **Step 3: Add close-on-outside-tap and single-open-row logic**

```tsx
useEffect(() => {
  function handlePointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-swipe-row="true"]')) {
      setOpenSwipeItemId(null);
    }
  }

  document.addEventListener('pointerdown', handlePointerDown);
  return () => document.removeEventListener('pointerdown', handlePointerDown);
}, []);
```

- [ ] **Step 4: Replace visible delete buttons with a revealed action layer**

```tsx
<div className="relative overflow-hidden rounded-2xl" data-swipe-row="true" data-swipe-open={isOpen ? 'true' : 'false'} data-testid={`swipe-row-${item.id}`}>
  <div className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center rounded-2xl bg-rose-500 text-white">
    <button
      type="button"
      aria-label={`${item.title} 삭제`}
      className="flex h-full w-full items-center justify-center"
      onClick={() => void handleDeleteItem(item)}
    >
      <X className="h-4 w-4" strokeWidth={2.4} />
    </button>
  </div>
  <div className="relative bg-white transition-transform duration-200" style={{ transform: `translateX(${translateX}px)` }}>
    {/* existing row content without the old visible delete button */}
  </div>
</div>
```

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run: `npm test -- tests/shared-list-page.test.tsx`
Expected: PASS for the swipe interaction cases and existing shared list page tests.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx
git commit -m "feat: add swipe to reveal delete"
```

### Task 3: Verify no regressions in the page

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Test: `tests/shared-list-page.test.tsx`

- [ ] **Step 1: Run lint for the changed files**

Run: `npm run lint -- src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx`
Expected: PASS

- [ ] **Step 2: Run typecheck for the project**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run the full unit test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Start the local dev server for UI verification**

Run: `npm run dev`
Expected: Next.js dev server starts locally without compile errors.

- [ ] **Step 5: Manually verify the swipe behavior in the browser**

```text
1. Open the shared list page on a mobile-sized viewport.
2. Swipe one pending item left below threshold and confirm it snaps closed.
3. Swipe the same item past threshold and confirm the delete action stays open.
4. Tap outside and confirm the item closes.
5. Open one item, then swipe a second item and confirm the first closes.
6. Tap the revealed delete action and confirm undo toast appears.
7. Tap the completion toggle, link button, map button, and long-press edit entry to confirm they still work.
```

Expected: All interaction checks pass with no accidental instant delete.

- [ ] **Step 6: Commit the verification-safe adjustments if any were needed**

```bash
git add src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx
git commit -m "test: verify swipe delete behavior"
```
