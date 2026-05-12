// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallPrompt } from '../src/components/local/install-prompt';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    get: () => ua,
  });
}

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  setUserAgent(ANDROID_UA);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('InstallPrompt (Android)', () => {
  it('renders nothing until beforeinstallprompt fires', () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole('button', { name: '앱으로 설치' })).not.toBeInTheDocument();
  });

  it('shows the install dialog after beforeinstallprompt fires', async () => {
    render(<InstallPrompt />);

    act(() => {
      fireBeforeInstallPrompt();
    });

    const installButton = await screen.findByRole('button', { name: '앱으로 설치' });
    await waitFor(() => {
      expect(installButton).toBeVisible();
    });
  });

  it('calls prompt() when install button is clicked and hides afterwards', async () => {
    const user = userEvent.setup();

    render(<InstallPrompt />);

    let dispatched: BeforeInstallPromptEvent | undefined;
    act(() => {
      dispatched = fireBeforeInstallPrompt('accepted');
    });

    const installButton = await screen.findByRole('button', { name: '앱으로 설치' });
    await user.click(installButton);

    expect(dispatched?.prompt).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '앱으로 설치' })).not.toBeInTheDocument();
    });
  });

  it('hides and remembers dismissal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(<InstallPrompt />);

    act(() => {
      fireBeforeInstallPrompt();
    });

    const dismissButton = await screen.findByRole('button', { name: '닫기' });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '앱으로 설치' })).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem('installPromptDismissedAt')).not.toBeNull();
  });

  it('does not render the dialog if the user dismissed it recently', async () => {
    window.localStorage.setItem('installPromptDismissedAt', String(Date.now()));

    render(<InstallPrompt />);

    act(() => {
      fireBeforeInstallPrompt();
    });

    // Give the appearance delay a chance to fire
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(screen.queryByRole('button', { name: '앱으로 설치' })).not.toBeInTheDocument();
  });
});
