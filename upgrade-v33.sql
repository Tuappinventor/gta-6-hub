-- Permite que Editorial conserve las publicaciones descartadas.
alter table public.articles
  drop constraint articles_status_check,
  add constraint articles_status_check
    check (status in ('draft', 'review', 'published', 'rejected'));
