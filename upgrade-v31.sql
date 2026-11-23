-- Migración aditiva: conserva artículos y usuarios existentes.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS verification_notes text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS original_published_at timestamptz;
CREATE INDEX IF NOT EXISTS articles_public_slug_idx ON public.articles(slug) WHERE status='published';
