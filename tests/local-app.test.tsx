// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalApp } from '../src/components/local/local-app';

const pushMock = vi.fn();
const replaceMock = vi.fn();

const sharedListMocks = vi.hoisted(() => ({
  createSharedList: vi.fn(),
}));

function createSearchParams() {
  return new URLSearchParams(window.location.search);
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => createSearchParams(),
}));

vi.mock('../src/lib/shared-list', () => ({
  createSharedList: sharedListMocks.createSharedList,
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('LocalApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('shows the redesigned brand-forward home screen', () => {
    render(<LocalApp />);

    expect(screen.getAllByText('Wekitlist').at(0)).toBeVisible();
    expect(screen.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
    expect(screen.getByText('새로운 공유 리스트를 바로 만들고 함께 채워보세요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '새 리스트 만들기' })).toBeVisible();
  });

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
});
