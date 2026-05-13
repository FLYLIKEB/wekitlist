'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSharedList } from '@/lib/shared-list';

export function LocalApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groupName, setGroupName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { entryContext, redirectTarget } = useMemo(() => {
    if (typeof window === 'undefined') {
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
  }, [searchParams]);

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  if (redirectTarget) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      </main>
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim() || !displayName.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const name = displayName.trim();
      const list = await createSharedList(groupName.trim(), name);
      router.push(`/list/${list.id}?as=${encodeURIComponent(name)}`);
    } catch {
      setError('리스트를 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

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
            <span aria-hidden className="inline-flex h-2.5 w-2.5 rounded-full bg-neutral-900" />
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
          <button className="mt-4 h-14 w-full rounded-full bg-neutral-950 px-5 text-sm font-medium text-white" type="submit" disabled={submitting}>
            {submitting ? '만드는 중...' : '새 리스트 만들기'}
          </button>
        </form>
      </div>
    </main>
  );
}
