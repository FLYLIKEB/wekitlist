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

  it('shows a back button on the fresh home screen when entered from a list', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('lastVisitedListPath', '/list/abc?as=민지');
    window.history.replaceState({}, '', '/?fresh=1&from=list');

    render(<LocalApp />);

    expect(screen.getByText('같이 쓰는 버킷리스트')).toBeVisible();

    const backButton = screen.getByRole('button', { name: '리스트로 돌아가기' });
    await user.click(backButton);

    expect(replaceMock).toHaveBeenCalledWith('/list/abc?as=민지');
  });
});
