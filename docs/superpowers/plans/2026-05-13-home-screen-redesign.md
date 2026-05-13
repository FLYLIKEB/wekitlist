# Home Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the home screen so Wekitlist feels more premium, brand-forward, and mobile-first while keeping the existing list-creation behavior unchanged.

**Architecture:** Keep the redesign contained to `LocalApp` so the existing create-list flow, redirect logic, and router interactions stay intact. Update the component markup and Tailwind classes to introduce a stronger hero hierarchy, a single creation card, and lower-emphasis return navigation, then verify the UI contract with both component and end-to-end tests.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library, Playwright

---

## File structure
- Modify: `src/components/local/local-app.tsx` — home screen layout, copy, CTA label, return-navigation emphasis, mobile-first spacing
- Modify: `tests/local-app.test.tsx` — component tests for updated copy, CTA, and return navigation behavior
- Modify: `tests/e2e/home.spec.ts` — landing-page smoke test for the redesigned hero and CTA
- Optional modify if visual harmony requires it: `src/app/layout.tsx` — only if footer spacing conflicts with the new mobile-first composition

### Task 1: Lock in the new home screen text contract with component tests

**Files:**
- Modify: `tests/local-app.test.tsx`
- Modify later: `src/components/local/local-app.tsx`

- [ ] **Step 1: Write the failing test for the default hero state**

```tsx
it('shows the redesigned brand-forward home screen', () => {
  render(<LocalApp />);

  expect(screen.getByText('Wekitlist')).toBeVisible();
  expect(screen.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
  expect(screen.getByText('새로운 공유 리스트를 바로 만들고 함께 채워보세요.')).toBeVisible();
  expect(screen.getByRole('button', { name: '새 리스트 만들기' })).toBeVisible();
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- tests/local-app.test.tsx`
Expected: FAIL because the current heading is `같이 쓰는 버킷리스트` and the current button text is `공유 리스트 만들기`

- [ ] **Step 3: Extend the return-navigation test to match the new secondary treatment**

```tsx
it('keeps return navigation secondary on the fresh home screen when entered from a list', async () => {
  const user = userEvent.setup();

  window.localStorage.setItem('lastVisitedListPath', '/list/abc?as=민지');
  window.history.replaceState({}, '', '/?fresh=1&from=list');

  render(<LocalApp />);

  expect(screen.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();

  const backButton = screen.getByRole('button', { name: '리스트로 돌아가기' });
  expect(backButton).toHaveClass('text-neutral-500');

  await user.click(backButton);

  expect(replaceMock).toHaveBeenCalledWith('/list/abc?as=민지');
});
```

- [ ] **Step 4: Run the component test again to confirm both assertions fail for the right reasons**

Run: `npm test -- tests/local-app.test.tsx`
Expected: FAIL with missing redesigned heading/button text and missing secondary button styling class

- [ ] **Step 5: Commit the failing test contract**

```bash
git add tests/local-app.test.tsx
git commit -m "test: define redesigned home screen contract"
```

### Task 2: Implement the redesigned mobile-first hero and creation card

**Files:**
- Modify: `src/components/local/local-app.tsx:67-104`
- Verify: `tests/local-app.test.tsx`

- [ ] **Step 1: Replace the current home screen markup with the redesigned structure**

```tsx
return (
  <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-10 pt-[max(24px,env(safe-area-inset-top)+12px)] sm:px-6 sm:pt-10">
    <div className="flex flex-1 flex-col justify-center">
      {entryContext ? (
        <button
          type="button"
          className="mb-8 w-fit rounded-full px-1 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          onClick={() => router.replace(entryContext)}
        >
          리스트로 돌아가기
        </button>
      ) : (
        <div className="mb-8 flex items-center gap-2 text-sm font-medium text-neutral-900">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-neutral-900" />
          <span>Wekitlist</span>
        </div>
      )}

      <section className="max-w-lg">
        <p className="text-sm font-medium tracking-[-0.01em] text-neutral-500">Wekitlist</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-neutral-950 sm:text-[2.4rem]">
          함께 쓰는 리스트, 더 간결하게
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-6 text-neutral-600 sm:text-base">
          새로운 공유 리스트를 바로 만들고 함께 채워보세요.
        </p>
      </section>

      <form
        className="motion-fade-up mt-8 rounded-[28px] border border-neutral-200/80 bg-white p-4 shadow-[0_12px_40px_rgba(17,17,17,0.04)] sm:p-5"
        onSubmit={handleCreate}
      >
        <div className="space-y-3">
          <input
            className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
            placeholder="우리 리스트 이름"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <input
            className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-[15px] text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
            placeholder="내 이름"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <button
          className="mt-4 h-14 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white"
          type="submit"
          disabled={submitting}
        >
          {submitting ? '만드는 중...' : '새 리스트 만들기'}
        </button>
      </form>
    </div>
  </main>
);
```

