# Shared List Fast Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared list page focus the new-item input on entry, add items immediately on Enter or button press, and keep the cursor in the input for repeated entry.

**Architecture:** Keep the change local to the shared list client page and the shared list data layer. Use a focused input ref plus a small optimistic-item workflow so the UI updates immediately without reloading the whole list after each create, while preserving the existing full refresh path for initial load and completion toggles.

**Tech Stack:** Next.js App Router, React 19 client components, Supabase client helpers, Vitest, Playwright

---

### Task 1: Add UI tests for focus and repeated entry

**Files:**
- Modify: `tests/shared-list.test.ts`

- [ ] **Step 1: Write the failing UI test cases**

```ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SharedListPage } from '../src/components/local/shared-list-page';

it('focuses the new item input on first render', async () => {
  render(<SharedListPage listId="list-1" />);
  const input = await screen.findByPlaceholderText('새 항목');
  await waitFor(() => expect(input).toHaveFocus());
});

it('keeps focus and shows the new item immediately after Enter submit', async () => {
  const user = userEvent.setup();
  render(<SharedListPage listId="list-1" />);
  const input = await screen.findByPlaceholderText('새 항목');

  await user.type(input, '한강 산책{enter}');

  expect(await screen.findByText('한강 산책')).toBeVisible();
  await waitFor(() => {
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/shared-list.test.ts`
Expected: FAIL because `SharedListPage` is not covered by the current mocks and focus / optimistic behavior do not exist yet.

- [ ] **Step 3: Add component-level Supabase mocks for list loading and item creation**

```ts
const loadSharedList = vi.fn();
const addSharedListItem = vi.fn();
const toggleSharedListItem = vi.fn();

vi.mock('../src/lib/shared-list', async () => {
  const actual = await vi.importActual('../src/lib/shared-list');
  return {
    ...actual,
    loadSharedList,
    addSharedListItem,
    toggleSharedListItem,
  };
});
```

- [ ] **Step 4: Re-run the focused test and keep it failing only on the missing behavior**

Run: `npm test -- tests/shared-list.test.ts`
Expected: FAIL on missing focus retention / immediate rendering, not on missing mocks.

- [ ] **Step 5: Commit the red test baseline**

```bash
git add tests/shared-list.test.ts
git commit -m "test: cover shared list fast entry"
```

### Task 2: Implement focus retention and optimistic add

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `src/lib/shared-list.ts`

- [ ] **Step 1: Return the inserted item from the data layer**

```ts
const { data, error } = await supabase
  .from('bucket_list_items')
  .insert({
    shared_list_id: listId,
    title: input.title,
    link_url: input.linkUrl?.trim() || null,
    tags: input.tags?.length ? input.tags : null,
  })
  .select('id, title, link_url, tags, created_at, completed_at')
  .single();

if (error || !data) {
  throw new Error('create-item-failed');
}

return data as SharedListItem;
```

- [ ] **Step 2: Add a focused input ref and submitting guard in the page**

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

useEffect(() => {
  inputRef.current?.focus();
}, []);
```

- [ ] **Step 3: Add optimistic item creation with replacement and rollback**

```tsx
const optimisticId = `optimistic-${crypto.randomUUID()}`;
const optimisticItem: SharedListItem = {
  id: optimisticId,
  title: nextTitle,
  link_url: null,
  tags: null,
  created_at: new Date().toISOString(),
  completed_at: null,
};

setItems((current) => [optimisticItem, ...current]);
setTitle('');
inputRef.current?.focus();
setIsSubmitting(true);

try {
  const createdItem = await addSharedListItem(listId, { title: nextTitle });
  setItems((current) => current.map((item) => (item.id === optimisticId ? createdItem : item)));
} catch {
  setItems((current) => current.filter((item) => item.id !== optimisticId));
} finally {
  setIsSubmitting(false);
  inputRef.current?.focus();
}
```

- [ ] **Step 4: Wire the input and button to the new state**

```tsx
<input
  ref={inputRef}
  autoFocus
  placeholder="새 항목"
  value={title}
  onChange={(event) => setTitle(event.target.value)}
/>
<button type="submit" disabled={isSubmitting || !title.trim()}>
```

- [ ] **Step 5: Run the shared-list tests to verify the implementation passes**

Run: `npm test -- tests/shared-list.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/local/shared-list-page.tsx src/lib/shared-list.ts tests/shared-list.test.ts
git commit -m "feat: speed up shared list entry"
```

### Task 3: Verify browser behavior end to end

**Files:**
- Modify: `tests/e2e/supabase-flow.spec.ts`

- [ ] **Step 1: Add a repeated Enter-entry scenario**

```ts
const input = page.getByPlaceholder('새 항목');
await expect(input).toBeFocused();
await input.fill('한강 산책');
await input.press('Enter');
await expect(input).toBeFocused();
await input.fill('서울숲 피크닉');
await input.press('Enter');
await expect(page.getByText('한강 산책')).toBeVisible();
await expect(page.getByText('서울숲 피크닉')).toBeVisible();
```

- [ ] **Step 2: Run the targeted e2e test**

Run: `npm run test:e2e -- tests/e2e/supabase-flow.spec.ts`
Expected: PASS

- [ ] **Step 3: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit the verification updates**

```bash
git add tests/e2e/supabase-flow.spec.ts
git commit -m "test: verify repeated shared list entry"
```

### Task 4: Final ship steps

**Files:**
- Modify: `docs/superpowers/plans/2026-05-12-shared-list-fast-entry.md`

- [ ] **Step 1: Mark the finished checklist items in this plan**

```md
- [x] Step completed
```

- [ ] **Step 2: Run the full focused regression set**

Run: `npm test -- tests/shared-list.test.ts && npm run test:e2e -- tests/e2e/supabase-flow.spec.ts && npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Push the branch**

```bash
git push origin main
```

- [ ] **Step 4: Summarize the shipped behavior with verified commands**

```md
Shared list fast entry shipped with autofocus, optimistic add, and focus retention.
Verified with Vitest, Playwright, lint, and typecheck.
```
