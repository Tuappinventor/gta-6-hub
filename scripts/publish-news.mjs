
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// VICE HUB AutoNews 3.3
// Artículos ampliados y documentados.
// Mantiene los límites, borradores y verificaciones de AutoNews 3.2.

for (const name of [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
]) {
  if (!process.env[name]) {
    throw new Error(`Falta ${name}`);
  }
}

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const parser = new Parser({
  timeout: 12000,
  headers: {
    'User-Agent': 'VICEHUB-AutoNews/3.3'
  }
});

const feeds = [
  {
    name: 'Google News · GTA VI',
    url: 'https://news.google.com/rss/search?q=%22GTA+6%22+OR+%22GTA+VI%22&hl=es&gl=ES&ceid=ES:es'
  },
  {
    name: 'Google News · Rockstar GTA VI',
    url: 'https://news.google.com/rss/search?q=%22Rockstar+Games%22+%22GTA+VI%22&hl=en&gl=US&ceid=US:en'
  }
];

const hash = s =>
  createHash('sha256')
    .update(s)
    .digest('hex')
    .slice(0, 12);

const slugify = s =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 105);

function validUrl(s) {
  try {
    const u = new URL(s);
    return ['https:', 'http:'].includes(u.protocol)
      ? u.href
      : '';
  } catch {
    return '';
  }
}

const stripHtml = s =>
  String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|lt|gt);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const wait = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const now = Date.now();

const dayStart = new Date();
dayStart.setUTCHours(0, 0, 0, 0);

// Mantener máximo de tres publicaciones diarias.

const { count, error: countError } = await db
  .from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'published')
  .not('source_url', 'is', null)
  .gte('published_at', dayStart.toISOString());

if (countError) throw countError;

const remaining = Math.max(0, 3 - (count || 0));

console.log(
  `AutoNews 3.3 · Publicadas hoy: ${count || 0}; disponibles: ${remaining}`
);

if (!remaining) {
  console.log('Límite diario de publicaciones alcanzado.');
  process.exit(0);
}

// Recuperación ampliada del artículo original.
// No considera Google News una fuente primaria.

async function fetchOriginal(url) {
  try {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      9000
    );

    let response;

    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; VICEHUB/3.3)',
          Accept: 'text/html'
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const finalUrl = validUrl(response.url);

    if (
      !finalUrl ||
      /(^|\.)news\.google\.com$/i.test(
        new URL(finalUrl).hostname
      )
    ) {
      return null;
    }

    if (
      !String(
        response.headers.get('content-type') || ''
      ).includes('text/html')
    ) {
      return null;
    }

    const html = (await response.text())
      .slice(0, 350000);

    const title = stripHtml(
      html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      )?.[1] || ''
    );

    const description = stripHtml(
      html.match(
        /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)/i
      )?.[1] || ''
    );

    const text = stripHtml(
      html.replace(
        /<(?:header|footer|nav|aside)[\s\S]*?<\/(?:header|footer|nav|aside)>/gi,
        ' '
      )
    ).slice(0, 14000);

    if (text.length < 450) return null;

    return {
      url: finalUrl,
      title,
      description,
      text
    };

  } catch (error) {
    console.warn(
      `Artículo original no accesible: ${error.message}`
    );
    return null;
  }
}

// Consultar RSS.

const items = [];

for (const feed of feeds) {
  try {
    const parsed = await parser.parseURL(feed.url);

    for (const entry of parsed.items || []) {
      const date = new Date(
        entry.isoDate || entry.pubDate || ''
      );

      const url = validUrl(entry.link || '');

      if (
        !url ||
        !Number.isFinite(date.getTime())
      ) {
        continue;
      }

      if (
        date.getTime() > now + 3600000 ||
        now - date.getTime() > 48 * 3600000
      ) {
        continue;
      }

      const title = stripHtml(entry.title)
        .slice(0, 300);

      if (
        !/\b(gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi))\b/i.test(title)
      ) {
        continue;
      }

      items.push({
        title,
        url,
        excerpt: stripHtml(
          entry.contentSnippet || entry.content
        ).slice(0, 1800),
        date: date.toISOString(),
        feed: feed.name
      });
    }

    console.log(`RSS leído: ${feed.name}`);

  } catch (error) {
    console.warn(
      `RSS no disponible: ${feed.name}: ${error.message}`
    );
  }
}

