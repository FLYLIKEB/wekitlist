# Shared Bucketlist Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add share-link actions, invite-token routing, optional item details, delete-with-undo, and PWA/interaction polish to the Supabase-backed shared list app without losing its lightweight feel.

**Architecture:** Keep the current Next.js App Router + Supabase structure, extending the existing shared list data layer instead of introducing a new client state system. Add one new invite route, expand the shared item schema with optional fields, keep item creation lightweight with an expandable detail section, and implement delete/undo with a small client-side pending-delete buffer plus server delete calls. PWA work stays focused on installable-app presentation rather than offline-first sync.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Supabase JS, Playwright, Vitest

---

## File Structure

**Existing files to modify**
- `src/lib/shared-list.ts` — extend shared item types and Supabase CRUD helpers for invite lookup, optional fields, delete, and undo support hooks
- `src/components/local/shared-list-page.tsx` — add share UI, expandable item details form, created-at display, delete actions, undo toast, and subtle motion classes
- `src/app/layout.tsx` — expand metadata for installable/PWA presentation
- `public/manifest.webmanifest` — improve manifest metadata and icon references
- `tests/e2e/supabase-flow.spec.ts` — extend end-to-end flow for optional item details and created-at display
- `tests/shared-list.test.ts` — extend unit coverage for new shared-list data-layer behavior

**New files to create**
- `src/app/invite/[token]/page.tsx` — resolve invite token to shared list and route into the main list experience
- `tests/e2e/share-and-delete.spec.ts` — cover copy-link UI, invite-link entry, delete, and undo flow
- `public/icon-192.png` — PWA icon asset
- `public/icon-512.png` — PWA icon asset

**Likely schema change target**
- Add a new migration under the project’s eventual migration path for `bucket_list_items.link_url` and `bucket_list_items.tags`

---

### Task 1: Extend the data model for optional item details and invite lookup

**Files:**
- Modify: `src/lib/shared-list.ts`
- Test: `tests/shared-list.test.ts`

- [ ] **Step 1: Write the failing unit test for optional item fields and invite lookup shape**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
const signInAnonymously = vi.fn();
const from = vi.fn();

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      signInAnonymously,
    },
    from,
  },
}));

describe('shared list data layer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' },
        },
      },
    });
  });

  it('sends linkUrl and tags when creating an item', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'bucket_list_items') {
        return { insert };
      }

      throw new Error(`unexpected table: ${table}`);
    });

    const { addSharedListItem } = await import('../src/lib/shared-list');

    await addSharedListItem('list-1', {
      title: '한강 산책',
      linkUrl: 'https://map.kakao.com/example',
      tags: ['데이트', '산책'],
    });

    expect(insert).toHaveBeenCalledWith({
      shared_list_id: 'list-1',
      title: '한강 산책',
      link_url: 'https://map.kakao.com/example',
      tags: ['데이트', '산책'],
    });
  });

  it('loads a list by invite token', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'list-1',
        group_name: '주말 버킷리스트',
        invite_token: 'token-1',
      },
      error: null,
    });

    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });

    from.mockImplementation((table: string) => {
      if (table === 'shared_lists') {
        return { select };
      }

      throw new Error(`unexpected table: ${table}`);
    });

    const { loadSharedListByInviteToken } = await import('../src/lib/shared-list');

    await expect(loadSharedListByInviteToken('token-1')).resolves.toEqual({
      id: 'list-1',
      group_name: '주말 버킷리스트',
      invite_token: 'token-1',
    });
  });
});
```

- [ ] **Step 2: Run the unit test and verify it fails for the expected reason**

Run:
```bash
npm test -- tests/shared-list.test.ts
```

Expected: FAIL because `addSharedListItem` still accepts a plain title string and `loadSharedListByInviteToken` does not exist yet.

- [ ] **Step 3: Implement the minimal data-layer changes**

Update `src/lib/shared-list.ts` to define the optional item detail shape, expose created-at in the item type, and add invite-token lookup.

```ts
export type SharedListItem = {
  id: string;
  title: string;
  link_url: string | null;
  tags: string[] | null;
  created_at: string;
  completed_at: string | null;
};

export type NewSharedListItemInput = {
  title: string;
  linkUrl?: string;
  tags?: string[];
};

export async function loadSharedListByInviteToken(inviteToken: string) {
  await ensureSession();

  const { data, error } = await supabase
    .from('shared_lists')
    .select('id, group_name, invite_token')
    .eq('invite_token', inviteToken)
    .single();

  if (error || !data) {
    throw new Error('load-invite-failed');
  }

  return data as SharedListRecord;
}

