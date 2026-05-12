// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedListPage } from '../src/components/local/shared-list-page';
import type { SharedListItem } from '../src/lib/shared-list';

const sharedListMocks = vi.hoisted(() => ({
  loadSharedList: vi.fn(),
  addSharedListItem: vi.fn(),
  toggleSharedListItem: vi.fn(),
  deleteSharedListItem: vi.fn(),
  restoreSharedListItem: vi.fn(),
  loadListMembers: vi.fn(),
  registerMember: vi.fn(),
}));

vi.mock('../src/lib/shared-list', () => ({
  loadSharedList: sharedListMocks.loadSharedList,
  addSharedListItem: sharedListMocks.addSharedListItem,
  toggleSharedListItem: sharedListMocks.toggleSharedListItem,
  deleteSharedListItem: sharedListMocks.deleteSharedListItem,
  restoreSharedListItem: sharedListMocks.restoreSharedListItem,
  loadListMembers: sharedListMocks.loadListMembers,
  registerMember: sharedListMocks.registerMember,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
});

describe('SharedListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    sharedListMocks.loadSharedList.mockResolvedValue({
      list: {
        id: 'list-1',
        group_name: '주말 버킷리스트',
        invite_token: 'invite-1',
      },
      items: [],
    });

    sharedListMocks.addSharedListItem.mockImplementation(async (_listId: string, input: { title: string }) => ({
      id: `saved-${input.title}`,
      title: input.title,
      link_url: null,
      tags: null,
      created_at: '2026-05-12T00:00:00.000Z',
      completed_at: null,
    } satisfies SharedListItem));
    sharedListMocks.loadListMembers.mockResolvedValue([]);
    sharedListMocks.registerMember.mockResolvedValue(undefined);
  });

  it('focuses the new item input on first render', async () => {
    render(<SharedListPage listId="list-1" />);

    const input = await screen.findByPlaceholderText('새 항목');

    await waitFor(() => expect(input).toHaveFocus());
  });

  it('shows a home button in the shared list header that links to the home page', async () => {
    render(<SharedListPage listId="list-1" />);

    const homeLink = await screen.findByRole('link', { name: '홈으로' });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: '새로고침' })).toBeVisible();
    expect(screen.getByRole('button', { name: '공유' })).toBeVisible();
  });

  it('keeps focus and shows the new item immediately after Enter submit', async () => {
    const user = userEvent.setup();
    let resolveCreate: ((item: SharedListItem) => void) | undefined;

    sharedListMocks.addSharedListItem.mockImplementation(
      () =>
        new Promise<SharedListItem>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    render(<SharedListPage listId="list-1" />);

    const input = await screen.findByPlaceholderText('새 항목');
    await user.type(input, '한강 산책{enter}');

    expect(await screen.findByText('한강 산책')).toBeVisible();
    await waitFor(() => {
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
    });

    resolveCreate?.({
      id: 'item-1',
      title: '한강 산책',
      link_url: null,
      tags: null,
      created_at: '2026-05-12T00:00:00.000Z',
      completed_at: null,
    });

    await waitFor(() => {
      expect(sharedListMocks.addSharedListItem).toHaveBeenCalledWith('list-1', {
        title: '한강 산책',
        linkUrl: '',
        tags: [],
      });
      expect(input).toHaveFocus();
    });
  });

  it('allows another Enter submission before the first request resolves', async () => {
    const user = userEvent.setup();
    let resolveFirst: ((item: SharedListItem) => void) | undefined;
    let resolveSecond: ((item: SharedListItem) => void) | undefined;

    sharedListMocks.addSharedListItem
      .mockImplementationOnce(
        () =>
          new Promise<SharedListItem>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<SharedListItem>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    render(<SharedListPage listId="list-1" />);

    const input = await screen.findByPlaceholderText('새 항목');
    await user.type(input, '첫 번째{enter}');
    await user.type(input, '두 번째{enter}');

    expect(await screen.findByText('첫 번째')).toBeVisible();
    expect(await screen.findByText('두 번째')).toBeVisible();

    resolveFirst?.({
      id: 'item-1',
      title: '첫 번째',
      link_url: null,
      tags: null,
      created_at: '2026-05-12T00:00:00.000Z',
      completed_at: null,
    });
    resolveSecond?.({
      id: 'item-2',
      title: '두 번째',
      link_url: null,
      tags: null,
      created_at: '2026-05-12T00:00:01.000Z',
      completed_at: null,
    });

    await waitFor(() => {
      expect(sharedListMocks.addSharedListItem).toHaveBeenNthCalledWith(1, 'list-1', {
        title: '첫 번째',
        linkUrl: '',
        tags: [],
      });
      expect(sharedListMocks.addSharedListItem).toHaveBeenNthCalledWith(2, 'list-1', {
        title: '두 번째',
        linkUrl: '',
        tags: [],
      });
      expect(input).toHaveFocus();
    });
  });

  it('deletes a pending item immediately and shows an undo button that restores it', async () => {
    const user = userEvent.setup();

    sharedListMocks.loadSharedList.mockResolvedValue({
      list: {
        id: 'list-1',
        group_name: '주말 버킷리스트',
        invite_token: 'invite-1',
      },
      items: [
        {
          id: 'item-1',
          title: '한강 산책',
          link_url: null,
          tags: null,
          created_at: '2026-05-12T00:00:00.000Z',
          completed_at: null,
        },
      ],
    });

    sharedListMocks.deleteSharedListItem.mockResolvedValue(undefined);
    sharedListMocks.restoreSharedListItem.mockResolvedValue(undefined);

    render(<SharedListPage listId="list-1" />);

    await screen.findByText('한강 산책');

    await user.click(screen.getByRole('button', { name: '한강 산책 삭제' }));

    await waitFor(() => {
      expect(screen.queryByText('한강 산책')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('항목을 삭제했어요')).toBeVisible();
    await waitFor(() => {
      expect(sharedListMocks.deleteSharedListItem).toHaveBeenCalledWith('item-1');
    });

    await user.click(screen.getByRole('button', { name: '되돌리기' }));

    await waitFor(() => {
      expect(screen.getByText('한강 산책')).toBeVisible();
      expect(sharedListMocks.restoreSharedListItem).toHaveBeenCalledWith(
        'list-1',
        expect.objectContaining({ id: 'item-1', title: '한강 산책' }),
      );
    });
  });

  it('deletes a completed item and undo restores it as completed', async () => {
    const user = userEvent.setup();

    sharedListMocks.loadSharedList.mockResolvedValue({
      list: {
        id: 'list-1',
        group_name: '주말 버킷리스트',
        invite_token: 'invite-1',
      },
      items: [
        {
          id: 'item-done',
          title: '서울숲 피크닉',
          link_url: null,
          tags: null,
          created_at: '2026-05-12T00:00:00.000Z',
          completed_at: '2026-05-12T01:00:00.000Z',
        },
      ],
    });

    sharedListMocks.deleteSharedListItem.mockResolvedValue(undefined);
    sharedListMocks.restoreSharedListItem.mockResolvedValue(undefined);

    render(<SharedListPage listId="list-1" />);

    await screen.findByText('서울숲 피크닉');

    await user.click(screen.getByRole('button', { name: '서울숲 피크닉 삭제' }));

    await waitFor(() => {
      expect(screen.queryByText('서울숲 피크닉')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('항목을 삭제했어요')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '되돌리기' }));

    await waitFor(() => {
      expect(screen.getByText('서울숲 피크닉')).toBeVisible();
      expect(sharedListMocks.restoreSharedListItem).toHaveBeenCalledWith(
        'list-1',
        expect.objectContaining({
          id: 'item-done',
          title: '서울숲 피크닉',
          completed_at: '2026-05-12T01:00:00.000Z',
        }),
      );
    });
  });

  it('rolls back an optimistic item when creation fails', async () => {
    const user = userEvent.setup();
    let rejectCreate: ((error: Error) => void) | undefined;

    sharedListMocks.addSharedListItem.mockImplementation(
      () =>
        new Promise<SharedListItem>((_resolve, reject) => {
          rejectCreate = reject;
        }),
    );

    render(<SharedListPage listId="list-1" />);

    const input = await screen.findByPlaceholderText('새 항목');
    await user.type(input, '실패 항목{enter}');

    expect(await screen.findByText('실패 항목')).toBeVisible();

    rejectCreate?.(new Error('create-item-failed'));

    await waitFor(() => {
      expect(screen.queryByText('실패 항목')).not.toBeInTheDocument();
      expect(input).toHaveFocus();
    });
  });
});
