import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']) {
  if (!process.env[name]) throw new Error(`Falta el secreto ${name}`);
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser({ timeout: 12000, headers: { 'User-Agent': 'GTA6HubBot/1.0' } });
const feeds = [
  { name: 'Google News · GTA VI', url: 'https://news.google.com/rss/search?q=%22GTA+6%22+OR+%22GTA+VI%22&hl=es&gl=ES&ceid=ES:es' },
  { name: 'Google News · Rockstar GTA VI', url: 'https://news.google.com/rss/search?q=%22Rockstar+Games%22+%22GTA+VI%22&hl=en&gl=US&ceid=US:en' }
];
const MAX_POSTS_PER_RUN = 1;
const MAX_POSTS_PER_DAY = 3;
const MAX_AI_CALLS_PER_RUN = 2;
let aiCalls = 0;
const dayStart = new Date();
dayStart.setUTCHours(0, 0, 0, 0);
const { count: publishedToday, error: countError } = await db.from('articles')
  .select('id', { count: 'exact', head: true })
  .not('source_url', 'is', null)
  .gte('published_at', dayStart.toISOString());
if (countError) throw countError;
const remainingToday = Math.max(0, MAX_POSTS_PER_DAY - (publishedToday || 0));
console.log(`Publicadas hoy: ${publishedToday || 0}; quedan ${remainingToday} de ${MAX_POSTS_PER_DAY}`);
const MAX_AGE_HOURS = 48;
const now = Date.now();
const cutoff = now - MAX_AGE_HOURS * 3600_000;
const canonical = (url) => {
  try { const u = new URL(url); u.hash = ''; return u.toString(); } catch { return ''; }
};
const slugify = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110);
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 12);
const items = [];
for (const feed of feeds) {
  try {
    const result = await parser.parseURL(feed.url);
    for (const item of result.items || []) {
      const url = canonical(item.link || '');
      const date = new Date(item.isoDate || item.pubDate || '');
      if (!url || !Number.isFinite(date.getTime()) || date.getTime() < cutoff || date.getTime() > now + 3600_000) continue;
      items.push({ title: item.title || '', url, date: date.toISOString(), feed: feed.name, excerpt: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, ' ').slice(0, 1800) });
    }
  } catch (err) { console.warn(`No se pudo leer ${feed.name}: ${err.message}`); }
}
items.sort((a,b) => b.date.localeCompare(a.date));
const seen = new Set();
let published = 0;
for (const item of items) {
  if (published >= Math.min(MAX_POSTS_PER_RUN, remainingToday) || aiCalls >= MAX_AI_CALLS_PER_RUN) break;
  if (seen.has(item.url)) continue;
  seen.add(item.url);
  const { data: existing, error: lookupError } = await db.from('articles').select('id').eq('source_url', item.url).limit(1);
  if (lookupError) throw lookupError;
  if (existing?.length) continue;
  aiCalls++;
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `Eres editor de un portal español sobre GTA VI. Redacta SOLO a partir de los datos de entrada. No tienes acceso al artículo completo: si los datos no bastan, responde {"publish":false}. No inventes fechas, anuncios, citas, cifras ni detalles. No afirmes que algo está confirmado por Rockstar salvo evidencia explícita de un comunicado oficial. Si la fuente es un medio o agregador, atribuye la información al medio y evita titulares categóricos. Evita sensacionalismo, rumores sin atribución y material promocional. Produce JSON con publish boolean, title string, summary string, body string. body debe tener 2-4 párrafos en texto plano, incluir contexto solo si está respaldado por la entrada y acabar con 'Fuente: URL'. No copies frases largas del material de origen.` },
      { role: 'user', content: JSON.stringify(item) }
    ]
  });
  let article;
  try { article = JSON.parse(response.choices[0].message.content); } catch { console.warn('Respuesta IA inválida'); continue; }
  if (article.publish !== true || !article.title || !article.summary || !article.body) continue;
  const body = String(article.body).slice(0, 10000);
  const title = String(article.title).slice(0, 180);
  const summary = String(article.summary).slice(0, 600);
  if (!body.includes(item.url) || body.length < 180) continue;
  const record = {
    title, summary, body, slug: `${slugify(title) || 'noticia'}-${hash(item.url)}`,
    kind: 'news', status: 'published', published_at: new Date().toISOString(),
    source_url: item.url, source_name: item.feed, verification_level: 'secondary'
  };
  const { error } = await db.from('articles').insert(record);
  if (error?.code === '23505') continue;
  if (error) throw error;
  console.log(`Publicada: ${title}`);
  published++;
}
console.log(`Resultado: ${published} noticia(s) publicadas; ${items.length} entradas recientes revisadas.`);
