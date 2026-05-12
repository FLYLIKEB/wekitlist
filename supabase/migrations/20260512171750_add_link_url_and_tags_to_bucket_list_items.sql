alter table if exists public.bucket_list_items
add column if not exists link_url text,
add column if not exists tags text[];