items.sort((a, b) =>
  b.date.localeCompare(a.date)
);

const seen = new Set();

let published = 0;
let drafts = 0;
let calls = 0;

const maxCalls = 3;

// Instrucciones editoriales ampliadas.

const instructions = `
Eres periodista y editor de VICE HUB,
un periódico independiente especializado en GTA VI.

IDIOMA:
Escribe exclusivamente en español de España.

OBJETIVO:
Redactar noticias completas, documentadas,
rigurosas, claras y útiles para los lectores.

EXTENSIÓN:
El cuerpo del artículo debe tener una extensión
objetivo de entre 500 y 800 palabras cuando
la fuente contenga suficiente información.

Si no existe información suficiente, escribe
un artículo más breve y preciso.

Nunca inventes datos ni repitas ideas para
alcanzar una extensión determinada.

ESTRUCTURA DEL ARTÍCULO:

1. INTRODUCCIÓN
Explica el acontecimiento principal, qué ha
ocurrido y por qué es relevante para GTA VI.

2. INFORMACIÓN CONFIRMADA
Desarrolla los hechos que estén respaldados
por el contenido proporcionado.

Incluye fechas, declaraciones y cifras
únicamente cuando aparezcan de manera
explícita y atribuible en la fuente.

3. CONTEXTO Y ANTECEDENTES
Explica los antecedentes que estén
documentados en el material disponible.

No añadas conocimientos externos que
no puedan comprobarse con la fuente.

4. IMPORTANCIA PARA LOS JUGADORES
Explica las consecuencias prácticas de
la información, distinguiendo claramente
los hechos de cualquier interpretación.

5. QUÉ ESTÁ CONFIRMADO Y QUÉ NO
Cuando sea relevante, diferencia
la información confirmada, los rumores
y los aspectos pendientes de aclarar.

6. CONCLUSIÓN
Cierra el artículo con un resumen informativo,
sin especulaciones injustificadas.

ESTILO:
- Periodismo profesional.
- Párrafos bien desarrollados.
- Lenguaje natural y fluido.
- Sin sensacionalismo.
- Sin titulares engañosos.
- Sin copiar fragmentos extensos.
- Sin citas inventadas.
- Sin contenido repetitivo.
- Sin afirmaciones que no estén respaldadas.

FUENTES Y VERIFICACIÓN:

Dispones de una entrada RSS y, cuando existe,
del texto recuperado del artículo original.

El RSS de Google News NO es una fuente primaria.

Si no hay artículo original accesible,
debes marcar decision="draft".

No afirmes que has contrastado varias fuentes:
solo se proporciona una fuente y no existe
corroboración independiente.

Si una noticia incluye cifras económicas,
fechas de lanzamiento, ventas, filtraciones,
declaraciones o afirmaciones extraordinarias
sin atribución explícita y comprobable,
marca decision="draft".

Para publicar automáticamente, exige
un hecho concreto y atribuible a la fuente
recuperada, sin contradicciones ni señales
de especulación.

Los rumores y filtraciones siempre
deben quedar como borradores.

Nunca marques verification_level="official"
salvo que la URL original pertenezca
claramente a un dominio oficial de
Rockstar Games y confirme la información.

Si el artículo carece de información
suficiente para una noticia útil,
puedes utilizar decision="skip".

CLASIFICACIÓN:

verification_level:
official, secondary, unverified.

category:
actualidad, rumores, filtraciones,
trailers, guias.

FORMATO:
Devuelve exclusivamente JSON válido:

{
  "decision": "publish|draft|skip",
  "title": "",
  "summary": "",
  "body": "",
  "category": "actualidad|rumores|filtraciones|trailers|guias",
  "verification_level": "official|secondary|unverified",
  "reason": ""
}

El título debe ser informativo y atractivo
sin exagerar.

El resumen debe explicar la noticia
en aproximadamente 40-80 palabras.

El cuerpo debe estar dividido en párrafos
separados por saltos de línea dobles.

No añadas URL ficticias.

La razón debe explicar brevemente
la decisión editorial y sus limitaciones
de verificación.
`;

