-- Esquema inicial para Supabase PostgreSQL. Ejecutar en SQL Editor tras revisar permisos.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, alias text not null default 'Jugador', avatar_url text, role text not null default 'reader' check(role in ('reader','editor','admin')), created_at timestamptz not null default now());
create table public.sources (id uuid primary key default gen_random_uuid(), name text not null, feed_url text unique, website_url text, enabled boolean not null default false, created_at timestamptz default now());
create table public.articles (id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, summary text, body text, kind text not null default 'news' check(kind in ('news','guide')), status text not null default 'draft' check(status in ('draft','review','published','rejected')), source_id uuid references public.sources(id), author_id uuid references public.profiles(id), published_at timestamptz, created_at timestamptz default now());
create table public.locations (id uuid primary key default gen_random_uuid(), name text not null, category text not null, map_x numeric not null check(map_x between 0 and 100), map_y numeric not null check(map_y between 0 and 100), description text, verified boolean not null default false, created_at timestamptz default now());
create table public.vehicles (id uuid primary key default gen_random_uuid(), name text not null, category text, description text, image_url text, verified boolean not null default false, created_at timestamptz default now());
create table public.user_progress (user_id uuid not null references public.profiles(id) on delete cascade, location_id uuid not null references public.locations(id) on delete cascade, discovered boolean not null default false, updated_at timestamptz default now(), primary key(user_id,location_id));
create table public.favorites (user_id uuid not null references public.profiles(id) on delete cascade, article_id uuid not null references public.articles(id) on delete cascade, created_at timestamptz default now(), primary key(user_id,article_id));
create table public.editorial_jobs (id uuid primary key default gen_random_uuid(), source_id uuid references public.sources(id), state text not null default 'pending', payload jsonb not null default '{}'::jsonb, created_at timestamptz default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, entity_type text, entity_id uuid, created_at timestamptz default now());
create or replace function public.is_editor() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role in ('editor','admin')) $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') $$;
alter table public.profiles enable row level security;alter table public.sources enable row level security;alter table public.articles enable row level security;alter table public.locations enable row level security;alter table public.vehicles enable row level security;alter table public.user_progress enable row level security;alter table public.favorites enable row level security;alter table public.editorial_jobs enable row level security;alter table public.audit_logs enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy "own profile insert" on public.profiles for insert to authenticated with check(id=(select auth.uid()) and role='reader');
create policy "own profile update" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
-- IMPORTANTE: prohibir cambios de rol mediante privilegios de columna, incluso en perfiles propios.
revoke update on public.profiles from authenticated;
grant update(alias,avatar_url) on public.profiles to authenticated;
create policy "published articles public" on public.articles for select to anon,authenticated using(status='published' or public.is_editor());
create policy "editor articles insert" on public.articles for insert to authenticated with check(public.is_editor());
create policy "editor articles update" on public.articles for update to authenticated using(public.is_editor()) with check(public.is_editor());
create policy "editor articles delete" on public.articles for delete to authenticated using(public.is_editor());
create policy "public verified locations" on public.locations for select to anon,authenticated using(verified or public.is_editor());
create policy "editor locations" on public.locations for all to authenticated using(public.is_editor()) with check(public.is_editor());
create policy "public verified vehicles" on public.vehicles for select to anon,authenticated using(verified or public.is_editor());
create policy "editor vehicles" on public.vehicles for all to authenticated using(public.is_editor()) with check(public.is_editor());
create policy "own progress" on public.user_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "own favorites" on public.favorites for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "editor sources" on public.sources for all to authenticated using(public.is_editor()) with check(public.is_editor());
create policy "editor jobs" on public.editorial_jobs for select to authenticated using(public.is_editor());
create policy "admin audit" on public.audit_logs for select to authenticated using(public.is_admin());
-- Las escrituras de editorial_jobs y audit_logs se hacen exclusivamente desde backend de confianza.

-- Fase 2: alta automática de perfiles (ejecutar una sola vez).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles (id,alias,role) values (new.id,'Jugador','reader') on conflict(id) do nothing;
 return new;
end;$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Corregir permisos de rol: no conceder cambios de role desde clientes.
revoke all on public.profiles from anon,authenticated;
grant select,insert on public.profiles to authenticated;
grant update(alias,avatar_url) on public.profiles to authenticated;
-- Ejecuta manualmente en SQL Editor, sustituyendo el UUID por el de tu usuario:
-- update public.profiles set role='admin' where id='TU-UUID-AQUI';
