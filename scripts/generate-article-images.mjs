import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

for (const name of ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Falta ${name}`);
}
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const bucket = 'article-images';
const credit = 'Ilustración generada con IA · OpenAI';
const maxPerDay = 3;
const start = new Date(); start.setUTCHours(0, 0, 0, 0);

// Control de coste: contar solo imágenes que ya quedaron vinculadas a noticias hoy.
const { count, error: countError } = await db.from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('image_credit', credit)
  .gte('image_generated_at', start.toISOString());
if (countError) throw countError;
if ((count || 0) >= maxPerDay) {
  console.log(`Límite diario de imágenes alcanzado (${maxPerDay}).`);
  process.exit(0);
}

// Solo artículos publicados y sin imagen. El orden prioriza noticias recientes.
const { data: articles, error: listError } = await db.from('articles')
  .select('id,title,summary,category,verification_level,published_at,image_url')
  .eq('status', 'published')
  .is('image_url', null)
  .gte('published_at', new Date(Date.now() - 7 * 86400000).toISOString())
  .order('published_at', { ascending: false })
  .limit(1);
if (listError) throw listError;
const article = articles?.[0];
if (!article) { console.log('No hay artículos publicados recientes sin imagen.'); process.exit(0); }

const prompt = `Create an original cinematic editorial illustration for an independent Spanish-language videogame news website, inspired by tropical neon nightlife and contemporary open-world videogame culture. Wide landscape composition 3:2, no text, no logos, no watermarks, no UI, no recognizable copyrighted characters, no imitation of official screenshots or game promotional assets. Make the illustration relevant to this news topic without depicting any unverified event as a factual scene. Category: ${String(article.category || 'actualidad').slice(0, 50)}. Headline: ${String(article.title || '').slice(0, 160)}. Summary: ${String(article.summary || '').slice(0, 450)}. Visually distinctive, high quality, professional magazine cover art. For rumors, use symbolic abstract imagery rather than a literal depiction.`;

console.log(`Generando imagen para: ${article.title}`);
const response = await ai.images.generate({
  model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
  prompt,
  size: '1536x1024',
  quality: 'low',
  n: 1
});
const b64 = response.data?.[0]?.b64_json;
if (!b64) throw new Error('La API no devolvió imagen en base64');
const bytes = Buffer.from(b64, 'base64');
if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new Error('Tamaño de imagen inesperado');
const key = createHash('sha256').update(String(article.id)).digest('hex').slice(0, 24);
const path = `${key}.png`;
const { error: uploadError } = await db.storage.from(bucket).upload(path, bytes, {
  contentType: 'image/png', cacheControl: '31536000', upsert: false
});
if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
const { data: publicUrl } = db.storage.from(bucket).getPublicUrl(path);
if (!publicUrl?.publicUrl) throw new Error('No se pudo obtener URL pública');

// Escritura condicional: nunca reemplazar imágenes asignadas por un editor.
const { data: updated, error: updateError } = await db.from('articles')
  .update({ image_url: publicUrl.publicUrl, image_credit: credit, image_generated_at: new Date().toISOString() })
  .eq('id', article.id).eq('status', 'published').is('image_url', null)
  .select('id');
if (updateError) throw updateError;
console.log(updated?.length ? `Imagen vinculada: ${publicUrl.publicUrl}` : 'Artículo modificado por otro proceso: imagen no reemplazada.');
