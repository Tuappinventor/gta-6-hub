
/* ==========================================
   VICE HUB 3.5 — Portal principal
   Portada, categorías y noticias destacadas
   Compatible con portal-v31.js
========================================== */

(() => {
  'use strict';

  const cfg = window.VICEHUB_CONFIG || {};

  if (!cfg.url || !cfg.anonKey ||
      !window.supabase) return;

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

  const CATEGORIES = {
    actualidad: 'Actualidad',
    rumores: 'Rumores',
    filtraciones: 'Filtraciones',
    trailers: 'Tráilers',
    lanzamiento: 'Lanzamiento',
    actualizaciones: 'Actualizaciones',
    gameplay: 'Gameplay',
    mapa: 'Mapa y localizaciones',
    personajes: 'Personajes',
    vehiculos: 'Vehículos',
    armas: 'Armas',
    propiedades: 'Propiedades y negocios',
    musica: 'Música y radio',
    online: 'GTA Online',
    guias: 'Guías',
    trucos: 'Trucos y códigos',
    dinero: 'Dinero',
    misiones: 'Misiones',
    coleccionables: 'Coleccionables',
    secretos: 'Secretos y Easter Eggs',
    logros: 'Logros y trofeos',
    curiosidades: 'Curiosidades',
    rendimiento: 'Rendimiento y plataformas',
    errores: 'Errores y soluciones'
  };

  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  const validUrl = value => {
    try {
      const url = new URL(value);

      return url.protocol === 'https:'
        ? url.href
        : '';

    } catch {
      return '';
    }
  };

  const date = value => {
    if (!value) return '';

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-ES');
  };

  const home = document.getElementById('inicio');
  const news = document.getElementById('noticias');

  if (!home || !news) return;

  let items = [];
  let selectedCategory = 'all';
  let selectedType = 'all';
  let visibleLimit = 12;

  // Ocultar la portada editorial anterior.

  const old = home.querySelector('#homeEditorial');

  if (old) old.hidden = true;

  // Evitar duplicar la portada.

  document.getElementById('v3Portal')?.remove();

  const mount = document.createElement('div');

  mount.id = 'v3Portal';

  home.insertBefore(
    mount,
    home.firstChild
  );

  // El apartado Noticias ya dispone de
  // sus propios filtros en news-ui.js.

  document.getElementById('v3Categories')?.remove();

  function getCategories(article) {
    return [
      ...new Set([
        article.category,
        ...(Array.isArray(article.categories)
          ? article.categories
          : []),
        ...(article.kind === 'guide'
          ? ['guias']
          : [])
      ].filter(Boolean))
    ];
  }

  function getCategoryName(article) {
    const category =
      article.category ||
      (article.kind === 'guide'
        ? 'guias'
        : 'actualidad');

    return CATEGORIES[category] || 'Actualidad';
  }

  function verificationName(article) {
    switch (article.verification_level) {
      case 'official':
        return 'Fuente oficial';

      case 'secondary':
        return 'Fuente secundaria';

      default:
        return 'Sin verificar';
    }
  }

  function matchesType(article) {
    return (
      selectedType === 'all' ||
      article.kind === selectedType
    );
  }

  function matchesCategory(article) {
    if (selectedCategory === 'all') {
      return true;
    }

    if (selectedCategory === 'official') {
      return article.verification_level === 'official';
    }

    return getCategories(article)
      .includes(selectedCategory);
  }

  function categoryCounts() {
    const counts = {};

    for (const article of items.filter(matchesType)) {
      for (const category of getCategories(article)) {
        counts[category] =
          (counts[category] || 0) + 1;
      }

      if (article.verification_level === 'official') {
        counts.official =
          (counts.official || 0) + 1;
      }
    }

    return counts;
  }

  function categoryButtons() {
    const counts = categoryCounts();

    const available = [
      ['all', 'Todas'],
      ['official', 'Oficial'],
      ...Object.entries(CATEGORIES)
    ].filter(([key]) =>
      key === 'all' || counts[key] > 0
    );

    if (
      selectedCategory !== 'all' &&
      !counts[selectedCategory]
    ) {
      selectedCategory = 'all';
    }

    return `
      <div class="v3-cats"
           aria-label="Categorías de portada">

        ${available.map(([key, name]) => `
          <button
            type="button"
            data-v3-cat="${esc(key)}"
            class="${
              selectedCategory === key
                ? 'active'
                : ''
            }"
            aria-pressed="${
              selectedCategory === key
            }"
          >
            ${esc(name)}
            ${key !== 'all'
              ? ` (${counts[key]})`
              : ''}
          </button>
        `).join('')}

      </div>
    `;
  }

  function typeButtons() {
    const types = [
      ['all', 'Todo'],
      ['news', 'Noticias'],
      ['guide', 'Guías']
    ];

    return `
      <div class="v3-cats"
           aria-label="Tipo de publicación">

        ${types.map(([key, name]) => `
          <button
            type="button"
            data-v3-type="${esc(key)}"
            class="${
              selectedType === key
                ? 'active'
                : ''
            }"
            aria-pressed="${
              selectedType === key
            }"
          >
            ${esc(name)}
          </button>
        `).join('')}

      </div>
    `;
  }

  function card(article, featured = false) {
    const image = validUrl(article.image_url);

    const cover = image
      ? `
        <img
          loading="${featured ? 'eager' : 'lazy'}"
          decoding="async"
          src="${esc(image)}"
          alt="${esc(
            article.image_credit ||
            article.title
          )}"
        >
      `
      : 'VI';

    const heading = featured
      ? `<h2>${esc(article.title)}</h2>`
      : `<h3>${esc(article.title)}</h3>`;

    const categories = getCategories(article);

    const extraCategories = categories
      .filter(c => c !== article.category)
      .slice(0, 3)
      .map(c => CATEGORIES[c] || c)
      .join(' · ');

    const sourceText = [
      article.source_name || 'VICE HUB',
      verificationName(article)
    ].join(' · ');

    const type =
      article.kind === 'guide'
        ? 'GUÍA'
        : 'NOTICIA';

    return `
      <article class="v3-feature">

        <div class="v3-cover">
          ${cover}
        </div>

        <div class="v3-copy">

          <span class="v3-label">
            ${type}
            ·
            ${esc(getCategoryName(article))}
            ·
            ${esc(date(article.published_at))}
          </span>

          ${heading}

          <p>
            ${esc(article.summary || '')}
          </p>

          ${extraCategories
            ? `
              <p class="v3-label">
                ${esc(extraCategories)}
              </p>
            `
            : ''
          }

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
  }

  function render() {
    // Actualizar las categorías disponibles
    // antes de filtrar las publicaciones.

    const categoriesHTML = categoryButtons();

    const filtered = items.filter(article =>
      matchesType(article) &&
      matchesCategory(article)
    );

    const visible = filtered.slice(
      0,
      visibleLimit
    );

    mount.innerHTML = `
      <div class="v3-label">
        VICE HUB · PORTADA DIGITAL
      </div>

      <h1>GTA VI: últimas noticias</h1>

      <p class="muted">
        Actualidad, guías, trucos y novedades
        del universo de Grand Theft Auto VI.
      </p>

      ${typeButtons()}

      ${categoriesHTML}

      <p class="muted">
        ${filtered.length}
        publicaciones disponibles
      </p>

      ${
        visible.length
          ? `
            <div class="v3-hero">

              ${card(visible[0], true)}

              ${visible.length > 1
                ? `
                  <div class="v3-side">
                    ${visible.slice(1, 3)
                      .map(article => card(article))
                      .join('')}
                  </div>
                `
                : ''
              }

            </div>

            ${
              visible.length > 3
                ? `
                  <h2>Más publicaciones</h2>

                  <div class="v3-list">
                    ${visible.slice(3)
                      .map(article => card(article))
                      .join('')}
                  </div>
                `
                : ''
            }

            ${
              filtered.length > visibleLimit
                ? `
                  <div class="v3-cats">
                    <button
                      type="button"
                      data-v3-more="true"
                    >
                      Cargar más publicaciones
                    </button>
                  </div>
                `
                : ''
            }
          `
          : `
            <p class="v3-empty">
              No hay publicaciones en esta categoría.
            </p>
          `
      }
    `;
  }

  function openArticle(article) {
    // Mantener URLs indexables.

    if (
      article.slug &&
      /^[a-z0-9-]+$/.test(article.slug)
    ) {
      window.location.assign(
        `/articulo/${encodeURIComponent(article.slug)}`
      );

      return;
    }

    const url = new URL(window.location.href);

    url.searchParams.set(
      'articulo',
      article.slug || article.id
    );

    window.location.assign(url.toString());
  }

  mount.addEventListener('click', event => {
    const button = event.target.closest(
      '[data-v3-cat], ' +
      '[data-v3-type], ' +
      '[data-v3-open], ' +
      '[data-v3-more]'
    );

    if (!button) return;

    if (button.dataset.v3Cat) {
      selectedCategory = button.dataset.v3Cat;
      visibleLimit = 12;

      render();
      return;
    }

    if (button.dataset.v3Type) {
      selectedType = button.dataset.v3Type;
      selectedCategory = 'all';
      visibleLimit = 12;

      render();
      return;
    }

    if (button.dataset.v3More) {
      visibleLimit += 12;

      render();
      return;
    }

    const article = items.find(
      item =>
        String(item.id) === button.dataset.v3Open
    );

    if (article) {
      openArticle(article);
    }
  });

  async function loadArticles() {
    mount.innerHTML = `
      <p class="v3-empty">
        Cargando publicaciones…
      </p>
    `;

    try {
      const { data, error } = await db
        .from('articles')
        .select([
          'id',
          'slug',
          'title',
          'summary',
          'kind',
          'published_at',
          'source_url',
          'source_name',
          'verification_level',
          'category',
          'categories',
          'tags',
          'image_url',
          'image_credit',
          'featured'
        ].join(','))
        .eq('status', 'published')
        .order('published_at', {
          ascending: false
        })
        .limit(500);

      if (error) throw error;

      items = (data || []).sort((a, b) =>
        Number(Boolean(b.featured)) -
        Number(Boolean(a.featured)) ||
        (Date.parse(b.published_at) || 0) -
        (Date.parse(a.published_at) || 0)
      );

      render();

    } catch (error) {
      console.error(
        'VICE HUB 3.5:',
        error.message
      );

      mount.innerHTML = `
        <p class="v3-empty">
          No se pudieron cargar las publicaciones.
        </p>

        <button
          type="button"
          id="v3Retry"
        >
          Volver a intentar
        </button>
      `;

      document.getElementById('v3Retry')
        ?.addEventListener('click', loadArticles);
    }
  }

  loadArticles();

})();
