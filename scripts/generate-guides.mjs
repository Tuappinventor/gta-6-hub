
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// VICE HUB AutoGuides 1.1 — compatible con automatic-guides.yml existente.
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']) {
  if (!process.env[key]) throw new Error(`Falta el secreto ${key}`);
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser({ timeout: 12000, headers: { 'User-Agent': 'VICEHUB-AutoGuides/1.1' } });
const MAX_AI_CALLS = 2;
const MAX_DAILY_GUIDES = 1;
const now = new Date();
const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0);
const stats = { rss: 0, candidates: 0, duplicates: 0, fetched: 0, failed: 0, tooShort: 0, aiCalls: 0, skipped: 0 };
const clean = s => String(s ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ').trim();
const validUrl = s => { try { const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 95);
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 12);
const isOfficial = url => { try { const h = new URL(url).hostname.toLowerCase(); return h === 'rockstargames.com' || h.endsWith('.rockstargames.com'); } catch { return false; } };
const isGoogleNews = url => { try { return new URL(url).hostname === 'news.google.com'; } catch { return false; } };

async function getPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 11000);
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VICEHUB-AutoGuides/1.1)', Accept: 'text/html' }
    });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    if (!String(response.headers.get('content-type') || '').includes('text/html')) return { error: 'No es HTML' };
    const finalUrl = validUrl(response.url);
    if (!finalUrl || isGoogleNews(finalUrl)) return { error: 'Enlace de Google News sin resolver' };
    const html = (await response.text()).slice(0, 550000);
    // Conserva el contenido principal cuando está marcado semánticamente.
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
      || html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const section = main?.[1] || html.replace(/<(?:header|footer|nav|aside)\b[^>]*>[\s\S]*?<\/(?:header|footer|nav|aside)>/gi, ' ');
    const body = clean(section).slice(0, 18000);
    if (body.length < 450) return { error: `Contenido insuficiente (${body.length} caracteres)` };
    return { url: finalUrl, body };
  } catch (e) { return { error: e.message }; }
  finally { clearTimeout(timeout); }
}

