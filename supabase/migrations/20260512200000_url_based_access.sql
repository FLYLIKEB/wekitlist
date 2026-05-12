-- Switch to URL-based access. Anyone who knows the list id can read/write.
-- RLS stays enabled but with permissive policies. Membership is identified
-- by display_name (kept in the ?as= query param on the client), not auth.uid().

-- Collapse duplicate (list, name) memberships first (keep earliest)
delete from public.list_members lm
using (
  select id, shared_list_id, display_name,
         row_number() over (partition by shared_list_id, display_name order by created_at) as rn
  from public.list_members
) ranked
where lm.id = ranked.id and ranked.rn > 1;

-- Allow nullable user_id / created_by (auth dropped)
alter table public.shared_lists alter column created_by drop not null;
alter table public.list_members alter column user_id drop not null;

-- shared_lists: anyone can read/insert
drop policy if exists "users can create shared lists" on public.shared_lists;
drop policy if exists "members can read shared lists" on public.shared_lists;

create policy "anyone can read shared lists"
  on public.shared_lists for select using (true);

create policy "anyone can insert shared lists"
  on public.shared_lists for insert with check (true);

-- list_members: anyone can read/insert
drop policy if exists "users can create memberships" on public.list_members;
drop policy if exists "members can read co-memberships" on public.list_members;
drop policy if exists "members can read memberships" on public.list_members;

create policy "anyone can read memberships"
  on public.list_members for select using (true);

create policy "anyone can insert memberships"
  on public.list_members for insert with check (true);

-- bucket_list_items: anyone can do everything
drop policy if exists "members can read items" on public.bucket_list_items;
drop policy if exists "members can insert items" on public.bucket_list_items;
drop policy if exists "members can update items" on public.bucket_list_items;
drop policy if exists "members can delete items" on public.bucket_list_items;

create policy "anyone can read items"
  on public.bucket_list_items for select using (true);

create policy "anyone can insert items"
  on public.bucket_list_items for insert with check (true);

create policy "anyone can update items"
  on public.bucket_list_items for update using (true) with check (true);

create policy "anyone can delete items"
  on public.bucket_list_items for delete using (true);

-- Drop helper now that we no longer rely on auth-based RLS
drop function if exists public.is_list_member(uuid);

-- Unique index for upserting members by (list, name)
create unique index if not exists list_members_shared_list_id_display_name_key
  on public.list_members (shared_list_id, display_name);
