# Shared Bucket List MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, minimalist shared bucket list PWA where two people can join via invite link, add items with title/memo/date, complete or reopen items, and browse an archive of completed items.

**Architecture:** Use a Next.js App Router frontend deployed as a lightweight PWA, with Supabase for Postgres, auth, and server-side data access. Keep the product model intentionally small: one shared list, lightweight participants, and bucket list items with minimal metadata. Optimize for low-JS pages, server-first rendering, and small interactive islands only where the UI needs immediate response.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Tailwind CSS, Supabase, Vitest, Testing Library, Playwright, Vercel

---

## File Structure

### App Shell and Configuration
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

### Shared List Domain
- Create: `src/lib/env.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/invite.ts`
- Create: `src/lib/db/server.ts`
- Create: `src/lib/db/browser.ts`
- Create: `src/lib/db/mappers.ts`
- Create: `src/lib/actions/list-actions.ts`
- Create: `src/lib/actions/item-actions.ts`

### Routes and UI
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/app/list/[listId]/page.tsx`
- Create: `src/app/list/[listId]/loading.tsx`
- Create: `src/components/list/list-shell.tsx`
- Create: `src/components/list/list-header.tsx`
- Create: `src/components/list/item-list.tsx`
- Create: `src/components/list/item-row.tsx`
- Create: `src/components/list/completed-archive.tsx`
- Create: `src/components/list/empty-state.tsx`
- Create: `src/components/list/item-form-sheet.tsx`
- Create: `src/components/list/complete-toggle.tsx`
- Create: `src/components/list/reopen-button.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/date-input.tsx`

### Database and Test Coverage
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260512_initial_schema.sql`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/fixtures/list.ts`
- Create: `src/lib/invite.test.ts`
- Create: `src/lib/utils.test.ts`
- Create: `src/lib/actions/item-actions.test.ts`
- Create: `src/components/list/item-row.test.tsx`
- Create: `tests/e2e/home.spec.ts`
- Create: `tests/e2e/invite.spec.ts`

### Docs
- Modify: `docs/superpowers/specs/2026-05-12-shared-bucketlist-app-design.md` only if implementation decisions diverge
- Create: `README.md`

---

## Task 1: Bootstrap the Next.js PWA project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Write the failing smoke test for the landing page**

```tsx
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('landing page shows create list CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '같이 쓰는 버킷리스트' })).toBeVisible();
  await expect(page.getByRole('button', { name: '공유 리스트 만들기' })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails because the app does not exist yet**

Run: `pnpm exec playwright test tests/e2e/home.spec.ts --project=chromium`
Expected: FAIL with missing Next.js app or missing route

- [ ] **Step 3: Scaffold the project with the exact package manifest**

```json
{
  "name": "wekitlist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.8",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "next": "16.0.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tailwind-merge": "^3.3.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.0",
    "@tailwindcss/postcss": "^4.1.8",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.0.3",
    "@types/react": "^19.2.1",
    "@types/react-dom": "^19.2.1",
    "eslint": "^9.28.0",
    "eslint-config-next": "16.0.0",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.1.8",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: Add base config files**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

```js
// eslint.config.mjs
import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [...nextVitals];

export default config;
```

```gitignore
node_modules
.next
playwright-report
coverage
.env.local
.env
.DS_Store
```

- [ ] **Step 5: Add the initial app shell**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wekitlist',
  description: '같이 쓰는 초경량 공유 버킷리스트',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-neutral-500">Wekitlist</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        같이 쓰는 버킷리스트
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600">
        커플이나 친구가 빠르게 함께 기록하고 완료하는 초경량 공유 리스트.
      </p>
      <button className="mt-10 h-12 rounded-full bg-neutral-950 px-5 text-sm font-medium text-white">
        공유 리스트 만들기
      </button>
    </main>
  );
}
```

```css
/* src/app/globals.css */
@import 'tailwindcss';

:root {
  color-scheme: light;
}

html {
  background: #ffffff;
}

body {
  margin: 0;
  background: #ffffff;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 6: Create environment examples for the stack**

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Install dependencies**

Run: `pnpm install`
Expected: dependencies installed and `pnpm-lock.yaml` created

- [ ] **Step 8: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 9: Run the landing page e2e test**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs .gitignore .env.example src/app tests/e2e/home.spec.ts
git commit -m "feat: bootstrap next app shell"
```

---

## Task 2: Add a minimal design system and reusable UI primitives

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/date-input.tsx`
- Modify: `src/app/globals.css`
- Test: `src/lib/utils.test.ts`

- [ ] **Step 1: Write the failing utility test for class merging**

```ts
// src/lib/utils.test.ts
import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges utility classes deterministically', () => {
    expect(cn('px-3', false && 'hidden', 'px-4')).toBe('px-4');
  });
});
```

- [ ] **Step 2: Run the unit test to verify failure**

Run: `pnpm vitest run src/lib/utils.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement the utility function**

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Add reusable UI primitives**