- [ ] **Step 2: Run the component test to verify the new UI passes**

Run: `npm test -- tests/local-app.test.tsx`
Expected: PASS

- [ ] **Step 3: Run type-safe linting for the modified component**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit the redesigned home screen implementation**

```bash
git add src/components/local/local-app.tsx tests/local-app.test.tsx
git commit -m "feat: redesign home screen hero"
```

### Task 3: Refresh the landing-page smoke test for the new UI

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Verify later in browser: `src/components/local/local-app.tsx`

- [ ] **Step 1: Update the Playwright smoke test to the new hero copy**

```ts
import { test, expect } from '@playwright/test';

test('landing page shows redesigned create list hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Wekitlist').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
  await expect(page.getByRole('button', { name: '새 리스트 만들기' })).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e smoke test to verify it passes**

Run: `npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit the refreshed smoke test**

```bash
git add tests/e2e/home.spec.ts
git commit -m "test: update home screen smoke test"
```

### Task 4: Verify the mobile-first experience in the browser

**Files:**
- Verify: `src/components/local/local-app.tsx`
- Optional modify only if needed: `src/app/layout.tsx:42-50`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Next.js dev server starts successfully and serves the app locally

- [ ] **Step 2: Check the redesigned home screen in a mobile viewport**

Use browser automation to inspect the home page at an iPhone-sized viewport and verify:
- the hero, form, and CTA are visible without awkward spacing
- the CTA is the strongest visual emphasis
- the brand is clear but not loud
- no text wraps awkwardly on a narrow screen

Expected: The home screen matches the approved spec on mobile

- [ ] **Step 3: Exercise the create-list golden path in the browser**

Use these inputs:
- list name: `주말 계획`
- display name: `민지`

Expected: Submitting navigates to a newly created `/list/...` page without layout regressions

- [ ] **Step 4: Verify the returning-home secondary navigation path**

Navigate back to the fresh home state from a list so the `리스트로 돌아가기` control appears.
Expected: The control is visible, clearly secondary, tappable on mobile, and still returns to the previous list

- [ ] **Step 5: If footer spacing clashes on mobile, make the smallest possible layout adjustment**

```tsx
<footer className="px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-10 sm:pt-12">
  <div className="mx-auto flex max-w-xl justify-center border-t border-neutral-200/80 pt-5">
    <Link
      href="/about"
      className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm transition hover:text-neutral-900"
    >
      서비스 소개
    </Link>
  </div>
</footer>
```

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit the verified mobile polish if any code changed**

```bash
git add src/app/layout.tsx src/components/local/local-app.tsx
git commit -m "style: polish mobile home screen spacing"
```

If no code changed in this task, skip the commit.

### Task 5: Final regression check

**Files:**
- Verify: `src/components/local/local-app.tsx`
- Verify: `tests/local-app.test.tsx`
- Verify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Run the targeted unit and e2e checks together**

Run: `npm test -- tests/local-app.test.tsx && npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 2: Review git diff for scope control**

Run: `git diff -- src/components/local/local-app.tsx tests/local-app.test.tsx tests/e2e/home.spec.ts src/app/layout.tsx`
Expected: Only the approved home screen redesign and any minimal footer harmony change appear

- [ ] **Step 3: Commit the final verified state**

```bash
git add src/components/local/local-app.tsx tests/local-app.test.tsx tests/e2e/home.spec.ts src/app/layout.tsx
git commit -m "chore: verify redesigned home screen"
```

## Self-review
- Spec coverage check: the plan covers stronger branding, hero hierarchy, a single creation card, quieter return navigation, CTA copy update, and explicit mobile-first verification.
- Placeholder scan: no TBDs, TODOs, or unresolved implementation references remain.
- Type consistency check: all planned assertions and copy strings consistently use `함께 쓰는 리스트, 더 간결하게`, `새로운 공유 리스트를 바로 만들고 함께 채워보세요.`, and `새 리스트 만들기`.
