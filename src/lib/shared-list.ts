import { supabase } from './supabase';

export type SharedListItem = {
  id: string;
  title: string;
  link_url: string | null;
  tags: string[] | null;
  created_at: string;
  completed_at: string | null;
};

export type NewSharedListItemInput = {
  title: string;
  linkUrl?: string;
  tags?: string[];
};

export type SharedListRecord = {
  id: string;
  group_name: string;
  invite_token: string;
};

export type ListMember = {
  display_name: string;
};

export async function createSharedList(groupName: string, displayName: string) {
  const listId = crypto.randomUUID();
  const inviteToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const { error: listError } = await supabase.from('shared_lists').insert({
    id: listId,
    group_name: groupName,
    invite_token: inviteToken,
  });

  if (listError) {
    throw new Error('create-list-failed');
  }

  const { error: memberError } = await supabase.from('list_members').insert({
    shared_list_id: listId,
    display_name: displayName,
  });

  if (memberError) {
    throw new Error('create-member-failed');
  }

  return {
    id: listId,
    group_name: groupName,
    invite_token: inviteToken,
  };
}

export async function loadSharedList(listId: string) {
  const [{ data: list, error: listError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('shared_lists')
      .select('id, group_name, invite_token')
      .eq('id', listId)
      .maybeSingle(),
    supabase
      .from('bucket_list_items')
      .select('id, title, link_url, tags, created_at, completed_at')
      .eq('shared_list_id', listId)
      .order('created_at', { ascending: false }),
  ]);

  if (listError) {
    throw new Error('load-list-failed');
  }

  if (!list) {
    throw new Error('list-not-found');
  }

  if (itemsError) {
    throw new Error('load-items-failed');
  }

  return { list: list as SharedListRecord, items: (items ?? []) as SharedListItem[] };
}

export async function loadSharedListByInviteToken(inviteToken: string) {
  const { data, error } = await supabase.rpc('find_list_by_invite_token', {
    p_token: inviteToken,
  });

  if (error) {
    throw new Error('load-invite-failed');
  }

  const record = Array.isArray(data) ? data[0] : data;
  if (!record) {
    throw new Error('invite-not-found');
  }

  return record as SharedListRecord;
}

export async function registerMember(listId: string, displayName: string) {
  const { error } = await supabase
    .from('list_members')
    .upsert(
      { shared_list_id: listId, display_name: displayName },
      { onConflict: 'shared_list_id,display_name', ignoreDuplicates: true },
    );

  if (error) {
    throw new Error('register-member-failed');
  }
}

export async function joinSharedListByInvite(inviteToken: string, displayName: string) {
  const list = await loadSharedListByInviteToken(inviteToken);
  await registerMember(list.id, displayName);
  return list;
}

export async function addSharedListItem(listId: string, input: NewSharedListItemInput) {
  const { data, error } = await supabase
    .from('bucket_list_items')
    .insert({
      shared_list_id: listId,
      title: input.title,
      link_url: input.linkUrl?.trim() || null,
      tags: input.tags?.length ? input.tags : null,
    })
    .select('id, title, link_url, tags, created_at, completed_at')
    .single();

  if (error || !data) {
    throw new Error('create-item-failed');
  }

  return data as SharedListItem;
}

export async function deleteSharedListItem(itemId: string) {
  const { error } = await supabase.from('bucket_list_items').delete().eq('id', itemId);

  if (error) {
    throw new Error('delete-item-failed');
  }
}

export async function restoreSharedListItem(listId: string, item: SharedListItem) {
  const { error } = await supabase.from('bucket_list_items').insert({
    id: item.id,
    shared_list_id: listId,
    title: item.title,
    link_url: item.link_url,
    tags: item.tags,
    created_at: item.created_at,
    completed_at: item.completed_at,
  });

  if (error) {
    throw new Error('restore-item-failed');
  }
}

export async function loadListMembers(listId: string) {
  const { data, error } = await supabase
    .from('list_members')
    .select('display_name')
    .eq('shared_list_id', listId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('load-members-failed');
  }

  return (data ?? []) as ListMember[];
}

export async function toggleSharedListItem(itemId: string, completed: boolean) {
  const { error } = await supabase
    .from('bucket_list_items')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', itemId);

  if (error) {
    throw new Error(completed ? 'complete-item-failed' : 'reopen-item-failed');
  }
}

export async function updateSharedListItemTitle(itemId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('empty-title');
  }

  const { error } = await supabase
    .from('bucket_list_items')
    .update({ title: trimmed })
    .eq('id', itemId);

  if (error) {
    throw new Error('update-title-failed');
  }
}