```tsx
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors',
          variant === 'primary' && 'bg-neutral-950 text-white',
          variant === 'secondary' && 'bg-neutral-100 text-neutral-950',
          variant === 'ghost' && 'bg-transparent text-neutral-700',
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
```

```tsx
// src/components/ui/input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
```

```tsx
// src/components/ui/textarea.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-32 w-full rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
```

```tsx
// src/components/ui/date-input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const DateInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'date', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none focus:border-neutral-400',
        className,
      )}
      {...props}
    />
  ),
);

DateInput.displayName = 'DateInput';
```

- [ ] **Step 5: Extend global styles for the Apple-like minimal baseline**

```css
/* append to src/app/globals.css */
button,
input,
textarea {
  font: inherit;
}

::selection {
  background: #111111;
  color: #ffffff;
}
```

- [ ] **Step 6: Run unit test, lint, and typecheck**

Run: `pnpm vitest run src/lib/utils.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts src/components/ui src/app/globals.css
git commit -m "feat: add minimal ui primitives"
```

---

## Task 3: Define the database schema and Supabase access layer

**Files:**
- Create: `supabase/migrations/20260512_initial_schema.sql`
- Create: `supabase/config.toml`
- Create: `src/lib/types.ts`
- Create: `src/lib/db/server.ts`
- Create: `src/lib/db/browser.ts`
- Create: `src/lib/db/mappers.ts`
- Test: `src/lib/actions/item-actions.test.ts`

- [ ] **Step 1: Write the failing mapper test for item records**

```ts
// src/lib/actions/item-actions.test.ts
import { describe, expect, it } from 'vitest';
import { mapItemRow } from '@/lib/db/mappers';

describe('mapItemRow', () => {
  it('maps nullable completion fields correctly', () => {
    const item = mapItemRow({
      id: 'item-1',
      shared_list_id: 'list-1',
      title: '야경 보기',
      memo: null,
      target_date: '2026-05-12',
      created_at: '2026-05-12T00:00:00.000Z',
      updated_at: '2026-05-12T00:00:00.000Z',
      completed_at: null,
      created_by: 'user-1',
      completed_by: null,
    });

    expect(item.completedAt).toBeNull();
    expect(item.title).toBe('야경 보기');
  });
});
```

- [ ] **Step 2: Run the mapper test to verify failure**

Run: `pnpm vitest run src/lib/actions/item-actions.test.ts`
Expected: FAIL with missing mapper module

- [ ] **Step 3: Create the database schema migration**

```sql
-- supabase/migrations/20260512_initial_schema.sql
create extension if not exists pgcrypto;

create table shared_lists (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  invite_token text not null unique,
  created_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  shared_list_id uuid not null references shared_lists(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now()
);

create table bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  shared_list_id uuid not null references shared_lists(id) on delete cascade,
  title text not null,
  memo text,
  target_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references participants(id) on delete set null,
  completed_by uuid references participants(id) on delete set null
);

create index bucket_list_items_shared_list_id_idx on bucket_list_items (shared_list_id);
create index bucket_list_items_incomplete_idx on bucket_list_items (shared_list_id, completed_at, created_at desc);
```

