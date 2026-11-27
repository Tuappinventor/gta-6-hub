import { articleSourceLabel, publicHeadline } from './article-verification.js';

/* VICE HUB 3.5 — Noticias, guías y categorías */

(() => {
  'use strict';

  const section = document.getElementById('noticias');
  const oldGrid = document.getElementById('newsGrid');
  const search = document.getElementById('newsSearch');
  const cfg = window.VICEHUB_CONFIG || {};

  if (!section || !oldGrid || !search) return;

  const CATEGORY_NAMES = {
    actualidad: 'Oficiales y actualidad',
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

  const VERIFICATION_NAMES = {
    official: 'Fuente oficial',
    secondary: 'Fuente secundaria',
    unverified: 'Sin verificar',
    unreviewed: 'Sin verificar'
  };

  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  const normalize = s =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const formatDate = s => {
    if (!s) return '';

    const d = new Date(s);

    return Number.isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat('es-ES', {
          dateStyle: 'medium'
        }).format(d);
  };

  const paragraphs = text =>
    String(text || '')
      .split(/\n\s*\n|\r\n\s*\r\n/)
      .map(s => s.trim())
      .filter(Boolean);

  const safeUrl = value => {
    try {
      const u = new URL(value);

      return ['https:', 'http:'].includes(u.protocol)
        ? u.href
        : '';
    } catch {
      return '';
    }
  };

  const db =
    cfg.url && cfg.anonKey && window.supabase
      ? window.supabase.createClient(
          cfg.url,
          cfg.anonKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          }
        )
      : null;

  oldGrid.hidden = true;

  search.placeholder =
    'Buscar noticias, guías, trucos, vehículos...';

  const root = document.createElement('div');

  root.id = 'newsExperience';

  root.innerHTML = `
    <div class="vh-news-top">
      <div>
        <span class="vh-eyebrow">
          VICE HUB · REDACCIÓN DIGITAL
        </span>

        <h2>Última hora en Vice City</h2>

        <p>
          Noticias, guías, trucos y toda la
          información sobre GTA VI.
        </p>
      </div>

      <div class="vh-news-count" id="vhNewsCount">
        Cargando…
      </div>
    </div>

    <div class="vh-news-filters"
         aria-label="Filtrar publicaciones">

      <button type="button"
              class="is-selected"
              data-filter="all"
              aria-pressed="true">
        Todo
      </button>

      <button type="button"
              data-filter="news"
              aria-pressed="false">
        Noticias
      </button>

      <button type="button"
              data-filter="guide"
              aria-pressed="false">
        Guías
      </button>

    </div>

    <div id="vhAdvancedFilters"
         class="vh-advanced-filters">

      <div class="vh-filter-field">
        <label for="vhCategory">
          Categoría
        </label>

        <select id="vhCategory">
          <option value="all">
            Todas las categorías
          </option>
        </select>
      </div>

      <div class="vh-filter-field">
        <label for="vhVerification">
          Verificación
        </label>

        <select id="vhVerification">
          <option value="all">Todas</option>
          <option value="official">
            Fuente oficial
          </option>
          <option value="secondary">
            Fuente secundaria
          </option>
          <option value="unverified">
            Sin verificar
          </option>
        </select>
      </div>

      <div class="vh-filter-field">
        <label for="vhSort">
          Ordenar por
        </label>

        <select id="vhSort">
          <option value="new">
            Más recientes
          </option>
          <option value="old">
            Más antiguas
          </option>
          <option value="az">
            Título A-Z
          </option>
        </select>
      </div>

      <button type="button" id="vhResetFilters">
        Limpiar filtros
      </button>

    </div>

    <div id="vhNewsError" role="status"></div>

    <div id="vhNewsCards"
         class="vh-news-grid"
         aria-live="polite">
    </div>

    <div id="vhArticle"
         class="vh-article"
         hidden>
    </div>
  `;

  section.insertBefore(root, oldGrid);

  const $ = id => document.getElementById(id);

  let articles = [];
  let filter = 'all';
  let category = 'all';
  let verification = 'all';
  let sort = 'new';
  let current = null;

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

  function getVerification(article) {
    return ['official', 'secondary'].includes(
      article.verification_level
    )
      ? article.verification_level
      : 'unverified';
  }

  function getTags(article) {
    return Array.isArray(article.tags)
      ? article.tags.filter(t => typeof t === 'string')
      : [];
  }

  function updateCategoryOptions() {
    const counts = {};

    articles
      .filter(a =>
        filter === 'all' || a.kind === filter
      )
      .forEach(article => {
        getCategories(article).forEach(c => {
          counts[c] = (counts[c] || 0) + 1;
        });
      });

    $('vhCategory').innerHTML = `
      <option value="all">
        Todas las categorías
      </option>

      ${Object.entries(CATEGORY_NAMES)
        .filter(([key]) => counts[key] > 0)
        .map(([key, name]) => `
          <option value="${esc(key)}">
            ${esc(name)} (${counts[key]})
          </option>
        `).join('')}
    `;

    if (category !== 'all' && !counts[category]) {
      category = 'all';
    }

    $('vhCategory').value = category;
  }

  function categoryBadges(article) {
    return getCategories(article)
      .map(c => `
        <span class="vh-category-badge">
          ${esc(CATEGORY_NAMES[c] || c)}
        </span>
      `)
      .join('');
  }

  function verificationBadge(article) {
    const level = getVerification(article);

    return `
      <span class="vh-verification vh-verification-${level}">
        ${esc(VERIFICATION_NAMES[level])}
      </span>
    `;
  }

  function tagsHTML(article) {
    return getTags(article)
      .map(tag => `
        <button type="button"
                class="vh-tag"
                data-tag="${esc(tag)}">
          #${esc(tag)}
        </button>
      `)
      .join('');
  }

  function cards() {
    const q = normalize(search.value);

    const list = articles.filter(a => {
      const categories = getCategories(a);

      const searchable = normalize([
        a.title,
        a.summary,
        ...categories,
        ...categories.map(c => CATEGORY_NAMES[c]),
        ...getTags(a)
      ].filter(Boolean).join(' '));

      const matchesType =
        filter === 'all' || a.kind === filter;

      const matchesCategory =
        category === 'all' ||
        categories.includes(category);

      const matchesVerification =
        verification === 'all' ||
        getVerification(a) === verification;

      const matchesSearch =
        !q || q.split(/\s+/).every(
          word => searchable.includes(word)
        );

      return (
        matchesType &&
        matchesCategory &&
        matchesVerification &&
        matchesSearch
      );
    });

    list.sort((a, b) => {
      if (sort === 'az') {
        return a.title.localeCompare(b.title, 'es');
      }

      const dateA = Date.parse(a.published_at) || 0;
      const dateB = Date.parse(b.published_at) || 0;

      return sort === 'old'
        ? dateA - dateB
        : dateB - dateA;
    });

    $('vhNewsCount').textContent =
      `${list.length} de ${articles.length} publicaciones`;

    $('vhNewsCards').innerHTML = list
      .map((a, i) => {
        const image = safeUrl(a.image_url);

        const featured =
          i === 0 &&
          !q &&
          filter === 'all' &&
          category === 'all' &&
          verification === 'all' &&
          sort === 'new';

        return `
          <article class="vh-news-card
            ${featured ? 'vh-featured' : ''}">

            <div class="vh-news-art"
                 aria-hidden="true">

              ${image
                ? `<img src="${esc(image)}"
                        alt=""
                        loading="lazy"
                        class="vh-news-image">`
                : `<span>VI</span>
                   <small>VICE CITY</small>`
              }

            </div>

            <div class="vh-news-copy">

              <div class="vh-news-meta">
                <span>
                  ${a.kind === 'guide'
                    ? 'GUÍA'
                    : 'NOTICIA'}
                </span>

                <time>
                  ${esc(formatDate(a.published_at))}
                </time>
              </div>

              <div class="vh-category-list">
                ${categoryBadges(a)}
              </div>

              ${verificationBadge(a)}

              <h3>${esc(publicHeadline(a))}</h3>

              <p>
                ${esc(a.summary ||
                  'Lee el artículo completo.')}
              </p>

              <div class="vh-tags">
                ${tagsHTML(a)}
              </div>

              <div class="vh-news-foot">

                <span>
                  ${esc(a.source_name ||
                    (a.source_url
                      ? 'Fuente externa'
                      : 'Redacción'))}
                </span>

                <button type="button"
                        data-open="${esc(a.id)}">
                  Leer artículo
                  <span aria-hidden="true">→</span>
                </button>

              </div>

            </div>
          </article>
        `;
      })
      .join('') ||
      `<p class="vh-empty">
        No hay publicaciones que coincidan
        con los filtros seleccionados.
      </p>`;
  }

  function toggleFilters(visible) {
    root.querySelector(
      '.vh-news-filters'
    ).hidden = !visible;

    $('vhAdvancedFilters').hidden = !visible;

    search.hidden = !visible;
  }

  function closeArticle(updateHistory = true) {
    current = null;

    $('vhArticle').hidden = true;
    $('vhNewsCards').hidden = false;

    toggleFilters(true);

    if (updateHistory) {
      const u = new URL(location.href);

      u.searchParams.delete('articulo');

      history.replaceState(null, '', u);
    }
  }

  function showArticle(a, updateHistory = true) {
    current = a;

    $('vhNewsCards').hidden = true;

    toggleFilters(false);

    const src = safeUrl(a.source_url);
    const image = safeUrl(a.image_url);

    const source = src
      ? `<a href="${esc(src)}"
            target="_blank"
            rel="noopener noreferrer nofollow">
           ${articleSourceLabel(src)} ↗
         </a>`
      : '';

    $('vhArticle').innerHTML = `
      <button type="button" id="vhBack">
        ← Volver a noticias
      </button>

      <div class="vh-article-hero">

        <span class="vh-eyebrow">
          ${a.kind === 'guide'
            ? 'GUÍA'
            : 'ACTUALIDAD'}
          · ${esc(formatDate(a.published_at))}
        </span>

        <div class="vh-category-list">
          ${categoryBadges(a)}
        </div>

        ${verificationBadge(a)}

        <h1>${esc(publicHeadline(a))}</h1>

        <p>${esc(a.summary || '')}</p>

      </div>

      ${image
        ? `<img class="vh-article-image"
                src="${esc(image)}"
                alt="${esc(publicHeadline(a))}">
           ${a.image_credit
             ? `<small class="vh-image-credit">
                  ${esc(a.image_credit)}
                </small>`
             : ''}`
        : ''
      }

      <div class="vh-article-body">

        ${paragraphs(a.body)
          .map(p => `<p>${esc(p)}</p>`)
          .join('') ||
          '<p>El artículo todavía no tiene contenido.</p>'
        }

        <div class="vh-tags">
          ${tagsHTML(a)}
        </div>

        <div class="vh-source">
          ${a.source_url
            ? '<strong>Información de terceros.</strong> Contrasta los datos con la fuente original.'
            : 'Artículo de VICE HUB.'}

          ${source}
        </div>

        <button type="button" id="vhShare">
          Compartir artículo
        </button>

      </div>
    `;

    $('vhArticle').hidden = false;

    $('vhBack').onclick = () => closeArticle();

    $('vhShare').onclick = async () => {
      const link = location.href;

      try {
        if (navigator.share) {
          await navigator.share({
            title: publicHeadline(a),
            url: link
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(link);

          $('vhShare').textContent =
            'Enlace copiado';
        }
      } catch (error) {
        console.warn('Compartir:', error);
      }
    };

    if (updateHistory) {
      const u = new URL(location.href);

      u.searchParams.set(
        'articulo',
        a.slug || a.id
      );

      history.pushState(null, '', u);
    }

    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function resetFilters() {
    filter = 'all';
    category = 'all';
    verification = 'all';
    sort = 'new';

    search.value = '';

    $('vhVerification').value = 'all';
    $('vhSort').value = 'new';

    root.querySelectorAll('[data-filter]')
      .forEach(button => {
        const active =
          button.dataset.filter === 'all';

        button.classList.toggle(
          'is-selected',
          active
        );

        button.setAttribute(
          'aria-pressed',
          String(active)
        );
      });

    updateCategoryOptions();
    cards();
  }

  const articleFields = [
    'id',
    'slug',
    'title',
    'summary',
    'body',
    'kind',
    'published_at',
    'source_url',
    'source_name',
    'verification_level',
    'category',
    'categories',
    'tags',
    'image_url',
    'image_credit'
  ].join(',');

  async function openFromUrl() {
    const slug = new URL(location.href)
      .searchParams.get('articulo');

    if (!slug) {
      if (current) closeArticle(false);
      return;
    }

    let article = articles.find(a =>
      a.slug === slug || String(a.id) === slug
    );

    // Permitir abrir artículos antiguos
    // que no estén en el listado cargado.

    if (!article && db) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(slug);

      const { data, error } = await db
        .from('articles')
        .select(articleFields)
        .eq('status', 'published')
        .eq(isUuid ? 'id' : 'slug', slug)
        .maybeSingle();

      if (!error && data) {
        article = data;
      }
    }

    if (article) {
      if (typeof window.page === 'function') {
        window.page('noticias');
      }

      showArticle(article, false);
    }
  }

  async function load() {
    if (!db) {
      $('vhNewsError').textContent =
        'Falta configurar la conexión pública a Supabase.';

      return;
    }

    const { data, error } = await db
      .from('articles')
      .select(articleFields)
      .eq('status', 'published')
      .order('published_at', {
        ascending: false
      })
      .limit(500);

    if (error) {
      $('vhNewsError').textContent =
        'No se han podido cargar las noticias: ' +
        error.message;

      return;
    }

    articles = data || [];

    updateCategoryOptions();
    cards();

    await openFromUrl();
  }

  root.addEventListener('click', e => {
    const open = e.target.closest('[data-open]');

    if (open) {
      const article = articles.find(a =>
        String(a.id) === open.dataset.open
      );

      if (article) showArticle(article);

      return;
    }

    const tag = e.target.closest('[data-tag]');

    if (tag) {
      if (current) closeArticle();

      resetFilters();

      search.value = tag.dataset.tag;

      cards();
    }
  });

  root.querySelectorAll('[data-filter]')
    .forEach(button => {
      button.addEventListener('click', () => {
        filter = button.dataset.filter;

        root.querySelectorAll('[data-filter]')
          .forEach(x => {
            const active = x === button;

            x.classList.toggle(
              'is-selected',
              active
            );

            x.setAttribute(
              'aria-pressed',
              String(active)
            );
          });

        updateCategoryOptions();
        cards();
      });
    });

  $('vhCategory').addEventListener(
    'change',
    e => {
      category = e.target.value;
      cards();
    }
  );

  $('vhVerification').addEventListener(
    'change',
    e => {
      verification = e.target.value;
      cards();
    }
  );

  $('vhSort').addEventListener(
    'change',
    e => {
      sort = e.target.value;
      cards();
    }
  );

  $('vhResetFilters').addEventListener(
    'click',
    resetFilters
  );

  search.addEventListener('input', cards);

  window.addEventListener('popstate', () => {
    openFromUrl().catch(console.error);
  });

  load().catch(error => {
    $('vhNewsError').textContent =
      'No se pudieron cargar las noticias.';

    console.error(error);
  });

})();