export async function addSharedListItem(listId: string, input: NewSharedListItemInput) {
  await ensureSession();

  const { error } = await supabase.from('bucket_list_items').insert({
    shared_list_id: listId,
    title: input.title,
    link_url: input.linkUrl?.trim() || null,
    tags: input.tags?.length ? input.tags : null,
  });

  if (error) {
    throw new Error('create-item-failed');
  }
}
```

Also update `loadSharedList()` to select `link_url, tags, created_at`.

- [ ] **Step 4: Run the unit test and verify it passes**

Run:
```bash
npm test -- tests/shared-list.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/shared-list.test.ts src/lib/shared-list.ts
git commit -m "feat: extend shared list item data"
```

### Task 2: Add invite-token route and route-level coverage

**Files:**
- Create: `src/app/invite/[token]/page.tsx`
- Modify: `tests/e2e/supabase-flow.spec.ts`
- Test: `tests/e2e/share-and-delete.spec.ts`

- [ ] **Step 1: Write the failing E2E test for invite-link entry**

Create `tests/e2e/share-and-delete.spec.ts` with:

```ts
import { expect, test } from '@playwright/test';

test('user can enter a list through invite link', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);

  const inviteButton = page.getByRole('button', { name: '공유' });
  await inviteButton.click();
  await page.getByRole('button', { name: '초대 링크 복사' }).click();

  const invitePath = await page.evaluate(() => window.localStorage.getItem('lastCopiedInvitePath'));
  expect(invitePath).toBeTruthy();

  await page.goto(invitePath!);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();
});
```

- [ ] **Step 2: Run the invite-link E2E and verify it fails**

Run:
```bash
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: FAIL because the invite route and share UI do not exist yet.

- [ ] **Step 3: Implement the minimal invite route**

Create `src/app/invite/[token]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { loadSharedListByInviteToken } from '@/lib/shared-list';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await loadSharedListByInviteToken(token);

  redirect(`/list/${list.id}`);
}
```

- [ ] **Step 4: Re-run the invite-link E2E**

Run:
```bash
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: still FAIL, but now specifically because the share UI/copy flow is missing. That proves the route is wired.

- [ ] **Step 5: Commit**

```bash
git add src/app/invite/[token]/page.tsx tests/e2e/share-and-delete.spec.ts src/lib/shared-list.ts
git commit -m "feat: add invite link route"
```

### Task 3: Add share actions and copy feedback UI

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `tests/e2e/share-and-delete.spec.ts`

- [ ] **Step 1: Extend the failing E2E for share actions**

Make sure `tests/e2e/share-and-delete.spec.ts` checks for:

```ts
await page.getByRole('button', { name: '공유' }).click();
await expect(page.getByRole('button', { name: '현재 링크 복사' })).toBeVisible();
await expect(page.getByRole('button', { name: '초대 링크 복사' })).toBeVisible();
await page.getByRole('button', { name: '현재 링크 복사' }).click();
await expect(page.getByText('링크를 복사했어요')).toBeVisible();
```

- [ ] **Step 2: Run the share E2E and verify it fails**

Run:
```bash
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: FAIL because the share button/popover/toast are not in the list page.

- [ ] **Step 3: Implement minimal share UI in `src/components/local/shared-list-page.tsx`**

Add local UI state and copy helpers:

```tsx
const [shareOpen, setShareOpen] = useState(false);
const [toastMessage, setToastMessage] = useState('');

function showToast(message: string) {
  setToastMessage(message);
  window.setTimeout(() => setToastMessage(''), 2200);
}

async function copyCurrentLink() {
  const href = window.location.href;
  await navigator.clipboard.writeText(href);
  localStorage.setItem('lastCopiedCurrentPath', new URL(href).pathname);
  showToast('링크를 복사했어요');
  setShareOpen(false);
}

async function copyInviteLink(inviteToken: string) {
  const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
  await navigator.clipboard.writeText(inviteUrl);
  localStorage.setItem('lastCopiedInvitePath', `/invite/${inviteToken}`);
  showToast('초대 링크를 복사했어요');
  setShareOpen(false);
}
```

Render:

```tsx
<button type="button" onClick={() => setShareOpen((open) => !open)}>
  공유
</button>

{shareOpen ? (
  <div>
    <button type="button" onClick={() => void copyCurrentLink()}>
      현재 링크 복사
    </button>
    <button type="button" onClick={() => void copyInviteLink(listInviteToken)}>
      초대 링크 복사
    </button>
  </div>
) : null}

{toastMessage ? <div>{toastMessage}</div> : null}
```