// Procesar noticias nuevas.

for (const item of items) {
  if (
    published >= Math.min(1, remaining) ||
    calls >= maxCalls
  ) {
    break;
  }

  if (seen.has(item.url)) continue;
  seen.add(item.url);

  const {
    data: previous,
    error: previousError
  } = await db
    .from('articles')
    .select('id')
    .eq('source_url', item.url)
    .limit(1);

  if (previousError) throw previousError;
  if (previous?.length) continue;

  const original = await fetchOriginal(item.url);
  const sourceUrl = original?.url || item.url;

  if (sourceUrl !== item.url) {
    const { data: dup, error } = await db
      .from('articles')
      .select('id')
      .eq('source_url', sourceUrl)
      .limit(1);

    if (error) throw error;
    if (dup?.length) continue;
  }

  calls++;

  let result;

  try {
    const response = await ai.chat.completions.create({
      model:
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: {
        type: 'json_object'
      },
      messages: [
        {
          role: 'system',
          content: instructions
        },
        {
          role: 'user',
          content: JSON.stringify({
            rss: item,
            original
          })
        }
      ]
    });

    result = JSON.parse(
      response.choices[0]?.message?.content || '{}'
    );

  } catch (error) {
    console.error(
      `OpenAI: ${error.status || 'error'} ${
        error.code || error.message
      }`
    );
    throw error;
  }

  if (result.decision === 'skip') {
    console.log(
      `Descartada: ${String(result.reason || '').slice(0, 140)}`
    );
    continue;
  }

  const title = String(result.title || '')
    .trim()
    .slice(0, 180);

  const summary = String(result.summary || '')
    .trim()
    .slice(0, 600);

  const body = String(result.body || '')
    .trim()
    .slice(0, 16000);

  if (
    title.length < 20 ||
    summary.length < 40 ||
    body.length < 180
  ) {
    console.log(
      'Descartada: texto insuficiente'
    );
    continue;
  }

  const category = [
    'actualidad',
    'rumores',
    'filtraciones',
    'trailers',
    'guias'
  ].includes(result.category)
    ? result.category
    : 'actualidad';

  const hostname = original
    ? new URL(original.url).hostname.toLowerCase()
    : '';

  const officialDomain =
    hostname === 'rockstargames.com' ||
    hostname.endsWith('.rockstargames.com');

  const verification_level =
    officialDomain &&
    result.verification_level === 'official'
      ? 'official'
      : original &&
        result.verification_level !== 'unverified'
        ? 'secondary'
        : 'unverified';

  const suspicious =
    /\b(?:mil(?:es)?\s+de\s+millones|billones|\$\s?\d+|\d+[,.]\d+\s*(?:millones|billion))\b/i.test(
      `${title} ${summary}`
    );

  const safeToPublish =
    result.decision === 'publish' &&
    !!original &&
    !suspicious &&
    !['rumores', 'filtraciones'].includes(category) &&
    verification_level !== 'unverified';

  const status = safeToPublish
    ? 'published'
    : 'draft';

  const record = {
    title,
    summary,
    body,
    slug: `${
      slugify(title) || 'noticia'
    }-${hash(sourceUrl)}`,
    kind: 'news',
    status,
    published_at:
      status === 'published'
        ? new Date().toISOString()
        : null,
    source_url: sourceUrl,
    source_name: original
      ? new URL(original.url).hostname
      : item.feed,
    verification_level,
    category,
    featured: false,
    verification_notes:
      `AutoNews 3.3 · ${
        String(
          result.reason || 'Revisión pendiente'
        ).slice(0, 600)
      } · Artículo original: ${
        original ? 'recuperado' : 'no accesible'
      } · Corroboración independiente: no realizada`
  };

  const { error } = await db
    .from('articles')
    .insert(record);

  if (error?.code === '23505') continue;
  if (error) throw error;

  if (safeToPublish) {
    published++;
    console.log(`Publicada: ${title}`);
  } else {
    drafts++;
    console.log(
      `Borrador para revisión: ${title}`
    );
  }

  await wait(200);
}

console.log(
  `Resultado: ${published} publicadas; ${
    drafts
  } borradores; ${items.length} entradas RSS; ${
    calls
  } llamadas IA`
);
