'use client';

import { Download, Plus, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

const DISMISS_STORAGE_KEY = 'installPromptDismissedAt';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const APPEAR_DELAY_MS = 600;
const OPEN_EVENT = 'wekitlist:open-install-prompt';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent;

  if (/android/i.test(ua)) return 'android';

  // iPadOS 13+ reports as Mac with touch points.
  const isIpadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/i.test(ua) || isIpadOs) return 'ios';

  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

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

function isAutomation(): boolean {
  if (typeof window === 'undefined') return false;
  return window.navigator.webdriver === true;
}

export function openInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [platform] = useState<Platform>(() => detectPlatform());
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const appearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function show() {
      if (isAutomation()) return;
      if (appearTimerRef.current !== null) {
        window.clearTimeout(appearTimerRef.current);
      }
      setVisible(true);
      window.requestAnimationFrame(() => setEntered(true));
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      if (wasRecentlyDismissed() || isStandalone()) return;
      appearTimerRef.current = window.setTimeout(show, APPEAR_DELAY_MS);
    }

    function handleInstalled() {
      setPromptEvent(null);
      setEntered(false);
      setVisible(false);
    }

    function handleManualOpen() {
      if (isStandalone() || isAutomation()) return;
      try {
        window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      } catch {
        // ignore
      }
      show();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener(OPEN_EVENT, handleManualOpen);

    // For iOS/desktop without beforeinstallprompt, surface the manual guide
    // on first visit too.
    const currentPlatform = detectPlatform();
    if (
      (currentPlatform === 'ios' || currentPlatform === 'desktop') &&
      !wasRecentlyDismissed() &&
      !isStandalone()
    ) {
      appearTimerRef.current = window.setTimeout(show, APPEAR_DELAY_MS);
    }

    return () => {
      if (appearTimerRef.current !== null) {
        window.clearTimeout(appearTimerRef.current);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener(OPEN_EVENT, handleManualOpen);
    };
  }, []);

  async function handleAndroidInstall() {
    const event = promptEvent;
    if (!event) return;
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // ignore
    } finally {
      setPromptEvent(null);
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

  const canDirectInstall = platform === 'android' && promptEvent !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="앱 설치 안내"
      className="fixed inset-0 z-40 flex items-end justify-center bg-neutral-950/30 px-4 pb-6 pt-12 backdrop-blur-sm transition-opacity duration-300 sm:items-center sm:pb-12"
      style={{ opacity: entered ? 1 : 0 }}
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-neutral-200 ease-out-soft transition-transform duration-300"
        style={{ transform: `translateY(${entered ? '0' : '1rem'})` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <Smartphone className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-950">앱처럼 사용하기</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              홈 화면에 추가하면 알림창처럼 빠르게 열 수 있어요.
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5">
          {platform === 'android' ? (
            <AndroidGuide canDirectInstall={canDirectInstall} onInstall={handleAndroidInstall} />
          ) : platform === 'ios' ? (
            <IosGuide />
          ) : (
            <DesktopGuide />
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-700">
        {index}
      </span>
      <span className="text-sm leading-6 text-neutral-700">{children}</span>
    </li>
  );
}

function IconChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 align-middle text-[12px] font-medium text-neutral-800">
      {icon}
      {label}
    </span>
  );
}

function AndroidGuide({
  canDirectInstall,
  onInstall,
}: {
  canDirectInstall: boolean;
  onInstall: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">Android · Chrome</p>
      {canDirectInstall ? (
        <>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            아래 버튼을 누르면 바로 설치할 수 있어요.
          </p>
          <button
            type="button"
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 text-sm font-medium text-white transition hover:scale-[1.01]"
            onClick={onInstall}
          >
            <Download className="h-4 w-4" strokeWidth={2.2} />
            앱으로 설치
          </button>
        </>
      ) : (
        <ol className="mt-3 space-y-2">
          <Step index={1}>
            주소창 옆 <IconChip icon={<span>⋮</span>} label="메뉴" /> 를 누르세요.
          </Step>
          <Step index={2}>
            <strong className="font-semibold">앱 설치</strong> 또는 <strong className="font-semibold">홈 화면에 추가</strong>를 선택하세요.
          </Step>
        </ol>
      )}
    </div>
  );
}

function IosGuide() {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">iPhone · Safari</p>
      <p className="mt-2 text-xs leading-5 text-neutral-500">
        Safari로 열려 있어야 해요. (Chrome 등은 지원되지 않아요)
      </p>
      <ol className="mt-3 space-y-2">
        <Step index={1}>
          하단의 공유 버튼{' '}
          <IconChip icon={<Share className="h-3 w-3" strokeWidth={2.2} />} label="공유" /> 을 누르세요.
        </Step>
        <Step index={2}>
          메뉴에서{' '}
          <IconChip icon={<Plus className="h-3 w-3" strokeWidth={2.6} />} label="홈 화면에 추가" /> 를
          선택하세요.
        </Step>
        <Step index={3}>오른쪽 상단의 <strong className="font-semibold">추가</strong>를 누르세요.</Step>
      </ol>
    </div>
  );
}

function DesktopGuide() {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">데스크톱</p>
      <p className="mt-2 text-xs leading-5 text-neutral-500">
        Chrome/Edge에서 주소창 오른쪽 설치 아이콘을 사용할 수 있어요.
      </p>
      <ol className="mt-3 space-y-2">
        <Step index={1}>
          주소창 오른쪽의{' '}
          <IconChip icon={<Download className="h-3 w-3" strokeWidth={2.2} />} label="설치" /> 아이콘을
          누르세요.
        </Step>
        <Step index={2}>
          <strong className="font-semibold">설치</strong> 버튼을 클릭하세요.
        </Step>
      </ol>
      <p className="mt-3 text-[11px] leading-5 text-neutral-400">
        Safari를 쓰고 있다면 모바일 아이폰에서 설치하시는 걸 권장해요.
      </p>
    </div>
  );
}