async function exists(url) {
  const { data, error } = await db.from('articles').select('id').eq('source_url', url).limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

const { count, error: countError } = await db.from('articles')
  .select('id', { count: 'exact', head: true }).eq('kind', 'guide').gte('created_at', dayStart.toISOString());
if (countError) throw countError;
if ((count || 0) >= MAX_DAILY_GUIDES) {
  console.log('AutoGuides: ya se creó una guía hoy (UTC).');
  process.exit(0);
}

const sources = [
  { name: 'Rockstar Newswire', url: 'https://www.rockstargames.com/newswire/rss' },
  { name: 'Google News GTA VI', url: 'https://news.google.com/rss/search?q=%22GTA+VI%22+%28gu%C3%ADa+OR+personajes+OR+veh%C3%ADculos+OR+localizaciones%29&hl=es&gl=ES&ceid=ES:es' }
];
const candidates = [];
// Página oficial permanente: no depende de la fecha del RSS.
candidates.push({ title: 'Grand Theft Auto VI — información oficial', url: 'https://www.rockstargames.com/VI', source: 'Rockstar Games', officialLanding: true, date: '2000-01-01' });
for (const source of sources) {
  try {
    const feed = await parser.parseURL(source.url);
    let accepted = 0;
    for (const item of feed.items || []) {
      stats.rss++;
      const title = clean(item.title);
      const url = validUrl(item.link);
      const date = new Date(item.isoDate || item.pubDate || '');
      if (!url || !Number.isFinite(date.getTime())) continue;
      if (date.getTime() > Date.now() + 3600000 || Date.now() - date.getTime() > 90 * 86400000) continue;
      if (!/(?:\bgta\s*(?:6|vi)\b|grand theft auto\s*(?:6|vi)\b)/i.test(title + ' ' + clean(item.contentSnippet))) continue;
      candidates.push({ title, url, source: source.name, date: date.toISOString(), excerpt: clean(item.contentSnippet || item.content).slice(0, 1200) });
      accepted++;
    }
    console.log(`RSS ${source.name}: ${accepted} entradas relevantes`);
  } catch (e) { console.warn(`RSS no disponible (${source.name}): ${e.message}`); }
}
// Prioriza la fuente oficial, luego las novedades más recientes.
candidates.sort((a, b) => Number(isOfficial(b.url)) - Number(isOfficial(a.url)) || b.date.localeCompare(a.date));
const seen = new Set();
for (const item of candidates) {
  if (stats.aiCalls >= MAX_AI_CALLS) break;
  if (seen.has(item.url)) continue;
  seen.add(item.url);
  stats.candidates++;
  if (await exists(item.url)) { stats.duplicates++; continue; }
  const page = await getPage(item.url);
  if (page.error) {
    stats.failed++;
    console.log(`Descartada (${page.error}): ${item.title.slice(0, 100)}`);
    continue;
  }
  stats.fetched++;
  if (await exists(page.url)) { stats.duplicates++; continue; }
  if (page.body.length < 900) {
    stats.tooShort++;
    console.log(`Descartada (menos de 900 caracteres útiles): ${item.title.slice(0, 100)}`);
    continue;
  }
  const official = isOfficial(page.url);
  stats.aiCalls++;
  const instructions = `Eres redactor de VICE HUB, una web independiente sobre GTA VI. Redacta en español de España. Solo puedes afirmar hechos sustentados por el texto de la fuente suministrada. No inventes misiones, mecánicas, trucos, personajes, vehículos, localizaciones, fechas ni capturas. El texto puede contener navegación, publicidad o material no relacionado: ignóralo. Si no hay datos específicos suficientes para una guía útil sobre GTA VI, devuelve decision="skip". No conviertas noticias sin información práctica en guías. Una página promocional genérica sin datos concretos también debe descartarse. En filtraciones o rumores, usa decision="draft" y explica incertidumbre. En fuentes secundarias, siempre decision="draft". Solo una fuente oficial Rockstar con hechos específicos verificables puede recibir decision="publish". Redacta entre 500 y 800 palabras solo si los datos permiten esa longitud sin relleno; usa apartados y párrafos con doble salto de línea. Indica qué se sabe y qué sigue sin confirmarse. No afirmes haber consultado más fuentes. Devuelve únicamente JSON con decision (publish|draft|skip), title, summary, body, reason.`;
  try {
    const completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: JSON.stringify({ title: item.title, source: item.source, url: page.url, text: page.body }) }
      ]
    });
    const out = JSON.parse(completion.choices[0]?.message?.content || '{}');
    if (!['draft', 'publish'].includes(out.decision)) {
      stats.skipped++;
      console.log(`IA descartó: ${String(out.reason || item.title).slice(0, 200)}`);
      continue;
    }
    const title = String(out.title || '').trim().slice(0, 180);
    const summary = String(out.summary || '').trim().slice(0, 600);
    const body = String(out.body || '').trim().slice(0, 16000);
    if (title.length < 20 || summary.length < 40 || body.length < 500) {
      stats.skipped++;
      console.log('IA devolvió guía demasiado breve; descartada.');
      continue;
    }
    const published = official && out.decision === 'publish';
    const record = {
      title, summary, body,
      slug: `${slug(title) || 'guia'}-${hash(page.url)}`,
      kind: 'guide', status: published ? 'published' : 'draft',
      published_at: published ? new Date().toISOString() : null,
      source_url: page.url, source_name: new URL(page.url).hostname,
      verification_level: official ? 'official' : 'secondary',
      category: 'guias', featured: false,
      verification_notes: `AutoGuides 1.1 · ${String(out.reason || 'Revisión pendiente').slice(0, 450)} · Fuente única: ${page.url} · Sin corroboración independiente`
    };
    const { error } = await db.from('articles').insert(record);
    if (error?.code === '23505') { console.log('Guía duplicada (restricción de base de datos).'); continue; }
    if (error) throw error;
    console.log(`${published ? 'Guía publicada' : 'Guía enviada a borradores'}: ${title}`);
    console.log('Resumen:', JSON.stringify(stats));
    process.exit(0);
  } catch (e) {
    // Los errores de base de datos y configuración deben hacer fallar el workflow.
    console.error(`Error procesando ${item.title}:`, e);
    throw e;
  }
}
console.log(`AutoGuides: sin nuevas guías aptas; ${candidates.length} candidatas, ${stats.aiCalls} llamadas IA.`);
console.log('Diagnóstico:', JSON.stringify(stats));
