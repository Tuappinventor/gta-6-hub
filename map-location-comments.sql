create table public.map_location_comments (
  id uuid primary key default gen_random_uuid(),
  location_id text not null check (location_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_alias text not null check (char_length(author_alias) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 1000 and body ~ '[^[:space:]]'),
  language text not null check (language in ('es', 'en')),
  created_at timestamptz not null default now(),
  posting_slot bigint not null default floor(extract(epoch from clock_timestamp()) / 20)
);

create index map_location_comments_thread
  on public.map_location_comments (location_id, created_at desc, id desc);

create unique index map_location_comments_posting_limit
  on public.map_location_comments (author_id, posting_slot);

create function public.set_map_location_comment_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(nullif(left(btrim(p.alias), 60), ''), 'VICE HUB')
    into new.author_alias
  from public.profiles p
  where p.id = (select auth.uid());

  new.author_alias := coalesce(new.author_alias, 'VICE HUB');
  return new;
end;
$$;

revoke all on function public.set_map_location_comment_alias() from public, anon, authenticated;

create trigger map_location_comment_alias
  before insert on public.map_location_comments
  for each row execute function public.set_map_location_comment_alias();

alter table public.map_location_comments enable row level security;

revoke all on public.map_location_comments from public, anon, authenticated;
grant select (id, location_id, author_alias, body, language, created_at)
  on public.map_location_comments to anon, authenticated;
grant insert (location_id, body, language), delete
  on public.map_location_comments to authenticated;

create policy "Anyone can read location comments"
  on public.map_location_comments for select to anon, authenticated using (true);

create policy "Members can post location comments"
  on public.map_location_comments for insert to authenticated
  with check (author_id = (select auth.uid())
    and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false));

create policy "Authors and editors can delete location comments"
  on public.map_location_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_editor()));