- [ ] **Step 4: Define application types and mappers**

```ts
// src/lib/types.ts
export type SharedList = {
  id: string;
  groupName: string;
  inviteToken: string;
  createdAt: string;
};

export type Participant = {
  id: string;
  sharedListId: string;
  displayName: string;
  joinedAt: string;
};

export type BucketListItem = {
  id: string;
  sharedListId: string;
  title: string;
  memo: string | null;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  createdBy: string | null;
  completedBy: string | null;
};
```

```ts
// src/lib/db/mappers.ts
import type { BucketListItem } from '@/lib/types';

type ItemRow = {
  id: string;
  shared_list_id: string;
  title: string;
  memo: string | null;
  target_date: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  created_by: string | null;
  completed_by: string | null;
};

export function mapItemRow(row: ItemRow): BucketListItem {
  return {
    id: row.id,
    sharedListId: row.shared_list_id,
    title: row.title,
    memo: row.memo,
    targetDate: row.target_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    completedBy: row.completed_by,
  };
}
```

- [ ] **Step 5: Create Supabase clients**

```ts
// src/lib/db/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
```

```ts
// src/lib/db/browser.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6: Run tests and local Supabase migration**

Run: `pnpm vitest run src/lib/actions/item-actions.test.ts && supabase db reset`
Expected: PASS for test, then local Supabase reset with schema applied

- [ ] **Step 7: Commit**

```bash
git add supabase src/lib/types.ts src/lib/db src/lib/actions/item-actions.test.ts
git commit -m "feat: add shared list schema"
```

---

## Task 4: Implement invite token generation and list creation

**Files:**
- Create: `src/lib/invite.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/actions/list-actions.ts`
- Create: `src/lib/invite.test.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing token generation test**

```ts
// src/lib/invite.test.ts
import { describe, expect, it } from 'vitest';
import { createInviteToken } from './invite';

describe('createInviteToken', () => {
  it('returns a url-safe short token', () => {
    const token = createInviteToken();
    expect(token).toMatch(/^[a-zA-Z0-9_-]{16,}$/);
  });
});
```

- [ ] **Step 2: Run the token test to verify failure**

Run: `pnpm vitest run src/lib/invite.test.ts`
Expected: FAIL with missing invite module

- [ ] **Step 3: Implement token and env helpers**

```ts
// src/lib/invite.ts
export function createInviteToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}
```

```ts
// src/lib/env.ts
import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = serverEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
```

- [ ] **Step 4: Implement list creation server action**

```ts
// src/lib/actions/list-actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/db/server';
import { createInviteToken } from '@/lib/invite';

export async function createSharedList(formData: FormData) {
  const groupName = String(formData.get('groupName') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (!groupName || !displayName) {
    return { error: '그룹명과 이름을 입력해주세요.' };
  }

  const supabase = await createSupabaseServerClient();
  const inviteToken = createInviteToken();

  const { data: list, error: listError } = await supabase
    .from('shared_lists')
    .insert({ group_name: groupName, invite_token: inviteToken })
    .select('id')
    .single();

  if (listError || !list) {
    return { error: '리스트를 만드는 데 실패했어요. 다시 시도해주세요.' };
  }

  await supabase.from('participants').insert({
    shared_list_id: list.id,
    display_name: displayName,
  });

  redirect(`/list/${list.id}`);
}
```

- [ ] **Step 5: Wire the landing page form**

```tsx
// replace src/app/page.tsx
import { createSharedList } from '@/lib/actions/list-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-neutral-500">Wekitlist</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        같이 쓰는 버킷리스트
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600">
        커플이나 친구가 빠르게 함께 기록하고 완료하는 초경량 공유 리스트.
      </p>

      <form action={createSharedList} className="mt-10 space-y-3">
        <Input name="groupName" placeholder="우리 리스트 이름" required />
        <Input name="displayName" placeholder="내 이름" required />
        <Button className="w-full" type="submit">
          공유 리스트 만들기
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Run tests, lint, and typecheck**

Run: `pnpm vitest run src/lib/invite.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/invite.ts src/lib/invite.test.ts src/lib/env.ts src/lib/actions/list-actions.ts src/app/page.tsx
git commit -m "feat: add shared list creation"
```

---

## Task 5: Implement invite join flow and list page data loading

**Files:**
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/app/list/[listId]/page.tsx`
- Create: `src/app/list/[listId]/loading.tsx`
- Create: `src/components/list/list-shell.tsx`
- Create: `src/components/list/list-header.tsx`
- Create: `src/test/fixtures/list.ts`
- Test: `tests/e2e/invite.spec.ts`

