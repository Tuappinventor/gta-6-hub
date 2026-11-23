
/* VICE HUB · Portal v3
   Portada y noticias con categorías corregidas.
   Compatible con portal-v31.js y Supabase.
*/
(() => {
  'use strict';

  const cfg = window.VICEHUB_CONFIG || {};

  if (!cfg.url || !cfg.anonKey || !window.supabase) return;

  const db = window.supabase.createClient(
    cfg.url,
    cfg.anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const validUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  };

  const normalize = value =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const date = value => {
    if (!value) return '';
    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-ES');
  };

  const categories = [
    'Todas',
    'Oficial',
    'Rumores',
    'Filtraciones',
    'Tráilers',
    'Guías',
    'Actualidad'
  ];

  let items = [];
  let selectedCategory = 'Todas';

  const home = document.getElementById('inicio');
  const news = document.getElementById('noticias');

  if (!home || !news) return;

  const old = home.querySelector('#homeEditorial');
  if (old) old.hidden = true;

  const mount = document.createElement('div');
  mount.id = 'v3Portal';
  home.insertBefore(mount, home.firstChild);

  const newsMount = document.createElement('div');
  newsMount.id = 'v3Categories';

  news.insertBefore(
    newsMount,
    news.querySelector('#newsExperience') || news.firstChild
  );

  // Clasificación visible de cada noticia.
  const tag = article => {
    if (article.verification_level === 'official') {
      return 'Oficial';
    }

    const category = normalize(article.category);

    const names = {
      actualidad: 'Actualidad',
      rumores: 'Rumores',
      filtraciones: 'Filtraciones',
      trailers: 'Tráilers',
      guias: 'Guías'
    };

    return names[category] || 'Actualidad';
  };

  // Filtrado corregido.
  const matchesCategory = article => {
    const selected = normalize(selectedCategory);

    if (selected === 'todas') return true;

    if (selected === 'oficial') {
      return article.verification_level === 'official';
    }

    return normalize(article.category || 'actualidad') === selected;
  };

  const card = (article, featured = false) => {
    const image = validUrl(article.image_url);

    const cover = image
      ? `<img
          loading="lazy"
          src="${esc(image)}"
          alt="${esc(article.image_credit || article.title)}"
        >`
      : 'VI';

    const heading = featured
      ? `<h2>${esc(article.title)}</h2>`
      : `<h3>${esc(article.title)}</h3>`;

    const sourceText =
      `${article.source_name || 'VICE HUB'}${
        article.verification_level === 'official'
          ? ' · Fuente oficial'
          : article.source_url
            ? ' · Información externa'
            : ''
      }`;

    return `
      <article class="v3-feature">
        <div class="v3-cover">${cover}</div>

        <div class="v3-copy">
          <span class="v3-label">
            ${esc(tag(article))}
            ·
            ${esc(date(article.published_at))}
          </span>

          ${heading}

          <p>${esc(article.summary || '')}</p>

          <p class="v3-source">
            ${esc(sourceText)}
          </p>

          <button
            type="button"
            class="v3-read"
            data-v3-open="${esc(article.id)}"
          >
            Leer artículo →
          </button>
        </div>
      </article>
    `;
  };

  const categoryButtons = () => `
    <div class="v3-cats">
      ${categories.map(category => `
        <button
          type="button"
          data-v3-cat="${esc(category)}"
          class="${
            selectedCategory === category ? 'active' : ''
          }"
          aria-pressed="${
            selectedCategory === category
          }"
        >
          ${esc(category)}
        </button>
      `).join('')}
    </div>
  `;

  function render() {
    const filtered = items.filter(matchesCategory);

    mount.innerHTML = `
      <div class="v3-label">
        VICE HUB · PORTADA DIGITAL
      </div>

      <h1>GTA VI: últimas noticias</h1>

      <p class="muted">
        Actualidad, novedades y fuentes identificadas.
      </p>

      ${categoryButtons()}

      ${
        filtered.length
          ? `
            <div class="v3-hero">
              ${card(filtered[0], true)}

              <div class="v3-side">
                ${filtered.slice(1, 3).map(
                  article => card(article)
                ).join('')}
              </div>
            </div>

            ${
              filtered.length > 3
                ? `
                  <h2>Más noticias</h2>
                  <div class="v3-list">
                    ${filtered.slice(3, 12).map(
                      article => card(article)
                    ).join('')}
                  </div>
                `
                : ''
            }
          `
          : `
            <p class="v3-empty">
              No hay noticias publicadas en esta categoría.
            </p>
          `
      }
    `;

    newsMount.innerHTML = categoryButtons();
  }

  function openArticle(article) {
    const url = new URL(window.location.href);

    url.searchParams.set(
      'articulo',
      article.slug || article.id
    );

    window.location.assign(url.toString());
  }

  document.addEventListener('click', event => {
    const button = event.target.closest(
      '[data-v3-cat], [data-v3-open]'
    );

    if (!button) return;

    if (button.dataset.v3Cat) {
      selectedCategory = button.dataset.v3Cat;
      render();
      return;
    }

    const article = items.find(
      item => String(item.id) === button.dataset.v3Open
    );

    if (article) {
      openArticle(article);
    }
  });

  async function loadArticles() {
    mount.innerHTML = `
      <p class="v3-empty">Cargando noticias…</p>
    `;

    const { data, error } = await db
      .from('articles')
      .select(
        'id,slug,title,summary,kind,published_at,' +
        'source_url,source_name,verification_level,' +
        'category,image_url,image_credit,featured'
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('VICE HUB:', error.message);

      mount.innerHTML = `
        <p class="v3-empty">
          No se pudieron cargar las noticias.
        </p>
      `;

      return;
    }

    items = (data || []).sort((a, b) =>
      Number(Boolean(b.featured)) -
      Number(Boolean(a.featured)) ||
      new Date(b.published_at) -
      new Date(a.published_at)
    );

    render();
  }

  loadArticles();
})();
