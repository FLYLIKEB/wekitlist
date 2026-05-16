# Main Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the shared-list Google web search action, preserve the current hydration-safe home screen behavior, verify both affected flows, and push the integrated result to remote `main`.

**Architecture:** Treat historical commit `6f256cc` and branch `feat/home-screen-redesign` as source material only. Apply the web-search UI directly into current `main`, keep `src/components/local/local-app.tsx` as the source of truth for hydration-safe redirect behavior, and update only the tests or branch deltas that still matter after comparison. Verify with targeted Vitest runs and browser checks before pushing.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Playwright-configured local browser testing

---

## File map

- Modify: `src/components/local/shared-list-page.tsx` — render the Google search link next to the Kakao map action for each shared list item.
- Modify: `tests/shared-list-page.test.tsx` — cover the restored Google search action.
- Review / possibly keep unchanged: `src/components/local/local-app.tsx` — preserve hydration-safe home screen logic already on `main`.
- Review / possibly keep unchanged: `tests/local-app.test.tsx` — ensure current expectations still match preserved `main` behavior.

### Task 1: Restore Google search on shared list items

**Files:**
- Modify: `tests/shared-list-page.test.tsx`
- Modify: `src/components/local/shared-list-page.tsx`
- Test: `tests/shared-list-page.test.tsx`

- [ ] **Step 1: Confirm the failing test exists or add it if missing**

```ts
it('shows a google search link next to the kakao map button for each item', async () => {
  sharedListMocks.loadSharedList.mockResolvedValue({
    list: {
      id: 'list-1',
      group_name: '주말 버킷리스트',
      invite_token: 'invite-1',
    },
    items: [
      {
        id: 'item-1',
        title: '성수 맛집',
        link_url: null,
        tags: null,
        created_at: '2026-05-12T00:00:00.000Z',
        completed_at: null,
      },
    ],
  });

  render(<SharedListPage listId="list-1" />);

  const googleLink = await screen.findByRole('link', { name: '성수 맛집 구글에서 검색' });

  expect(googleLink).toHaveAttribute('href', 'https://www.google.com/search?q=%EC%84%B1%EC%88%98%20%EB%A7%9B%EC%A7%91');
  expect(googleLink).toHaveAttribute('target', '_blank');
  expect(screen.getByRole('button', { name: '성수 맛집 카카오맵에서 검색' })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused shared-list test file**

Run: `npm test -- tests/shared-list-page.test.tsx`
Expected: the Google-search test fails if the UI is missing, while the rest of the file shows current status.

- [ ] **Step 3: Add the minimal Google search link in the item action row**

```tsx
<a
  href={`https://www.google.com/search?q=${encodeURIComponent(item.title)}`}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
  aria-label={`${item.title} 구글에서 검색`}
>
  <Search className="h-3.5 w-3.5" aria-hidden />
  <span>구글</span>
</a>
```

- [ ] **Step 4: Run the focused shared-list test file again**

Run: `npm test -- tests/shared-list-page.test.tsx`
Expected: PASS for the Google-search test and the rest of the shared-list file.

- [ ] **Step 5: Commit the restored web search feature**

```bash
git add src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx
git commit -m "feat: restore shared list google search"
```

### Task 2: Preserve hydration-safe home screen behavior while resolving branch drift

**Files:**
- Review: `src/components/local/local-app.tsx`
- Review / modify only if needed: `tests/local-app.test.tsx`
- Test: `tests/local-app.test.tsx`

- [ ] **Step 1: Confirm the current home-screen test matches the preserved main behavior**

```ts
it('keeps return navigation secondary on the fresh home screen when entered from a list', async () => {
  const user = userEvent.setup();

  window.localStorage.setItem('lastVisitedListPath', '/list/abc?as=민지');
  window.history.replaceState({}, '', '/?fresh=1&from=list');

  render(<LocalApp />);

  expect(screen.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();

  const backButton = await screen.findByRole('button', { name: '리스트로 돌아가기' });
  expect(backButton).toHaveClass('text-neutral-500');

  await user.click(backButton);

  expect(replaceMock).toHaveBeenCalledWith('/list/abc?as=민지');
});
```

- [ ] **Step 2: Run the focused local-app test file**

Run: `npm test -- tests/local-app.test.tsx`
Expected: PASS. If it fails, only update the test or implementation enough to reflect the current hydration-safe `main` behavior.

- [ ] **Step 3: Keep the existing hydration-safe implementation unless a test proves a change is required**

```tsx
const isHydrated = useSyncExternalStore(
  () => () => {},
  () => true,
  () => false,
);
const { entryContext, redirectTarget } = useMemo(() => {
  if (!isHydrated) {
    return { entryContext: null, redirectTarget: null } as const;
  }

  const fromList = searchParams.get('from') === 'list';

  try {
    const stored = localStorage.getItem('lastVisitedListPath');
    const lastVisitedListPath = stored && stored.startsWith('/list/') ? stored : null;

    if (searchParams.has('fresh')) {
      return { entryContext: fromList ? lastVisitedListPath : null, redirectTarget: null } as const;
    }

    return { entryContext: null, redirectTarget: lastVisitedListPath } as const;
  } catch {
    return { entryContext: null, redirectTarget: null } as const;
  }
}, [isHydrated, searchParams]);
```

- [ ] **Step 4: Re-run the local-app test file after any adjustment**

Run: `npm test -- tests/local-app.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit only if a real code or test change was needed**

```bash
git add src/components/local/local-app.tsx tests/local-app.test.tsx
git commit -m "test: align home screen integration expectations"
```

### Task 3: Verify the integrated UI in the browser

**Files:**
- Modify if needed: `src/components/local/shared-list-page.tsx`
- Modify if needed: `src/components/local/local-app.tsx`
- Test: browser session against local app

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Next.js starts locally and reports a ready URL.

- [ ] **Step 2: Open the app and verify the home screen**

Check:
- `Wekitlist` brand is visible.
- `함께 쓰는 리스트, 더 간결하게` heading is visible.
- `새 리스트 만들기` button is visible.
- No obvious hydration mismatch or redirect regression appears on load.

- [ ] **Step 3: Open a shared list page with at least one item and verify the action row**

Check:
- A Kakao map button is visible for the item.
- A Google search link is visible next to it.
- The Google search link points to `https://www.google.com/search?q=<encoded title>`.
- Activating the link opens a new tab instead of breaking the local app.

- [ ] **Step 4: If UI verification reveals an issue, make the smallest fix and rerun the focused tests**

Run: `npm test -- tests/shared-list-page.test.tsx tests/local-app.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit any browser-driven fix**

```bash
git add src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx src/components/local/local-app.tsx tests/local-app.test.tsx
git commit -m "fix: verify main integration UI behavior"
```

### Task 4: Final verification and push to remote main

**Files:**
- Review: git working tree

- [ ] **Step 1: Run the affected test files together**

Run: `npm test -- tests/shared-list-page.test.tsx tests/local-app.test.tsx`
Expected: PASS.

- [ ] **Step 2: Check working tree state**

Run: `git status --short`
Expected: no unexpected modified files remain.

- [ ] **Step 3: Push to remote main**

```bash
git push origin main
```

- [ ] **Step 4: Confirm the local branch matches remote**

Run: `git status --short --branch`
Expected: `## main...origin/main` with no ahead/behind divergence and no uncommitted changes.
