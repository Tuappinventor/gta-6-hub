ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'actualidad';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_credit text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS articles_published_category_idx ON public.articles (status, category, published_at DESC);
GRANT SELECT, INSERT ON public.articles TO service_role;