Store the invite token from `loadSharedList()` in component state so the second action can use it.

- [ ] **Step 4: Re-run the share E2E and verify it passes**

Run:
```bash
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: PASS for share actions and invite entry.

- [ ] **Step 5: Commit**

```bash
git add src/components/local/shared-list-page.tsx tests/e2e/share-and-delete.spec.ts
git commit -m "feat: add shared list link actions"
```

### Task 4: Add optional item details and created-at display

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `tests/e2e/supabase-flow.spec.ts`
- Modify: `src/lib/shared-list.ts`

- [ ] **Step 1: Extend the failing Supabase E2E for optional details**

Update `tests/e2e/supabase-flow.spec.ts` to add:

```ts
await page.getByRole('button', { name: '상세설정' }).click();
await page.getByPlaceholder('주소를 붙여넣어도 돼요').fill('https://map.kakao.com/example');
await page.getByPlaceholder('태그를 쉼표로 나눠 적어보세요').fill('데이트, 산책');
await page.getByRole('button', { name: '항목 추가' }).click();

await expect(page.getByRole('link', { name: 'https://map.kakao.com/example' })).toBeVisible();
await expect(page.getByText('데이트')).toBeVisible();
await expect(page.getByText('산책')).toBeVisible();
await expect(page.getByText(/생성/)).toBeVisible();
```

- [ ] **Step 2: Run the Supabase E2E and verify it fails**

Run:
```bash
npm run test:e2e -- tests/e2e/supabase-flow.spec.ts
```

Expected: FAIL because the detail panel, optional fields, and created-at metadata are not rendered.

- [ ] **Step 3: Implement the minimal expandable detail form**

In `src/components/local/shared-list-page.tsx`, add state:

```tsx
const [detailOpen, setDetailOpen] = useState(false);
const [linkUrl, setLinkUrl] = useState('');
const [tagsText, setTagsText] = useState('');
```

Update submit logic:

```tsx
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
```

Render the expandable controls:

```tsx
<button type="button" onClick={() => setDetailOpen((open) => !open)}>
  상세설정
</button>

{detailOpen ? (
  <div>
    <input
      placeholder="주소를 붙여넣어도 돼요"
      value={linkUrl}
      onChange={(event) => setLinkUrl(event.target.value)}
    />
    <input
      placeholder="태그를 쉼표로 나눠 적어보세요"
      value={tagsText}
      onChange={(event) => setTagsText(event.target.value)}
    />
  </div>
) : null}
```

Render per-item metadata:

```tsx
{item.link_url ? (
  <a href={item.link_url} target="_blank" rel="noreferrer">
    {item.link_url}
  </a>
) : null}

{item.tags?.length ? (
  <div>
    {item.tags.map((tag) => (
      <span key={tag}>{tag}</span>
    ))}
  </div>
) : null}

<p>{formatCreatedAt(item.created_at)}</p>
```

Use a tiny local formatter rather than a new dependency.

- [ ] **Step 4: Re-run the Supabase E2E**

Run:
```bash
npm run test:e2e -- tests/e2e/supabase-flow.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/local/shared-list-page.tsx src/lib/shared-list.ts tests/e2e/supabase-flow.spec.ts
git commit -m "feat: add optional item details"
```

### Task 5: Add delete-with-undo for pending and completed items

**Files:**
- Modify: `src/lib/shared-list.ts`
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `tests/e2e/share-and-delete.spec.ts`
- Modify: `tests/shared-list.test.ts`

- [ ] **Step 1: Write the failing unit and E2E tests for delete/undo**

Add a unit test in `tests/shared-list.test.ts`:

```ts
it('deletes an item by id', async () => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const deleteFn = vi.fn().mockReturnValue({ eq });

  from.mockImplementation((table: string) => {
    if (table === 'bucket_list_items') {
      return { delete: deleteFn };
    }

    throw new Error(`unexpected table: ${table}`);
  });

  const { deleteSharedListItem } = await import('../src/lib/shared-list');

  await deleteSharedListItem('item-1');

  expect(deleteFn).toHaveBeenCalled();
  expect(eq).toHaveBeenCalledWith('id', 'item-1');
});
```

Extend `tests/e2e/share-and-delete.spec.ts`:

```ts
await page.getByPlaceholder('하고 싶은 일을 적어보세요').fill('한강 산책');
await page.getByRole('button', { name: '항목 추가' }).click();
await expect(page.getByText('한강 산책')).toBeVisible();