- [ ] **Step 1: Write the failing e2e test for invite flow**

```ts
// tests/e2e/invite.spec.ts
import { test, expect } from '@playwright/test';

test('invite page lets the user join a shared list', async ({ page }) => {
  await page.goto('/invite/demo-token');
  await expect(page.getByRole('heading', { name: '리스트에 참여하기' })).toBeVisible();
  await expect(page.getByPlaceholder('내 이름')).toBeVisible();
});
```

- [ ] **Step 2: Run the invite e2e test to verify failure**

Run: `pnpm test:e2e tests/e2e/invite.spec.ts`
Expected: FAIL with missing route

- [ ] **Step 3: Create the list layout components**

```tsx
// src/components/list/list-header.tsx
export function ListHeader({ groupName }: { groupName: string }) {
  return (
    <header className="sticky top-0 z-10 bg-white/90 pb-4 pt-2 backdrop-blur-sm">
      <p className="text-sm text-neutral-500">Shared list</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{groupName}</h1>
    </header>
  );
}
```

```tsx
// src/components/list/list-shell.tsx
import type { BucketListItem } from '@/lib/types';
import { ListHeader } from './list-header';

export function ListShell({
  groupName,
  pendingItems,
  completedItems,
}: {
  groupName: string;
  pendingItems: BucketListItem[];
  completedItems: BucketListItem[];
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-6">
      <ListHeader groupName={groupName} />
      <section className="mt-8">
        <h2 className="text-sm text-neutral-500">해야 할 항목</h2>
        <p className="mt-2 text-sm text-neutral-600">{pendingItems.length}개의 항목</p>
      </section>
      <section className="mt-10">
        <h2 className="text-sm text-neutral-500">완료됨</h2>
        <p className="mt-2 text-sm text-neutral-600">{completedItems.length}개의 항목</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Implement the invite and list routes**

```tsx
// src/app/invite/[token]/page.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function InvitePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">리스트에 참여하기</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">이름만 입력하면 바로 함께 시작할 수 있어요.</p>
      <form className="mt-8 space-y-3">
        <Input name="displayName" placeholder="내 이름" required />
        <Button className="w-full" type="submit">참여하기</Button>
      </form>
    </main>
  );
}
```

```tsx
// src/app/list/[listId]/page.tsx
import { ListShell } from '@/components/list/list-shell';

export default function SharedListPage() {
  return <ListShell groupName="우리 버킷리스트" pendingItems={[]} completedItems={[]} />;
}
```

```tsx
// src/app/list/[listId]/loading.tsx
export default function Loading() {
  return <div className="mx-auto min-h-screen w-full max-w-xl px-6 py-6 text-sm text-neutral-500">불러오는 중...</div>;
}
```

- [ ] **Step 5: Run the invite e2e test**

Run: `pnpm test:e2e tests/e2e/invite.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/invite src/app/list src/components/list tests/e2e/invite.spec.ts
git commit -m "feat: add invite and shared list routes"
```

---

## Task 6: Implement item creation, list rendering, and empty state

**Files:**
- Create: `src/components/list/item-list.tsx`
- Create: `src/components/list/item-row.tsx`
- Create: `src/components/list/empty-state.tsx`
- Create: `src/components/list/item-form-sheet.tsx`
- Modify: `src/components/list/list-shell.tsx`
- Modify: `src/lib/actions/item-actions.ts`
- Test: `src/components/list/item-row.test.tsx`

- [ ] **Step 1: Write the failing component test for item rendering**

```tsx
// src/components/list/item-row.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemRow } from './item-row';

