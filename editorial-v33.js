
/* ==========================================
   VICE HUB 3.5 — Administración editorial
   Noticias, guías, categorías y etiquetas
========================================== */

(() => {
  'use strict';

  const cfg = window.VICEHUB_CONFIG || {};
  const host = document.getElementById('editorWorkspace');

  if (!host || !window.supabase ||
      !cfg.url || !cfg.anonKey) return;

  const db = window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );

  const CATEGORIES = {
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

  const STATUS_NAMES = {
    draft: 'Borrador',
    review: 'En revisión',
    published: 'Publicado',
    rejected: 'Descartado'
  };

  const VERIFICATION_NAMES = {
    official: 'Fuente oficial',
    secondary: 'Fuente secundaria',
    unverified: 'Sin verificar',
    unreviewed: 'Pendiente de revisión'
  };

  const el = (tag, text, cls) => {
    const x = document.createElement(tag);

    if (text !== undefined) {
      x.textContent = String(text);
    }

    if (cls) x.className = cls;

    return x;
  };

  const normalize = value =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const date = value =>
    value
      ? new Date(value).toLocaleString('es-ES')
      : 'Sin fecha';

  function button(text, cls) {
    const b = el('button', text, cls);
    b.type = 'button';
    return b;
  }

  function select(options, value) {
    const field = el('select');

    for (const [key, name] of Object.entries(options)) {
      const option = el('option', name);
      option.value = key;
      field.append(option);
    }

    field.value = value;

    return field;
  }

  function field(label, control) {
    const wrapper = el(
      'label',
      undefined,
      'v35-editor-field'
    );

    wrapper.append(
      el('span', label),
      control
    );

    return wrapper;
  }

  function link(url, label) {
    try {
      const u = new URL(url);

      if (!['https:', 'http:'].includes(u.protocol)) {
        return null;
      }

      const a = el('a', label);

      a.href = u.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      return a;

    } catch {
      return null;
    }
  }

  async function session() {
    const {
      data: { user },
      error
    } = await db.auth.getUser();

    if (error || !user) return null;

    const {
      data: profile,
      error: roleError
    } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (
      roleError ||
      !['admin', 'editor'].includes(profile?.role)
    ) {
      return null;
    }

    return user;
  }

  const panel = el(
    'section',
    undefined,
    'v33-panel'
  );

  panel.id = 'v33Editorial';

  const heading = el(
    'h3',
    'VICE HUB 3.5 · Control editorial'
  );

  const info = el(
    'p',
    'Inicia sesión como editor o administrador.',
    'muted'
  );

  info.setAttribute('role', 'status');

  const stats = el(
    'div',
    undefined,
    'v35-editor-stats'
  );

  const filters = el(
    'div',
    undefined,
    'v35-editor-filters'
  );

  const search = el('input');

  search.type = 'search';
  search.placeholder = 'Buscar publicaciones...';

  const statusFilter = select({
    all: 'Todos los estados',
    ...STATUS_NAMES
  }, 'draft');

  const typeFilter = select({
    all: 'Todos los tipos',
    news: 'Noticias',
    guide: 'Guías'
  }, 'all');

  const categoryFilter = select({
    all: 'Todas las categorías',
    ...CATEGORIES
  }, 'all');

  const reload = button('Actualizar');
  const reset = button('Limpiar filtros');

  filters.append(
    field('Buscar', search),
    field('Estado', statusFilter),
    field('Tipo', typeFilter),
    field('Categoría', categoryFilter),
    reload,
    reset
  );

  const list = el(
    'div',
    undefined,
    'v33-list'
  );

  panel.append(
    heading,
    info,
    stats,
    filters,
    list
  );

  host.prepend(panel);

  filters.hidden = true;

  let articles = [];
  let loadVersion = 0;

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

  function normalizeTags(value) {
    return [
      ...new Set(
        String(value || '')
          .split(/[,;\n]+/)
          .map(tag =>
            tag
              .trim()
              .toLowerCase()
              .replace(/^#+/, '')
              .slice(0, 60)
          )
          .filter(Boolean)
      )
    ].slice(0, 8);
  }

  function renderStats() {
    stats.replaceChildren();

    const values = [
      ['Publicaciones', articles.length],
      ['Noticias', articles.filter(
        a => a.kind === 'news'
      ).length],
      ['Guías', articles.filter(
        a => a.kind === 'guide'
      ).length],
      ['Publicadas', articles.filter(
        a => a.status === 'published'
      ).length],
      ['Borradores', articles.filter(
        a => a.status === 'draft'
      ).length],
      ['En revisión', articles.filter(
        a => a.status === 'review'
      ).length],
      ['Descartadas', articles.filter(
        a => a.status === 'rejected'
      ).length]
    ];

    for (const [name, count] of values) {
      const item = el(
        'div',
        undefined,
        'v35-stat'
      );

      item.append(
        el('strong', count),
        el('small', name)
      );

      stats.append(item);
    }
  }

  function render() {
    list.replaceChildren();

    const q = normalize(search.value);

    const filtered = articles.filter(article => {
      const categories = getCategories(article);

      const text = normalize([
        article.title,
        article.summary,
        ...categories,
        ...categories.map(c => CATEGORIES[c]),
        ...(article.tags || [])
      ].join(' '));

      return (
        (statusFilter.value === 'all' ||
          article.status === statusFilter.value) &&

        (typeFilter.value === 'all' ||
          article.kind === typeFilter.value) &&

        (categoryFilter.value === 'all' ||
          categories.includes(categoryFilter.value)) &&

        (!q || text.includes(q))
      );
    });

    info.textContent =
      `${filtered.length} de ${articles.length} publicaciones cargadas.`;

    if (!filtered.length) {
      list.append(
        el('p', 'No hay publicaciones para estos filtros.', 'muted')
      );

      return;
    }

    for (const article of filtered) {
      list.append(createCard(article));
    }
  }

  function createCard(article) {
    const card = el(
      'article',
      undefined,
      'card v33-card'
    );

    const metadata = el(
      'div',
      [
        article.kind === 'guide'
          ? 'GUÍA'
          : 'NOTICIA',
        STATUS_NAMES[article.status] || article.status,
        date(article.created_at)
      ].join(' · '),
      'tag'
    );

    const details = el('details');
    const headline = el('summary', article.title);

    details.append(headline);

    const title = el('input');

    title.value = article.title || '';
    title.maxLength = 180;

    const summary = el('textarea');

    summary.value = article.summary || '';
    summary.maxLength = 600;
    summary.rows = 4;

    const body = el('textarea');

    body.value = article.body || '';
    body.rows = 12;

    const primaryCategory = select(
      CATEGORIES,
      article.category ||
        (article.kind === 'guide'
          ? 'guias'
          : 'actualidad')
    );

    if (!primaryCategory.value) {
      primaryCategory.value = 'actualidad';
    }

    const categoryBox = el(
      'div',
      undefined,
      'v35-category-checks'
    );

    const selected = new Set(
      getCategories(article)
    );

    const checkboxes = [];

    for (const [key, name] of Object.entries(CATEGORIES)) {
      const label = el(
        'label',
        undefined,
        'v35-category-option'
      );

      const input = el('input');

      input.type = 'checkbox';
      input.value = key;
      input.checked = selected.has(key);

      label.append(
        input,
        el('span', name)
      );

      categoryBox.append(label);
      checkboxes.push(input);
    }

    function syncCategories() {
      for (const input of checkboxes) {
        const required =
          input.value === primaryCategory.value ||
          (article.kind === 'guide' &&
            input.value === 'guias');

        if (required) input.checked = true;

        input.disabled = required;
      }
    }

    primaryCategory.addEventListener(
      'change',
      syncCategories
    );

    syncCategories();

    const tags = el('textarea');

    tags.rows = 2;

    tags.value = Array.isArray(article.tags)
      ? article.tags.join(', ')
      : '';

    tags.placeholder =
      'gta6, rockstar, leonida, vice city';

    const verification = select(
      VERIFICATION_NAMES,
      article.verification_level || 'unreviewed'
    );

    if (!verification.value) {
      verification.value = 'unreviewed';
    }

    const notes = el('textarea');

    notes.rows = 3;

    notes.value =
      article.verification_notes || '';

    const featuredLabel = el(
      'label',
      undefined,
      'v35-category-option'
    );

    const featured = el('input');

    featured.type = 'checkbox';
    featured.checked = Boolean(article.featured);

    featuredLabel.append(
      featured,
      el('span', 'Destacar en portada')
    );

    details.append(
      field('Título', title),
      field('Resumen', summary),
      field('Contenido', body),
      field('Categoría principal', primaryCategory),
      el('h4', 'Categorías adicionales'),
      categoryBox,
      field('Etiquetas separadas por comas', tags),
      field('Nivel de verificación', verification),
      field('Notas de revisión', notes),
      featuredLabel
    );

    const source = link(
      article.source_url,
      `Consultar fuente: ${
        article.source_name || 'Abrir enlace'
      }`
    );

    if (source) {
      details.append(source);
    }

    const actions = el(
      'div',
      undefined,
      'actions'
    );

    const save = button('Guardar cambios');

    const publish = button(
      'Aprobar y publicar',
      'primary'
    );

    const draft = button('Volver a borrador');
    const discard = button('Descartar');

    const feedback = el('p', '', 'note');

    feedback.setAttribute('role', 'status');

    const buttons = [
      save,
      publish,
      draft,
      discard
    ];

    function fields() {
      const categories = [
        ...new Set([
          primaryCategory.value,
          ...checkboxes
            .filter(input => input.checked)
            .map(input => input.value),
          ...(article.kind === 'guide'
            ? ['guias']
            : [])
        ])
      ];

      return {
        title: title.value.trim(),
        summary: summary.value.trim(),
        body: body.value.trim(),
        category: primaryCategory.value,
        categories,
        tags: normalizeTags(tags.value),
        verification_level: verification.value,
        verification_notes: notes.value.trim(),
        featured: featured.checked
      };
    }

    async function perform(mode) {
      for (const b of buttons) {
        b.disabled = true;
      }

      try {
        if (!await session()) {
          throw new Error(
            'Sesión caducada o sin permisos.'
          );
        }

        const f = fields();

        if (
          ['save', 'publish'].includes(mode) &&
          (
            f.title.length < 10 ||
            f.summary.length < 20 ||
            f.body.length < 80
          )
        ) {
          throw new Error(
            'Completa el título, resumen y contenido.'
          );
        }

        if (mode === 'publish') {
          const warning =
            f.categories.includes('rumores') ||
            f.categories.includes('filtraciones') ||
            ['unverified', 'unreviewed'].includes(
              f.verification_level
            );

          const message = warning
            ? 'Esta publicación contiene información no confirmada. ¿Has revisado la fuente y quieres publicarla identificándola como tal?'
            : '¿Has revisado la fuente y quieres publicar?';

          if (!confirm(message)) return;
        }

        if (
          mode === 'draft' &&
          !confirm('¿Retirar la publicación y devolverla a borradores?')
        ) {
          return;
        }

        if (
          mode === 'discard' &&
          !confirm('¿Descartar esta publicación sin eliminarla de la base de datos?')
        ) {
          return;
        }

        let update = {};

        if (mode === 'discard') {
          update = {
            status: 'rejected',
            featured: false
          };

        } else if (mode === 'draft') {
          update = {
            status: 'draft',
            featured: false
          };

        } else {
          update = {
            ...f
          };

          if (mode === 'publish') {
            update.status = 'published';

            update.published_at =
              new Date().toISOString();

            update.reviewed_at =
              new Date().toISOString();
          }
        }

        const {
          data: changed,
          error
        } = await db
          .from('articles')
          .update(update)
          .eq('id', article.id)
          .eq('status', article.status)
          .select('id');

        if (error) throw error;

        if (!changed?.length) {
          throw new Error(
            'No se actualizó la publicación. Revisa los permisos o actualiza el listado.'
          );
        }

        Object.assign(article, update);

        headline.textContent = article.title;

        metadata.textContent = [
          article.kind === 'guide'
            ? 'GUÍA'
            : 'NOTICIA',
          STATUS_NAMES[article.status] ||
            article.status,
          date(article.created_at)
        ].join(' · ');

        feedback.textContent =
          'Cambios guardados correctamente.';

        renderStats();

        if (mode !== 'save') {
          await load();
        }

      } catch (error) {
        feedback.textContent =
          `Error: ${error.message}`;

        console.error(error);

      } finally {
        for (const b of buttons) {
          b.disabled = false;
        }
      }
    }

    save.onclick = () => perform('save');

    publish.onclick = () => perform('publish');

    draft.onclick = () => perform('draft');

    discard.onclick = () => perform('discard');

    actions.append(save);

    if (article.status !== 'published') {
      actions.append(publish);
    }

    if (article.status !== 'draft') {
      actions.append(draft);
    }

    if (article.status !== 'rejected') {
      actions.append(discard);
    }

    details.append(actions, feedback);

    card.append(metadata, details);

    return card;
  }

  async function load() {
    const version = ++loadVersion;

    articles = [];

    list.replaceChildren();
    stats.replaceChildren();

    filters.hidden = true;

    info.textContent =
      'Comprobando permisos...';

    try {
      const user = await session();

      if (version !== loadVersion) return;

      if (!user) {
        info.textContent =
          'Inicia sesión con una cuenta de editor o administrador.';

        return;
      }

      info.textContent =
        'Cargando publicaciones...';

      const { data, error } = await db
        .from('articles')
        .select([
          'id',
          'title',
          'summary',
          'body',
          'kind',
          'status',
          'category',
          'categories',
          'tags',
          'featured',
          'source_url',
          'source_name',
          'verification_level',
          'verification_notes',
          'created_at',
          'published_at'
        ].join(','))
        .order('created_at', {
          ascending: false
        })
        .limit(500);

      if (version !== loadVersion) return;

      if (error) throw error;

      articles = data || [];

      filters.hidden = false;

      renderStats();
      render();

    } catch (error) {
      if (version !== loadVersion) return;

      info.textContent =
        `No se pudieron cargar las publicaciones: ${error.message}`;

      console.error(error);
    }
  }

  reload.onclick = load;

  reset.onclick = () => {
    search.value = '';
    statusFilter.value = 'all';
    typeFilter.value = 'all';
    categoryFilter.value = 'all';

    render();
  };

  search.addEventListener('input', render);

  for (const control of [
    statusFilter,
    typeFilter,
    categoryFilter
  ]) {
    control.addEventListener('change', render);
  }

  document
    .querySelectorAll('[data-page="editor"]')
    .forEach(b =>
      b.addEventListener('click', load)
    );

  db.auth.onAuthStateChange(() => {
    setTimeout(load, 0);
  });

  document
    .getElementById('signIn')
    ?.addEventListener(
      'click',
      () => setTimeout(load, 1200)
    );

  document
    .getElementById('signOut')
    ?.addEventListener(
      'click',
      () => setTimeout(load, 1200)
    );

  load();

})();
