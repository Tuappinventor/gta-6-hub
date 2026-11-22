-- Ejecutar una sola vez en Supabase SQL Editor.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'unreviewed';
CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_unique ON public.articles (source_url) WHERE source_url IS NOT NULL;
-- No cambiar las políticas RLS existentes: el bot usa exclusivamente la service role en GitHub Actions.
