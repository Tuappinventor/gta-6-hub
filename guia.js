(() => {
  'use strict';

  const { language, t, choose, translationButton } = window.ViceLanguage;
  const panel = document.getElementById('guideMapLocations');
  const search = document.getElementById('guideSearch');
  const category = document.getElementById('guideCategory');
  const status = document.getElementById('guideLocationsStatus');
  const grid = document.getElementById('guideLocations');
  const categories = {
    ciudad: ['Ciudad', '🏙️'],
    region: ['Región', '🗺️'],
    isla: ['Isla', '🏝️'],
    aeropuerto: ['Aeropuerto', '✈️'],
    garaje: ['Garaje', '🚗'],
    casa: ['Casa', '🏠'],
    tienda: ['Tienda', '🛒'],
    vehiculo: ['Vehículo', '🚘'],
    secreto: ['Secreto', '💎'],
    mision: ['Misión', '🎯'],
    coleccionable: ['Coleccionable', '⭐'],
    arma: ['Arma', '🎯'],
    servicio: ['Servicio', '🏥'],
    otro: ['Otro', '📍']
  };
  let locations = [];

  function card(location) {
    const [label, icon] = categories[location.category] || [location.category || 'Lugar', '📍'];
    const article = document.createElement('article');
    article.className = 'card';

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = icon + ' ' + t(label) + ' · ' + t('Verificado');
    if (/^https:\/\//i.test(location.image_url || '')) {
      const image = document.createElement('img');
      image.className = 'guide-cover';
      image.src = location.image_url;
      image.alt = choose('Imagen de ', 'Image of ') + location.name;
      image.loading = 'lazy';
      image.addEventListener('error', () => image.remove());
      article.append(image);
    }

    const title = document.createElement('h3');
    title.textContent = location.name;
    const description = document.createElement('p');
    description.textContent = location.description || t('Ubicación publicada en el mapa de Leonida.');
    const mapLink = document.createElement('a');
    mapLink.className = 'guide-link';
    mapLink.href = './mapa-interactivo.html?location=' + encodeURIComponent(location.id);
    mapLink.textContent = t('📍 Ver en el mapa original');

    article.append(tag, title, description);
    if (language === 'en' && location.description) {
      description.lang = 'es';
      description.dataset.original = '';
      article.append(translationButton([description], 'es'));
    }
    article.append(mapLink);
    return article;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase(language);
    const rows = locations.filter(location => {
      const label = categories[location.category]?.[0];
      const text = [location.name, location.description, location.category, label, t(label)].join(' ');
      return (category.value === 'all' || location.category === category.value)
        && text.toLocaleLowerCase(language).includes(query);
    });

    if (!rows.length) {
      grid.replaceChildren();
      status.textContent = t(locations.length
        ? 'No hay ubicaciones con esos filtros.'
        : 'Todavía no hay ubicaciones verificadas publicadas.');
      return;
    }

    status.textContent = rows.length + ' ' + (rows.length === 1
      ? choose('ubicación verificada', 'verified location')
      : choose('ubicaciones verificadas', 'verified locations'))
      + (rows.length === locations.length ? '' : choose(' de ', ' of ') + locations.length);
    grid.replaceChildren(...rows.map(card));
  }

  async function load() {
    const config = window.VICEHUB_CONFIG;
    if (!config?.url || !config?.anonKey || !window.supabase) {
      status.textContent = 'No se pudo conectar con Supabase.';
      return;
    }
    const db = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'vicehub-guide-locations' }
    });
    const { data, error } = await db.from('vice_map_locations')
      .select('id,name,category,description,image_url')
      .eq('verified', true)
      .order('name')
      .limit(3000);
    if (error) throw error;

    locations = data || [];
    for (const key of [...new Set(locations.map(location => location.category))].sort()) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = t(categories[key]?.[0] || key);
      category.append(option);
    }
    search.addEventListener('input', render);
    category.addEventListener('change', render);
    render();
  }

  panel.addEventListener('toggle', function openLocations() {
    if (!panel.open) return;
    panel.removeEventListener('toggle', openLocations);
    load().catch(() => { status.textContent = 'No se pudieron cargar las ubicaciones. Recarga para volver a intentarlo.'; });
  });
})();