await page.getByRole('button', { name: '삭제', exact: true }).first().click();
await expect(page.getByText('항목을 삭제했어요')).toBeVisible();
await page.getByRole('button', { name: '되돌리기' }).click();
await expect(page.getByText('한강 산책')).toBeVisible();
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:
```bash
npm test -- tests/shared-list.test.ts
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: FAIL because delete helpers, delete buttons, and undo toast do not exist.

- [ ] **Step 3: Implement the minimal delete and undo flow**

In `src/lib/shared-list.ts` add:

```ts
export async function deleteSharedListItem(itemId: string) {
  await ensureSession();

  const { error } = await supabase.from('bucket_list_items').delete().eq('id', itemId);

  if (error) {
    throw new Error('delete-item-failed');
  }
}
```

In `src/components/local/shared-list-page.tsx`, keep a short-lived pending delete buffer:

```tsx
const [undoItem, setUndoItem] = useState<SharedListItem | null>(null);

function removeItemLocally(itemId: string) {
  setItems((current) => {
    const found = current.find((item) => item.id === itemId) ?? null;
    setUndoItem(found);
    return current.filter((item) => item.id !== itemId);
  });
}
```

Then:

```tsx
async function handleDelete(item: SharedListItem) {
  removeItemLocally(item.id);
  await deleteSharedListItem(item.id);
  showToast('항목을 삭제했어요');
}

function handleUndoDelete() {
  if (!undoItem) return;
  setItems((current) => [undoItem!, ...current]);
  setUndoItem(null);
  setToastMessage('');
}
```

Render a toast button:

```tsx
{toastMessage ? (
  <div>
    <span>{toastMessage}</span>
    {undoItem ? (
      <button type="button" onClick={handleUndoDelete}>
        되돌리기
      </button>
    ) : null}
  </div>
) : null}
```

This keeps the UI-level undo lightweight. If you want strict server restoration later, that can be a future change.

- [ ] **Step 4: Run the tests and verify they pass**

Run:
```bash
npm test -- tests/shared-list.test.ts
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared-list.ts src/components/local/shared-list-page.tsx tests/shared-list.test.ts tests/e2e/share-and-delete.spec.ts
git commit -m "feat: add item delete and undo"
```

### Task 6: Polish motion and PWA presentation

**Files:**
- Modify: `src/components/local/shared-list-page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `public/manifest.webmanifest`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Write the failing PWA/installability check**

Add a simple Playwright assertion to `tests/e2e/share-and-delete.spec.ts`:

```ts
await page.goto('/');
await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
```

- [ ] **Step 2: Run the E2E and verify the broader install UI is still missing**

Run:
```bash
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
```

Expected: any remaining failures should point at missing install affordance or unfinished UI polish.

- [ ] **Step 3: Implement the minimal PWA and motion polish**

Update `public/manifest.webmanifest`:

```json
{
  "name": "Wekitlist",
  "short_name": "Wekitlist",
  "description": "같이 쓰는 초경량 공유 버킷리스트",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Update `src/app/layout.tsx` metadata to include theme color and Apple-friendly viewport settings via Next metadata fields.

Add only small motion classes in `src/components/local/shared-list-page.tsx`, for example:

```tsx
className="transition-all duration-200 ease-out"
```

Use these on the share popover, detail panel, cards, and toast. Keep it local and dependency-free.

- [ ] **Step 4: Run the critical verification set**

Run:
```bash
npm test -- tests/shared-list.test.ts
npm run test:e2e -- tests/e2e/supabase-flow.spec.ts
npm run test:e2e -- tests/e2e/share-and-delete.spec.ts
npm run lint
npm run typecheck
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.webmanifest public/icon-192.png public/icon-512.png src/app/layout.tsx src/components/local/shared-list-page.tsx tests/e2e/share-and-delete.spec.ts tests/shared-list.test.ts
git commit -m "feat: polish shared list PWA experience"
```

---

## Spec Coverage Check
- Share actions: covered in Tasks 2 and 3
- Invite-token route: covered in Tasks 1 and 2
- Optional item details: covered in Tasks 1 and 4
- Created-at display: covered in Task 4
- Delete for pending/completed items: covered in Task 5
- Undo: covered in Task 5
- PWA/installability: covered in Task 6
- Motion polish: covered in Task 6

## Verification Notes
- Use the existing live Supabase-backed flow rather than adding new mocks beyond the data-layer tests.
- Keep all new UI copy in Korean to match the existing product surface.
- If strict server-side undo is later required, split that into a separate spec; this plan intentionally keeps undo lightweight so the feature can ship without introducing a recycle-bin subsystem.
