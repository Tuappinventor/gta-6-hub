/* Guías publicadas por VICE HUB. */
(() => {
  'use strict';

  const status = document.getElementById('guideArticlesStatus');
  const grid = document.getElementById('guideArticles');

  function card(item) {
    const article = document.createElement('article');
    article.className = 'card';

    if (/^https:\/\//i.test(item.image_url || '')) {
      const image = document.createElement('img');
      image.className = 'guide-cover';
      image.src = item.image_url;
      image.alt = item.title;
      image.loading = 'lazy';
      image.addEventListener('error', () => image.remove());
      article.append(image);
    }

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = item.published_at
      ? 'Guía · ' + new Date(item.published_at).toLocaleDateString('es-ES')
      : 'Guía';
    const title = document.createElement('h3');
    title.textContent = item.title;
    const summary = document.createElement('p');
    summary.textContent = item.summary || '';
    article.append(tag, title, summary);

    if (/^[a-z0-9-]+$/.test(item.slug || '')) {
      const link = document.createElement('a');
      link.className = 'guide-link';
      link.href = '/articulo/' + encodeURIComponent(item.slug);
      link.textContent = 'Leer guía';
      article.append(link);
      window.ViceShare?.mount(article, { title: item.title, url: link.href });
    } else {
      const details = document.createElement('details');
      const trigger = document.createElement('summary');
      trigger.textContent = 'Leer guía';
      const body = document.createElement('p');
      body.className = 'guide-full';
      body.textContent = item.body || '';
      details.append(trigger, body);
      if (/^https?:\/\//i.test(item.source_url || '')) {
        const source = document.createElement('a');
        source.className = 'guide-link';
        source.href = item.source_url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = 'Consultar fuente';
        details.append(source);
      }
      article.append(details);
    }

    return article;
  }

  async function load() {
    const config = window.VICEHUB_CONFIG;
    if (!config?.url || !config?.anonKey || !window.supabase) {
      status.textContent = 'No se pudo conectar con Supabase.';
      return;
    }
    const db = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'vicehub-guide-articles' }
    });
    const { data, error } = await db.from('articles')
      .select('slug,title,summary,body,source_url,published_at,image_url')
      .eq('kind', 'guide')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const guides = data || [];
    status.textContent = guides.length === 1 ? '1 guía publicada'
      : guides.length ? guides.length + ' guías publicadas' : 'Todavía no hay guías publicadas.';
    grid.replaceChildren(...guides.map(card));
  }

  window.addEventListener('vicehub:guides-open', () => {
    load().catch(() => { status.textContent = 'No se pudieron cargar las guías. Recarga para volver a intentarlo.'; });
  }, { once: true });
})();
