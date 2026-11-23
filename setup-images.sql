-- Ejecutar una sola vez en Supabase SQL Editor.
-- Columna para el límite diario de imágenes.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_generated_at timestamptz;

-- Imágenes públicas para la portada y las tarjetas sociales.
-- Escritura únicamente desde backend usando service_role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 15728640, ARRAY['image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No se crea ninguna política de subida para anon/authenticated.
-- Las subidas se realizan desde GitHub Actions con service_role.
