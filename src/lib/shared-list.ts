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

export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error || !signInData.session) {
    throw new Error('anonymous-auth-failed');
  }

  return signInData.session;
}

export async function createSharedList(groupName: string, displayName: string) {
  const session = await ensureSession();
  const listId = crypto.randomUUID();
  const inviteToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const { error: listError } = await supabase
    .from('shared_lists')
    .insert({
      id: listId,
      group_name: groupName,
      invite_token: inviteToken,
      created_by: session.user.id,
    });

  if (listError) {
    throw new Error('create-list-failed');
  }

  const { error: memberError } = await supabase.from('list_members').insert({
    shared_list_id: listId,
    user_id: session.user.id,
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
  await ensureSession();

  const [{ data: list, error: listError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('shared_lists').select('id, group_name, invite_token').eq('id', listId).single(),
    supabase
      .from('bucket_list_items')
      .select('id, title, link_url, tags, created_at, completed_at')
      .eq('shared_list_id', listId)
      .order('created_at', { ascending: false }),
  ]);

  if (listError || !list) {
    throw new Error('load-list-failed');
  }

  if (itemsError) {
    throw new Error('load-items-failed');
  }

  return { list: list as SharedListRecord, items: (items ?? []) as SharedListItem[] };
}

export async function loadSharedListByInviteToken(inviteToken: string) {
  await ensureSession();

  const { data, error } = await supabase
    .from('shared_lists')
    .select('id, group_name, invite_token')
    .eq('invite_token', inviteToken)
    .single();

  if (error || !data) {
    throw new Error('load-invite-failed');
  }

  return data as SharedListRecord;
}

export async function addSharedListItem(listId: string, input: NewSharedListItemInput) {
  await ensureSession();

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
  await ensureSession();

  const { error } = await supabase.from('bucket_list_items').delete().eq('id', itemId);

  if (error) {
    throw new Error('delete-item-failed');
  }
}

export async function restoreSharedListItem(listId: string, item: SharedListItem) {
  await ensureSession();

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

export async function toggleSharedListItem(itemId: string, completed: boolean) {
  await ensureSession();

  const { error } = await supabase
    .from('bucket_list_items')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', itemId);

  if (error) {
    throw new Error(completed ? 'complete-item-failed' : 'reopen-item-failed');
  }
}
