-- Fix infinite recursion in list_members SELECT policy by using a SECURITY DEFINER helper.
-- Before: list_members policy queried list_members, which Postgres treated as recursive RLS
-- and returned "infinite recursion detected in policy for relation 'list_members'" (PGRST/500).
-- The same recursion propagated to shared_lists and bucket_list_items policies because their
-- EXISTS subqueries also hit list_members.

create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.list_members lm
    where lm.shared_list_id = p_list_id
      and lm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_list_member(uuid) from public;
grant execute on function public.is_list_member(uuid) to authenticated, anon;

drop policy if exists "members can read co-memberships" on public.list_members;
drop policy if exists "members can read memberships" on public.list_members;

create policy "members can read co-memberships"
  on public.list_members
  for select
  using (public.is_list_member(shared_list_id));

drop policy if exists "members can read shared lists" on public.shared_lists;

create policy "members can read shared lists"
  on public.shared_lists
  for select
  using (public.is_list_member(id));

drop policy if exists "members can read items" on public.bucket_list_items;
drop policy if exists "members can insert items" on public.bucket_list_items;
drop policy if exists "members can update items" on public.bucket_list_items;
drop policy if exists "members can delete items" on public.bucket_list_items;

create policy "members can read items"
  on public.bucket_list_items
  for select
  using (public.is_list_member(shared_list_id));

create policy "members can insert items"
  on public.bucket_list_items
  for insert
  with check (public.is_list_member(shared_list_id));

create policy "members can update items"
  on public.bucket_list_items
  for update
  using (public.is_list_member(shared_list_id))
  with check (public.is_list_member(shared_list_id));

create policy "members can delete items"
  on public.bucket_list_items
  for delete
  using (public.is_list_member(shared_list_id));
