const HOUR = 60 * 60 * 1000;
export const NEWS_WINDOW = 48 * HOUR;
const GTA_VI = /\b(?:gta|grand\s*theft\s*auto)[\s_-]*(?:6|vi)\b/i;

const publishers = [
  ['VidaExtra', 'https://www.vidaextra.com/index.xml'],
  ['3DJuegos', 'https://www.3djuegos.com/index.xml'],
  ['Eurogamer', 'https://www.eurogamer.net/feed'],
  ['VGC', 'https://www.videogameschronicle.com/feed/'],
  ['GamesRadar+', 'https://www.gamesradar.com/feeds/all/'],
  ['PC Gamer', 'https://www.pcgamer.com/feeds/all/'],
  ['Insider Gaming', 'https://insider-gaming.com/feed/']
];

function bingNews(terms, market) {
  return 'https://www.bing.com/news/search?' + new URLSearchParams({
    q: '("GTA 6" OR "GTA VI")' + terms,
    format: 'rss',
    setlang: market
  });
}

export const newsFeeds = [
  ...publishers.map(([name, url]) => ({ name, url })),
  { name: 'Bing News · GTA VI', url: bingNews('', 'es-ES'), aggregator: true },
  {
    name: 'Bing News · Jugadores de GTA VI',
    url: bingNews(' (clip OR viral OR funny OR jugadores OR glitch OR stunt)', 'en-US'),
    aggregator: true
  }
];

const communityTerms = /\b(?:clip[s]?|viral|funny|hilarious|stunts?|glitch(?:es)?|bugs?|speedrun(?:ners?)?|challenges?|discovery|easter eggs?|reto[s]?|jugadores?|divertid[oa]s?|curios[oa]s?|hallazgo[s]?|descubrimiento[s]?|captura[s]?|virtual\s*photography)\b/i;

function host(value) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
}

function articlePath(value) {
  return new URL(value).pathname.replace(/\/$/, '');
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) {
      url.hash = '';
      for (const key of [...url.searchParams.keys()]) {
        if (/^(?:utm_.*|gclid|fbclid)$/i.test(key)) url.searchParams.delete(key);
      }
      return url.href;
    }
  } catch {
    return '';
  }
  return '';
}

export function isRecent(value, now) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= now - NEWS_WINDOW && time <= now + 5 * 60 * 1000;
}

