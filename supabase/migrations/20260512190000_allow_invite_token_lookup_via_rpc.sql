-- Allow anyone with an invite token to look up the corresponding shared list.
-- The "members can read shared lists" RLS policy blocks non-member sessions
-- from selecting via the table directly, so we expose a SECURITY DEFINER RPC
-- that returns the minimal fields needed to render the invite landing page.

create or replace function public.find_list_by_invite_token(p_token text)
returns table (id uuid, group_name text, invite_token text)
language sql
security definer
stable
set search_path = public
as $$
  select id, group_name, invite_token
  from public.shared_lists
  where invite_token = p_token
  limit 1;
$$;

revoke all on function public.find_list_by_invite_token(text) from public;
grant execute on function public.find_list_by_invite_token(text) to authenticated, anon;
