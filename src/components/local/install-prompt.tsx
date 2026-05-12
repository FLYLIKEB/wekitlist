'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_STORAGE_KEY = 'installPromptDismissedAt';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const APPEAR_DELAY_MS = 400;

function wasRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const appearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;

      if (wasRecentlyDismissed()) return;

      if (appearTimerRef.current !== null) {
        window.clearTimeout(appearTimerRef.current);
      }

      appearTimerRef.current = window.setTimeout(() => {
        setVisible(true);
        window.requestAnimationFrame(() => setEntered(true));
        appearTimerRef.current = null;
      }, APPEAR_DELAY_MS);
    }

    function handleInstalled() {
      promptEventRef.current = null;
      setEntered(false);
      setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      if (appearTimerRef.current !== null) {
        window.clearTimeout(appearTimerRef.current);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    const event = promptEventRef.current;
    if (!event) return;
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // ignore
    } finally {
      promptEventRef.current = null;
      setEntered(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setEntered(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="앱 설치 안내"
      className="pointer-events-auto fixed bottom-5 left-1/2 z-30 flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl ring-1 ring-neutral-200 backdrop-blur-md will-change-transform ease-out-soft transition-[opacity,transform] duration-500"
      style={{
        transform: `translateX(-50%) translateY(${entered ? '0' : '0.75rem'})`,
        opacity: entered ? 1 : 0,
      }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white">
        <Download className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-950">Wekitlist를 앱처럼 사용</p>
        <p className="text-xs text-neutral-500">홈 화면에 추가하고 빠르게 열어보세요.</p>
      </div>
      <button
        type="button"
        className="h-8 shrink-0 rounded-full bg-neutral-950 px-3 text-xs font-medium text-white ease-out-soft transition-transform duration-200 hover:scale-[1.03]"
        onClick={() => void handleInstall()}
      >
        앱으로 설치
      </button>
      <button
        type="button"
        aria-label="설치 안내 닫기"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 ease-out-soft transition-colors duration-200 hover:bg-neutral-200 hover:text-neutral-800"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