export function stripHtml(s) {
  return String(s || '')
    .replace(/<(script|style|noscript|svg|aside|footer|header|nav)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|lt|gt|#160);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const guideTitle = /(?:^\s*(?:how to|cómo)\s+(?:unlock|find|complete|get|use|repair|change|conseguir|desbloquear|completar|usar|reparar|modificar|robar|encontrar)\b|\b(?:walkthrough|locations and rewards|guía completa)\b)/i;

function readRssItem(entry, feed, now) {
  // For Atom use the original publication date rather than the last update.
  const date = entry.pubDate || entry.isoDate;
  const title = stripHtml(entry.title).slice(0, 300);
  const excerpt = stripHtml(entry.contentSnippet || entry.content).slice(0, 1800);
  let url = httpsUrl(entry.link);
  if (!isRecent(date, now) || !url || !GTA_VI.test(title) || guideTitle.test(title)) return null;

  if (feed.aggregator && host(url) === 'bing.com') {
    url = httpsUrl(new URL(url).searchParams.get('url'));
    if (!url || host(url) === 'bing.com') return null;
  }
  return {
    title, excerpt, url, date: new Date(date).toISOString(), sourceName: feed.name,
    publisherHost: feed.aggregator ? null : host(feed.url),
    communityCandidate: communityTerms.test(title)
  };
}

function readCommunityPost(post, now) {
  const { author, record, embed } = post;
  if (record?.$type !== 'app.bsky.feed.post' || record.reply ||
      !['app.bsky.embed.images#view', 'app.bsky.embed.video#view'].includes(embed?.$type) ||
      !isRecent(record.createdAt, now) || !isRecent(post.indexedAt, now)) {
    return null;
  }
  const text = String(record.text || '');
  const captions = embed.images?.map(image => image.alt).filter(Boolean) || [embed.alt].filter(Boolean);
  const excerpt = [text, ...captions].join('\n').trim().slice(0, 2500);
  const match = String(post.uri || '').match(/^at:\/\/(did:[a-z0-9]+:[a-zA-Z0-9.:%-]+)\/app\.bsky\.feed\.post\/([a-zA-Z0-9._~:-]+)$/);
  if (!match || match[1] !== author?.did || !GTA_VI.test(excerpt) || text.trim().length < 30) return null;

  const url = 'https://bsky.app/profile/' + match[1] + '/post/' + match[2];
  return {
    title: text.split('\n')[0].slice(0, 300),
    excerpt,
    url,
    date: new Date(record.createdAt).toISOString(),
    sourceName: '@' + (author.handle || author.did) + ' · Bluesky',
    community: true,
    communityCandidate: true
  };
}

export async function findNews(parser, now) {
  const feeds = newsFeeds.map(feed => ({
    name: feed.name,
    async read() {
      const result = await parser.parseURL(feed.url);
      return (result.items || []).map(entry => readRssItem(entry, feed, now)).filter(Boolean);
    }
  }));

  for (const query of ['GTA6', '"GTA VI"']) {
    feeds.push({
      name: 'Bluesky · ' + query,
      async read() {
        const params = new URLSearchParams({
          q: query,
          sort: 'latest',
          limit: '50',
          since: new Date(now - NEWS_WINDOW).toISOString()
        });
        const response = await fetch('https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?' + params, {
          signal: AbortSignal.timeout(12000),
          headers: { Accept: 'application/json', 'User-Agent': 'VICEHUB-AutoNews/3.7' }
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const { posts } = await response.json();
        if (!Array.isArray(posts)) throw new Error('Respuesta sin lista de publicaciones');
        return posts.map(post => readCommunityPost(post, now)).filter(Boolean);
      }
    });
  }

  const results = await Promise.allSettled(feeds.map(feed => feed.read()));
  const items = [];
  let feedsFailed = 0;
  results.forEach((result, index) => {
    const name = feeds[index].name;
    if (result.status === 'fulfilled') {
      console.log('Fuente consultada: ' + name + ' (' + result.value.length + ' candidatas)');
      items.push(...result.value);
    } else {
      feedsFailed++;
      console.warn('Fuente no disponible: ' + name + ' · ' + result.reason.message);
    }
  });
  return { items, feedsFailed, feedsOk: feeds.length - feedsFailed };
}

function attributes(tag) {
  return Object.fromEntries(
    Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
      ([, key, double, single, bare]) => [key.toLowerCase(), double ?? single ?? bare])
  );
}

function publishedDates(html) {
  const dates = [];
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = attributes(tag);
    if (/^(?:article:published_time|og:article:published_time|datepublished|pubdate|parsely-pub-date)$/i
      .test(attr.property || attr.name || attr.itemprop || '')) {
      dates.push(attr.content);
    }
  }

  // dateModified and generic <time> tags can refer to later edits or unrelated links.
  for (const [, json] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(json);
      const nodes = Array.isArray(data) ? data : [data, ...(data?.['@graph'] || [])];
      for (const node of nodes) {
        if ([node?.['@type']].flat().some(type => /(?:Article|BlogPosting|Report)$/i.test(type || ''))) {
          dates.push(node.datePublished);
        }
      }
    } catch {
      // Some pages include invalid structured data alongside valid metadata.
    }
  }

  return dates.filter(value => Number.isFinite(Date.parse(value)));
}

export async function readOriginal(item, now) {
  if (item.community) {
    return { url: item.url, date: item.date, text: item.excerpt, author: item.sourceName };
  }
  try {
    const response = await fetch(item.url, {
      signal: AbortSignal.timeout(8500),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VICEHUB/3.7)', Accept: 'text/html' }
    });
    const url = httpsUrl(response.url);
    if (!response.ok || !url || !/^text\/html\b/i.test(response.headers.get('content-type') || '')) {
      return null;
    }

    const html = (await response.text()).slice(0, 650000);
    const dates = publishedDates(html);
    // If the publisher provides conflicting dates, use the oldest publication date.
    const time = dates.length ? Math.min(...dates.map(value => Date.parse(value))) : null;
    const samePublisherArticle = item.publisherHost === host(url) &&
      host(item.url) === host(url) && articlePath(item.url) === articlePath(url) &&
      articlePath(url).length > 1;
    const date = time === null ? (samePublisherArticle ? item.date : null) : new Date(time).toISOString();
    if (!date || !isRecent(date, now)) return null;

    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1];
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1];
    const text = stripHtml(article || main).slice(0, 16000);
    const title = stripHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]);
    if (text.length < 350 || !GTA_VI.test(title + ' ' + text)) return null;
    return { url, date, title, text };
  } catch (error) {
    console.warn('Artículo original no accesible: ' + item.sourceName + ' · ' + error.message);
    return null;
  }
}

export function hasRecentEvidence(result, original, now) {
  const date = result.event_date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(date);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return false;

  const earliest = new Date(now - NEWS_WINDOW).toISOString().slice(0, 10);
  const latest = original.date.slice(0, 10);
  const evidence = typeof result.event_evidence === 'string'
    ? result.event_evidence.trim().replace(/\s+/g, ' ') : '';
  return date >= earliest && date <= latest && evidence.length >= 12 &&
    original.text.replace(/\s+/g, ' ').includes(evidence);
}
