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

    expect(getSession).toHaveBeenCalled();
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

    expect(getSession).toHaveBeenCalled();
  });
});

describe('createSharedList', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
          },
        },
      },
    });
  });

  it('inserts shared_lists and list_members rows and returns a constructed record', async () => {
    const sharedListsInsert = vi.fn().mockResolvedValue({ error: null });
    const listMembersInsert = vi.fn().mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'shared_lists') return { insert: sharedListsInsert };
      if (table === 'list_members') return { insert: listMembersInsert };
      throw new Error(`unexpected table: ${table}`);
    });

    const { createSharedList } = await import('../src/lib/shared-list');

    const result = await createSharedList('주말 버킷리스트', '재원');

    expect(result).toEqual({
      id: expect.any(String),
      group_name: '주말 버킷리스트',
      invite_token: expect.any(String),
    });

    expect(sharedListsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.id,
        group_name: '주말 버킷리스트',
        invite_token: result.invite_token,
        created_by: 'user-1',
      }),
    );

    expect(listMembersInsert).toHaveBeenCalledWith({
      shared_list_id: result.id,
      user_id: 'user-1',
      display_name: '재원',
    });

    expect(getSession).toHaveBeenCalled();
  });
});