describe('ItemRow', () => {
  it('shows title and formatted target date', () => {
    render(
      <ItemRow
        item={{
          id: 'item-1',
          sharedListId: 'list-1',
          title: '전시회 가기',
          memo: '카카오맵 링크',
          targetDate: '2026-05-12',
          createdAt: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
          completedAt: null,
          createdBy: null,
          completedBy: null,
        }}
      />,
    );

    expect(screen.getByText('전시회 가기')).toBeInTheDocument();
    expect(screen.getByText('2026. 5. 12.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test to verify failure**

Run: `pnpm vitest run src/components/list/item-row.test.tsx`
Expected: FAIL with missing component

- [ ] **Step 3: Implement item action for creation**

```ts
// src/lib/actions/item-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/db/server';

export async function createItem(formData: FormData) {
  const sharedListId = String(formData.get('sharedListId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const memo = String(formData.get('memo') ?? '').trim();
  const targetDate = String(formData.get('targetDate') ?? '').trim();

  if (!sharedListId || !title || !targetDate) {
    return { error: '항목을 저장하지 못했어요. 다시 확인해주세요.' };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('bucket_list_items').insert({
    shared_list_id: sharedListId,
    title,
    memo: memo || null,
    target_date: targetDate,
  });

  if (error) {
    return { error: '항목을 저장하지 못했어요. 다시 시도해주세요.' };
  }

  revalidatePath(`/list/${sharedListId}`);
  return { ok: true };
}
```

- [ ] **Step 4: Build the item UI components**

```tsx
// src/components/list/empty-state.tsx
export function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-200 px-5 py-8 text-sm leading-6 text-neutral-500">
      아직 항목이 없어요. 첫 버킷리스트를 바로 추가해보세요.
    </div>
  );
}
```

```tsx
// src/components/list/item-row.tsx
import type { BucketListItem } from '@/lib/types';

export function ItemRow({ item }: { item: BucketListItem }) {
  const formattedDate = new Intl.DateTimeFormat('ko-KR').format(new Date(item.targetDate));

  return (
    <article className="rounded-3xl border border-neutral-200 px-4 py-4">
      <h3 className="text-base font-medium text-neutral-950">{item.title}</h3>
      <p className="mt-2 text-sm text-neutral-500">{formattedDate}</p>
      {item.memo ? <p className="mt-3 text-sm leading-6 text-neutral-600">{item.memo}</p> : null}
    </article>
  );
}
```

```tsx
// src/components/list/item-list.tsx
import type { BucketListItem } from '@/lib/types';
import { EmptyState } from './empty-state';
import { ItemRow } from './item-row';

export function ItemList({ items }: { items: BucketListItem[] }) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}
```

```tsx
// src/components/list/item-form-sheet.tsx
import { createItem } from '@/lib/actions/item-actions';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ItemFormSheet({ sharedListId, defaultDate }: { sharedListId: string; defaultDate: string }) {
  return (
    <form action={createItem} className="mt-8 space-y-3 rounded-[2rem] border border-neutral-200 p-4">
      <input name="sharedListId" type="hidden" value={sharedListId} />
      <Input name="title" placeholder="하고 싶은 일을 적어보세요" required />
      <Textarea name="memo" placeholder="메모나 장소 링크를 남겨도 좋아요" />
      <DateInput name="targetDate" defaultValue={defaultDate} required />
      <Button className="w-full" type="submit">항목 추가</Button>
    </form>
  );
}
```

- [ ] **Step 5: Render the form and item list in the shell**

```tsx
// replace src/components/list/list-shell.tsx
import type { BucketListItem } from '@/lib/types';
import { ItemFormSheet } from './item-form-sheet';
import { ItemList } from './item-list';
import { ListHeader } from './list-header';

export function ListShell({
  listId,
  groupName,
  pendingItems,
  completedItems,
}: {
  listId: string;
  groupName: string;
  pendingItems: BucketListItem[];
  completedItems: BucketListItem[];
}) {
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-6">
      <ListHeader groupName={groupName} />
      <ItemFormSheet sharedListId={listId} defaultDate={defaultDate} />
      <section className="mt-8">
        <h2 className="mb-3 text-sm text-neutral-500">해야 할 항목</h2>
        <ItemList items={pendingItems} />
      </section>
      <section className="mt-10">
        <h2 className="mb-3 text-sm text-neutral-500">완료됨</h2>
        <ItemList items={completedItems} />
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run component test, lint, and typecheck**

Run: `pnpm vitest run src/components/list/item-row.test.tsx && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/item-actions.ts src/components/list src/components/list/item-row.test.tsx
git commit -m "feat: add bucket list item creation"
```

---

## Task 7: Implement complete, reopen, and completed archive behavior

**Files:**
- Create: `src/components/list/complete-toggle.tsx`
- Create: `src/components/list/reopen-button.tsx`
- Create: `src/components/list/completed-archive.tsx`
- Modify: `src/lib/actions/item-actions.ts`
- Modify: `src/components/list/item-row.tsx`
- Modify: `src/components/list/list-shell.tsx`

- [ ] **Step 1: Write the failing action test for completion mapping**

```ts
// append to src/lib/actions/item-actions.test.ts
it('maps completed items with completion timestamp', () => {
  const item = mapItemRow({
    id: 'item-1',
    shared_list_id: 'list-1',
    title: '드라이브 가기',
    memo: null,
    target_date: '2026-05-12',
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:00.000Z',
    completed_at: '2026-05-13T00:00:00.000Z',
    created_by: null,
    completed_by: 'user-2',
  });

  expect(item.completedAt).toBe('2026-05-13T00:00:00.000Z');
});
```

- [ ] **Step 2: Run the test to verify current behavior still needs completion UI work**

Run: `pnpm vitest run src/lib/actions/item-actions.test.ts src/components/list/item-row.test.tsx`
Expected: FAIL on missing completion controls in UI coverage after next step test is added

- [ ] **Step 3: Extend the item row test for complete state**

```tsx
// append to src/components/list/item-row.test.tsx
it('shows completed date when item is complete', () => {
  render(
    <ItemRow
      item={{
        id: 'item-2',
        sharedListId: 'list-1',
        title: '한강 산책',
        memo: null,
        targetDate: '2026-05-12',
        createdAt: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-12T00:00:00.000Z',
        completedAt: '2026-05-13T00:00:00.000Z',
        createdBy: null,
        completedBy: null,
      }}
    />,
  );

  expect(screen.getByText('완료일 2026. 5. 13.')).toBeInTheDocument();
});
```

- [ ] **Step 4: Implement complete and reopen actions**

```ts
// append to src/lib/actions/item-actions.ts
export async function completeItem(formData: FormData) {
  const itemId = String(formData.get('itemId') ?? '');
  const sharedListId = String(formData.get('sharedListId') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('bucket_list_items')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    return { error: '완료 처리에 실패했어요.' };
  }

  revalidatePath(`/list/${sharedListId}`);
  return { ok: true };
}

export async function reopenItem(formData: FormData) {
  const itemId = String(formData.get('itemId') ?? '');
  const sharedListId = String(formData.get('sharedListId') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('bucket_list_items')
    .update({ completed_at: null })
    .eq('id', itemId);

  if (error) {
    return { error: '다시 열기에 실패했어요.' };
  }

  revalidatePath(`/list/${sharedListId}`);
  return { ok: true };
}
```

- [ ] **Step 5: Add completion UI controls**

```tsx
// src/components/list/complete-toggle.tsx
import { completeItem } from '@/lib/actions/item-actions';

export function CompleteToggle({ itemId, sharedListId }: { itemId: string; sharedListId: string }) {
  return (
    <form action={completeItem}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="sharedListId" value={sharedListId} />
      <button className="h-8 rounded-full border border-neutral-200 px-3 text-xs text-neutral-700" type="submit">
        완료
      </button>
    </form>
  );
}
```

```tsx
// src/components/list/reopen-button.tsx
import { reopenItem } from '@/lib/actions/item-actions';

export function ReopenButton({ itemId, sharedListId }: { itemId: string; sharedListId: string }) {
  return (
    <form action={reopenItem}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="sharedListId" value={sharedListId} />
      <button className="h-8 rounded-full border border-neutral-200 px-3 text-xs text-neutral-700" type="submit">
        다시 열기
      </button>
    </form>
  );
}
```

```tsx
// replace src/components/list/item-row.tsx
import type { BucketListItem } from '@/lib/types';
import { CompleteToggle } from './complete-toggle';
import { ReopenButton } from './reopen-button';

export function ItemRow({ item }: { item: BucketListItem }) {
  const formattedTargetDate = new Intl.DateTimeFormat('ko-KR').format(new Date(item.targetDate));
  const formattedCompletedDate = item.completedAt
    ? new Intl.DateTimeFormat('ko-KR').format(new Date(item.completedAt))
    : null;

  return (
    <article className="rounded-3xl border border-neutral-200 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-neutral-950">{item.title}</h3>
          <p className="mt-2 text-sm text-neutral-500">{formattedTargetDate}</p>
          {formattedCompletedDate ? (
            <p className="mt-2 text-sm text-neutral-500">완료일 {formattedCompletedDate}</p>
          ) : null}
        </div>
        {item.completedAt ? (
          <ReopenButton itemId={item.id} sharedListId={item.sharedListId} />
        ) : (
          <CompleteToggle itemId={item.id} sharedListId={item.sharedListId} />
        )}
      </div>
      {item.memo ? <p className="mt-3 text-sm leading-6 text-neutral-600">{item.memo}</p> : null}
    </article>
  );
}
```

```tsx
// src/components/list/completed-archive.tsx
import type { BucketListItem } from '@/lib/types';
import { ItemList } from './item-list';

export function CompletedArchive({ items }: { items: BucketListItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm text-neutral-500">완료됨</h2>
      <ItemList items={items} />
    </section>
  );
}
```

- [ ] **Step 6: Update the shell to use the archive component**

```tsx
// replace bottom section in src/components/list/list-shell.tsx
import { CompletedArchive } from './completed-archive';

// inside component return
<section className="mt-8">
  <h2 className="mb-3 text-sm text-neutral-500">해야 할 항목</h2>
  <ItemList items={pendingItems} />
</section>
<CompletedArchive items={completedItems} />
```

- [ ] **Step 7: Run tests, lint, and typecheck**

Run: `pnpm vitest run src/lib/actions/item-actions.test.ts src/components/list/item-row.test.tsx && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/actions/item-actions.ts src/components/list src/lib/actions/item-actions.test.ts src/components/list/item-row.test.tsx
git commit -m "feat: add complete and reopen flows"
```

---

## Task 8: Load live data on the list route and sort it correctly

**Files:**
- Modify: `src/app/list/[listId]/page.tsx`
- Modify: `src/components/list/list-shell.tsx`
- Modify: `src/lib/db/mappers.ts`

- [ ] **Step 1: Write the failing data-loading assertion in e2e**

```ts
// append to tests/e2e/home.spec.ts
test('shared list page shows pending section before completed section', async ({ page }) => {
  await page.goto('/list/demo-list');
  await expect(page.getByText('해야 할 항목')).toBeVisible();
  await expect(page.getByText('완료됨')).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test to verify failure against static route state**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: FAIL because completed section is conditionally absent or list route does not load proper data

- [ ] **Step 3: Implement the list route query logic**

```tsx
// replace src/app/list/[listId]/page.tsx
import { notFound } from 'next/navigation';
import { ListShell } from '@/components/list/list-shell';
import { createSupabaseServerClient } from '@/lib/db/server';
import { mapItemRow } from '@/lib/db/mappers';

export default async function SharedListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: list }, { data: items }] = await Promise.all([
    supabase.from('shared_lists').select('id, group_name').eq('id', listId).single(),
    supabase
      .from('bucket_list_items')
      .select('id, shared_list_id, title, memo, target_date, created_at, updated_at, completed_at, created_by, completed_by')
      .eq('shared_list_id', listId)
      .order('created_at', { ascending: false }),
  ]);

  if (!list) {
    notFound();
  }

  const mappedItems = (items ?? []).map(mapItemRow);
  const pendingItems = mappedItems.filter((item) => item.completedAt === null);
  const completedItems = mappedItems.filter((item) => item.completedAt !== null);

  return (
    <ListShell
      listId={list.id}
      groupName={list.group_name}
      pendingItems={pendingItems}
      completedItems={completedItems}
    />
  );
}
```

- [ ] **Step 4: Keep the completed heading visible even when empty**

```tsx
// replace src/components/list/completed-archive.tsx
import type { BucketListItem } from '@/lib/types';
import { ItemList } from './item-list';

export function CompletedArchive({ items }: { items: BucketListItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm text-neutral-500">완료됨</h2>
      <ItemList items={items} />
    </section>
  );
}
```

- [ ] **Step 5: Run e2e, typecheck, and lint**

Run: `pnpm test:e2e tests/e2e/home.spec.ts && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/list/[listId]/page.tsx src/components/list/completed-archive.tsx tests/e2e/home.spec.ts
git commit -m "feat: load and sort shared list data"
```

---

## Task 9: Add PWA metadata, README, and final verification

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `README.md`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing smoke check for manifest presence**

```ts
// append to tests/e2e/home.spec.ts
test('landing page exposes install metadata', async ({ page }) => {
  await page.goto('/');
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBe('/manifest.webmanifest');
});
```

- [ ] **Step 2: Run the smoke check to verify current failure**

Run: `pnpm test:e2e tests/e2e/home.spec.ts --grep "install metadata"`
Expected: FAIL if manifest file is missing

- [ ] **Step 3: Add the web app manifest and final metadata**

```json
// public/manifest.webmanifest
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
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```tsx
// ensure in src/app/layout.tsx metadata
export const metadata: Metadata = {
  title: 'Wekitlist',
  description: '같이 쓰는 초경량 공유 버킷리스트',
  manifest: '/manifest.webmanifest',
};
```

- [ ] **Step 4: Add a concise project README**

```md
# Wekitlist

같이 쓰는 초경량 공유 버킷리스트 앱.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

## Local Development
```bash
pnpm install
pnpm dev
```

## Environment
Copy `.env.example` to `.env.local` and fill in the Supabase keys.

## Test
```bash
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
```
```

- [ ] **Step 5: Run the full verification suite**

Run: `pnpm test && pnpm test:e2e && pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add public/manifest.webmanifest src/app/layout.tsx README.md tests/e2e/home.spec.ts
git commit -m "feat: finalize pwa shell"
```

---

## Spec Coverage Check
- Shared list creation: covered in Task 4
- Invite-link join flow: covered in Task 5
- Group name support: covered in Tasks 4 and 8
- Title, memo, date fields with date default: covered in Task 6
- Completed date recording and reopen flow: covered in Task 7
- Pending-first home sorting: covered in Task 8
- Completed archive separation: covered in Tasks 7 and 8
- Minimal PWA delivery: covered in Tasks 1 and 9
- No notifications, comments, images, multi-list complexity: intentionally omitted from tasks

## Placeholder Scan
- No `TODO`, `TBD`, or deferred code markers remain in this plan.
- Each code step names exact files and concrete code.
- Each test step includes an exact command and expected result.

## Type Consistency Check
- Domain naming is consistent across tasks: `SharedList`, `Participant`, `BucketListItem`
- Field naming is consistent across tasks: `groupName`, `sharedListId`, `targetDate`, `completedAt`
- Action naming is consistent across tasks: `createSharedList`, `createItem`, `completeItem`, `reopenItem`

## Notes Before Execution
- Keep `.omc/` untracked.
- Do not add extra product features while scaffolding.
- Prefer server components by default and use client components only for truly interactive controls.
- If Supabase local tooling is unavailable, install and authenticate it before Task 3 instead of changing the architecture.
