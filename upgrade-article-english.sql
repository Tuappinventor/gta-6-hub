alter table public.articles
  add column title_en text,
  add column summary_en text,
  add column body_en text;

create function public.clear_edited_article_translation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.title is distinct from old.title then new.title_en := null; end if;
  if new.summary is distinct from old.summary then new.summary_en := null; end if;
  if new.body is distinct from old.body then new.body_en := null; end if;
  return new;
end;
$$;
revoke all on function public.clear_edited_article_translation() from public, anon, authenticated;
create trigger clear_edited_article_translation
  before update of title, summary, body on public.articles
  for each row execute function public.clear_edited_article_translation();
