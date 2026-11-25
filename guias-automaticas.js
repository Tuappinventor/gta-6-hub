/* Guías publicadas por VICE HUB. */
(() => {
  'use strict';

  const status = document.getElementById('guideArticlesStatus');
  const grid = document.getElementById('guideArticles');

  function card(item) {
    const article = document.createElement('article');
    article.className = 'guide-article';
    const content = document.createElement('div');
    content.className = 'guide-content';

    if (/^https:\/\//i.test(item.image_url || '')) {
      const image = document.createElement('img');
      image.className = 'guide-cover';
      image.src = item.image_url;
      image.alt = item.title;
      image.loading = 'lazy';
      article.classList.add('has-cover');
      image.addEventListener('error', () => {
        image.remove();
        article.classList.remove('has-cover');
      });
      article.append(image);
    }

    if (item.published_at) {
      const published = new Date(item.published_at);
      const date = document.createElement('time');
      date.className = 'guide-meta';
      date.dateTime = item.published_at;
      date.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(published);
      content.append(date);
    }
    const title = document.createElement('h3');
    title.textContent = item.title;
    content.append(title);
    if (item.summary) {
      const summary = document.createElement('p');
      summary.className = 'muted';
      summary.textContent = item.summary;
      content.append(summary);
    }

    if (/^[a-z0-9-]+$/.test(item.slug || '')) {
      const link = document.createElement('a');
      link.className = 'guide-read';
      link.href = '/articulo/' + encodeURIComponent(item.slug);
      link.textContent = 'Leer guía';
      content.append(link);
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
      content.append(details);
    }

    article.append(content);
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
    status.textContent = guides.length ? '' : 'Todavía no hay guías publicadas.';
    grid.replaceChildren(...guides.map(card));
  }

  window.addEventListener('vicehub:guides-open', () => {
    load().catch(() => { status.textContent = 'No se pudieron cargar las guías. Recarga para volver a intentarlo.'; });
  }, { once: true });
})();
