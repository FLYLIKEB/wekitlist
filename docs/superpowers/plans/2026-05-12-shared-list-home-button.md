# Shared List Home Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-right `홈으로` button to the shared list page so users can return to the home screen directly from the page header.

**Architecture:** Make a minimal UI-only change in the shared list header by adding a home navigation link inside the existing action group. Protect the change with a focused component test that verifies the button is rendered, points to `/`, and does not displace the existing `새로고침` and `공유` actions.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library

---

## File Structure

- `src/components/local/shared-list-page.tsx` — shared list screen UI; add the `홈으로` link in the existing top-right action cluster and import `next/link`.
- `tests/shared-list-page.test.tsx` — component tests for the shared list page; add a focused assertion for the new header navigation button.

### Task 1: Add the shared list header home button

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `tests/shared-list-page.test.tsx`
- Spec reference: `docs/superpowers/specs/2026-05-12-shared-list-home-button-design.md`

- [ ] **Step 1: Write the failing test**

Add this test near the existing shared-list render tests in `tests/shared-list-page.test.tsx`:

```tsx
it('shows a home button in the shared list header that links to the home page', async () => {
  render(<SharedListPage listId="list-1" />);

  const homeLink = await screen.findByRole('link', { name: '홈으로' });

  expect(homeLink).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: '새로고침' })).toBeVisible();
  expect(screen.getByRole('button', { name: '공유' })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run tests/shared-list-page.test.tsx -t "shows a home button in the shared list header that links to the home page"
```

Expected: FAIL with an error similar to `Unable to find role="link" and name "홈으로"`.

- [ ] **Step 3: Write the minimal implementation**

Update the imports at the top of `src/components/local/shared-list-page.tsx`:

```tsx
import { Check, ChevronDown, Link2, MapPin, Plus, RefreshCw, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
```

Then update the header action group in `src/components/local/shared-list-page.tsx` so it becomes:

```tsx
<div className="mt-2 flex items-center justify-between">
  <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">{groupName}</h1>
  <div className="relative flex items-center gap-1.5">
    <Link
      href="/"
      className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
    >
      홈으로
    </Link>
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
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npx vitest run tests/shared-list-page.test.tsx -t "shows a home button in the shared list header that links to the home page"
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Run the related test file to catch regressions**

Run:

```bash
npx vitest run tests/shared-list-page.test.tsx
```

Expected: PASS with all shared list page tests passing, including the existing swipe-delete coverage.

- [ ] **Step 6: Review the working tree before commit**

Run:

```bash
git diff -- src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx docs/superpowers/specs/2026-05-12-shared-list-home-button-design.md docs/superpowers/plans/2026-05-12-shared-list-home-button.md
```

Expected: Diff shows only the new home button, its focused test, the design spec, and this plan file. If unrelated edits are present, separate them before committing.

- [ ] **Step 7: Commit the change**

Run:

```bash
git add src/components/local/shared-list-page.tsx tests/shared-list-page.test.tsx docs/superpowers/specs/2026-05-12-shared-list-home-button-design.md docs/superpowers/plans/2026-05-12-shared-list-home-button.md
git commit -m "feat: add shared list home button"
```

Expected: A new commit containing the UI change, test, spec, and plan.

## Self-Review

- **Spec coverage:** The plan covers the requested location (shared list header), the requested form (`홈으로` text button), the destination (`/`), and regression protection for adjacent header actions.
- **Placeholder scan:** No `TODO`, `TBD`, or vague implementation steps remain.
- **Type consistency:** The plan uses existing `SharedListPage` and Testing Library APIs without introducing new types or renamed properties.
