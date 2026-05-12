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

    signInAnonymously.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('creates a shared list without relying on insert select visibility before membership exists', async () => {
    const sharedListsInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'new row violates row-level security policy for table "shared_lists"',
          },
        }),
      }),
    });

    const listMembersInsert = vi.fn().mockResolvedValue({ error: null });
    const sharedListsLookupEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'list-1',
          group_name: '주말 버킷리스트',
          invite_token: 'token-1',
        },
        error: null,
      }),
    });

    from.mockImplementation((table: string) => {
      if (table === 'shared_lists') {
        if (from.mock.calls.filter(([name]) => name === 'shared_lists').length === 1) {
          return { insert: sharedListsInsert };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: sharedListsLookupEq,
          }),
        };
      }

      if (table === 'list_members') {
        return { insert: listMembersInsert };
      }

      throw new Error(`unexpected table: ${table}`);
    });

    const { createSharedList } = await import('../src/lib/shared-list');

    await expect(createSharedList('주말 버킷리스트', '재원')).resolves.toEqual({
      id: expect.any(String),
      group_name: '주말 버킷리스트',
      invite_token: expect.any(String),
    });

    expect(listMembersInsert).toHaveBeenCalledWith({
      shared_list_id: expect.any(String),
      user_id: 'user-1',
      display_name: '재원',
    });
  });
});
