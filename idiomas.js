(() => {
  const storageKey = 'vicehub-language';
  const params = new URLSearchParams(location.search);
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  const language = [params.get('lang'), saved].find(value => value === 'es' || value === 'en') || 'es';
  document.documentElement.lang = language;

  const labels = {
    "Actualidad": "Latest news",
    "Oficiales y actualidad": "Official and latest news",
    "Rumores": "Rumors",
    "Filtraciones": "Leaks",
    "Tráilers": "Trailers",
    "Lanzamiento": "Release",
    "Actualizaciones": "Updates",
    "Mapa y localizaciones": "Map and locations",
    "Personajes": "Characters",
    "Vehículos": "Vehicles",
    "Armas": "Weapons",
    "Propiedades y negocios": "Properties and businesses",
    "Música y radio": "Music and radio",
    "Trucos y códigos": "Cheats and codes",
    "Dinero": "Money",
    "Misiones": "Missions",
    "Coleccionables": "Collectibles",
    "Secretos y Easter Eggs": "Secrets and Easter eggs",
    "Logros y trofeos": "Achievements and trophies",
    "Curiosidades": "Trivia",
    "Rendimiento y plataformas": "Performance and platforms",
    "Errores y soluciones": "Bugs and fixes",
    "Fuente oficial": "Official source",
    "Fuente secundaria": "Secondary source",
    "Sin verificar": "Unverified",
    "No confirmado": "Unconfirmed",
    "Todas": "All",
    "Oficial": "Official",
    "Todo": "All",
    "GUÍA": "GUIDE",
    "NOTICIA": "NEWS",
    "Categorías de portada": "Front-page categories",
    "Tipo de publicación": "Publication type",
    "VICE HUB · PORTADA DIGITAL": "VICE HUB · NEWSROOM",
    "GTA VI: últimas noticias": "GTA VI: latest news",
    "Actualidad, guías, trucos y novedades del universo de Grand Theft Auto VI.": "News, guides, cheats and updates from the world of Grand Theft Auto VI.",
    "publicaciones disponibles": "publications available",
    "Más publicaciones": "More articles",
    "Cargar más publicaciones": "Load more articles",
    "No hay publicaciones en esta categoría.": "There are no articles in this category.",
    "Cargando publicaciones…": "Loading articles…",
    "No se pudieron cargar las publicaciones.": "Could not load the articles.",
    "Volver a intentar": "Try again",
    "Leer artículo": "Read article",
    "Leer artículo →": "Read article →",
    "Leer guía": "Read guide",
    "Consultar fuente": "View source",
    "Todavía no hay guías publicadas.": "No guides have been published yet.",
    "No se pudieron cargar las guías. Recarga para volver a intentarlo.": "Could not load the guides. Reload to try again.",
    "No se pudo conectar con Supabase.": "Could not connect to the database.",
    "Buscar noticias, guías, trucos, vehículos...": "Search news, guides, cheats and vehicles…",
    "VICE HUB · REDACCIÓN DIGITAL": "VICE HUB · NEWSROOM",
    "Última hora en Vice City": "Latest from Vice City",
    "Noticias, guías, trucos y toda la información sobre GTA VI.": "Latest GTA VI news, guides and cheats.",
    "Cargando…": "Loading…",
    "Filtrar publicaciones": "Filter articles",
    "Verificación": "Verification",
    "Ordenar por": "Sort by",
    "Más recientes": "Newest first",
    "Más antiguas": "Oldest first",
    "Título A-Z": "Title A–Z",
    "Limpiar filtros": "Clear filters",
    "Lee el artículo completo.": "Read the full article.",
    "Fuente externa": "External source",
    "Redacción": "Editorial team",
    "No hay publicaciones que coincidan con los filtros seleccionados.": "No articles match the selected filters.",
    "← Volver a noticias": "← Back to news",
    "El artículo todavía no tiene contenido.": "This article has no content yet.",
    "Información de terceros.": "Third-party information.",
    "Contrasta los datos con la fuente original.": "Check the original source for details.",
    "Artículo de VICE HUB.": "Article by VICE HUB.",
    "Compartir artículo": "Share article",
    "Enlace copiado": "Link copied",
    "VICE HUB · Proyecto independiente de fans. No afiliado a Rockstar Games ni Take-Two Interactive.": "VICE HUB · Independent fan project. Unaffiliated with Rockstar Games or Take-Two Interactive.",

    'Inicio': 'Home', 'Noticias': 'News', 'Mapa': 'Map', 'Coches': 'Cars', 'Guías': 'Guides',
    'Mi progreso': 'My progress', 'Editorial': 'Editorial', 'PLATAFORMA INDEPENDIENTE · GTA VI': 'INDEPENDENT GTA VI HUB',
    'Tu aventura.': 'Your adventure.', 'Tu ciudad.': 'Your city.', 'Tu comunidad.': 'Your community.',
    'Noticias, guías, vehículos y mapa colaborativo. Guarda tus descubrimientos y participa en la comunidad.': 'News, guides, vehicles and a community map. Save your discoveries and join the community.',
    'Explorar mapa': 'Explore the map', 'Ver noticias': 'Read the news', 'Noticias publicadas': 'Published articles',
    'Ubicaciones del mapa de Leonida': 'Locations on the Leonida map', 'Descubiertas por ti': 'Discovered by you',
    'Explora Vice Hub': 'Explore VICE HUB', 'ACTUALIDAD': 'NEWS', 'EXPLORACIÓN': 'EXPLORATION', 'COLECCIÓN': 'COLLECTION',
    'Todas las noticias publicadas desde nuestro panel editorial.': 'All the latest articles from our editorial team.',
    'Explorar': 'Explore', 'Mapa interactivo': 'Interactive map', 'Abrir mapa': 'Open map',
    'Descubre localizaciones y guarda tu progreso.': 'Discover locations and save your progress.',
    'Garaje virtual': 'Virtual garage', 'Ver coches': 'Browse cars',
    'Busca coches de Leonida, consulta sus fichas y localiza los puntos documentados.': 'Browse Leonida’s cars, view their details and find their known locations.',
    'Noticias GTA 6': 'GTA 6 News', 'Noticias y publicaciones almacenadas en nuestra base de datos.': 'Browse the latest GTA VI articles.',
    'Buscar noticias...': 'Search news…', 'Cargando noticias...': 'Loading news…', 'Coches de GTA VI': 'GTA VI cars',
    'Descubre en qué coches reales se inspira el garaje de Leonida y cómo conseguirlos en el juego.': 'Find the real cars that inspired Leonida’s garage and learn how to get them in the game.',
    'Buscar coche': 'Find a car', 'Categoría': 'Category', 'Marca': 'Make', 'Todas las categorías': 'All categories',
    'Todas las marcas': 'All makes', 'Mostrar más coches': 'Show more cars', 'Ej. Banshee o Dodge Viper': 'E.g. Banshee or Dodge Viper',
    'Guías de GTA VI': 'GTA VI Guides', 'Trucos con el mando, códigos y consejos para explorar Leonida.': 'Controller cheats, codes and tips for exploring Leonida.',
    'Cargando guías…': 'Loading guides…', 'Ubicaciones del mapa original': 'Original map locations',
    'Cada ubicación es un punto guardado en una versión anterior del mapa de VICE HUB. Ábrela para ver su marcador.': 'These locations were saved on an earlier version of the VICE HUB map. Open one to see its marker.',
    'Abrir el mapa actual': 'Open the current map', 'Buscar ubicación': 'Search locations',
    'Nombre, descripción o categoría': 'Name, description or category', 'Cargando ubicaciones…': 'Loading locations…',
    'Cuenta y progreso': 'Account and progress', 'Registrarme': 'Sign up', 'Entrar': 'Sign in', 'Salir': 'Sign out',
    'Correo electrónico': 'Email address', 'Contraseña': 'Password', 'Guardar alias': 'Save display name',
    'Abrir el mapa de Leonida': 'Open the Leonida map', 'Panel editorial': 'Editorial dashboard',
    'Explora Leonida': 'Explore Leonida', 'Volver a VICE HUB': 'Back to VICE HUB', 'Cargando Leonida...': 'Loading Leonida…',
    'Buscar': 'Search', 'Capas': 'Layers', 'Filtros': 'Filters', 'Progreso': 'Progress', 'Pantalla': 'Fullscreen',
    'Zonas': 'Areas', 'Favoritos': 'Favorites', 'Posición': 'Position', 'Buscar ubicaciones': 'Search locations',
    'Capas del mapa': 'Map layers', 'Filtrar ubicaciones': 'Filter locations', 'Nombre, categoría, distrito...': 'Name, category, district…',
    'Escribe para buscar una ubicación.': 'Type to search for a location.',
    'Ovnis y fantasmas': 'UFOs and ghosts', 'Limpiar búsqueda': 'Clear search', '☀️ Mapa diurno': '☀️ Day map',
    '🌙 Mapa nocturno': '🌙 Night map', 'Vista general de Leonida': 'Leonida overview', 'Centrar mapa': 'Center map',
    'Mostrar todo': 'Show all', 'Ocultar todo': 'Hide all', 'Ocultar encontrados': 'Hide discovered locations',
    '✓ Encontrado · Desmarcar': '✓ Found · Undo', 'Marcar como encontrado': 'Mark as found',
    'Leer guía de cajas fuertes': 'Read the safe guide', 'Ver ficha del coche': 'View car details',
    'Consultar fuente original': 'View original source', '★ Quitar de favoritos': '★ Remove from favorites',
    '☆ Añadir a favoritos': '☆ Add to favorites', '📍 Siguiente pendiente cercano': '📍 Next undiscovered nearby',
    '🔗 Compartir ubicación': '🔗 Share location', 'Mis favoritos': 'My favorites', 'Explorar distritos': 'Explore districts',
    'Mostrar toda Leonida': 'Show all Leonida', 'Ocultar límites': 'Hide boundaries', 'Mostrar límites': 'Show boundaries',
    'Ocultar límites de distritos': 'Hide district boundaries', 'Mostrar límites de distritos': 'Show district boundaries',
    'Todas las zonas': 'All areas', 'Mostrar todas las ubicaciones': 'Show all locations',
    'Mostrar solo favoritos': 'Show favorites only', 'Los límites son aproximaciones comunitarias.': 'These boundaries are community estimates.',
    'Pulsa cualquier marcador y añádelo a favoritos.': 'Open any marker and add it to your favorites.',
    'Favoritos guardados en este navegador.': 'Favorites saved in this browser.',
    'Pantalla completa no disponible': 'Fullscreen unavailable', 'Volver a guías': 'Back to guides',
    'Volver a noticias': 'Back to news', 'Fuentes consultadas': 'Sources', 'Ver en el mapa': 'View on map',
    'Ubicaciones señaladas por la comunidad.': 'Locations marked by the community.', 'Compartir guía': 'Share guide',
    'Mi cuenta': 'My account', 'Cuenta': 'Account', 'Cuenta conectada': 'Account connected',
    '☁ Conectado': '☁ Connected', '☁ Pendiente': '☁ Pending', 'Invitado': 'Guest',
    'Modo invitado': 'Guest mode', 'Iniciar sesión': 'Sign in', 'Cerrar sesión': 'Sign out', 'Encontrados': 'Found',
    'Accede con tu cuenta de VICE HUB para sincronizar tus favoritos y coleccionables.': 'Sign in to sync your favorites and collectibles.',
    'Introduce tu correo y contraseña.': 'Enter your email address and password.',
    'Iniciando sesión...': 'Signing in…', 'No se pudo iniciar sesión. Comprueba tus datos.': 'Could not sign in. Check your credentials.',
    'Crear cuenta o gestionar acceso en VICE HUB': 'Create or manage your VICE HUB account',
    'Tus datos están asociados a tu cuenta.': 'Your progress is linked to your account.',
    '☁ Sincronizar ahora': '☁ Sync now', '📥 Importar progreso de invitado': '📥 Import guest progress',
    'Comprobando sesión...': 'Checking your session…', 'Ubicación compartida no disponible': 'Shared location unavailable',
    'Verificado': 'Verified', 'Orientativo': 'Approximate', 'Sin verificar': 'Unverified',
    '✓ Visitado · Desmarcar': '✓ Visited · Undo', 'Marcar visitado': 'Mark as visited', 'Cerrar': 'Close',
    'Ciudad': 'City', 'Región': 'Region', 'Isla': 'Island', 'Aeropuerto': 'Airport', 'Garaje': 'Garage',
    'Casa': 'House', 'Tienda': 'Shop', 'Vehículo': 'Vehicle', 'Secreto': 'Secret', 'Misión': 'Mission',
    'Coleccionable': 'Collectible', 'Arma': 'Weapon', 'Servicio': 'Service', 'Otro': 'Other', 'Lugar': 'Place',
    'Ubicación publicada en el mapa de Leonida.': 'Location listed on the Leonida map.',
    '📍 Ver en el mapa original': '📍 View on the original map',
    'No hay ubicaciones con esos filtros.': 'No locations match those filters.',
    'Todavía no hay ubicaciones verificadas publicadas.': 'No verified locations have been published yet.',
    'Abrir en Google Traductor': 'Open in Google Translate',
    'Comentarios de la ubicación': 'Location comments', 'Comentarios': 'Comments', 'Actualizar': 'Refresh',
    'Cargando comentarios…': 'Loading comments…', 'Todavía no hay comentarios.': 'There are no comments yet.',
    'No se pudieron cargar los comentarios.': 'Could not load comments.',
    'Inicia sesión para comentar': 'Sign in to comment', 'Tu comentario': 'Your comment', 'Idioma del comentario': 'Comment language',
    'Publicar comentario': 'Post comment', 'Publicando…': 'Posting…', 'Eliminar comentario': 'Delete comment',
    '¿Eliminar este comentario?': 'Delete this comment?', 'No se pudo eliminar el comentario.': 'Could not delete the comment.',
    'Espera unos segundos antes de publicar otro comentario.': 'Wait a few seconds before posting another comment.',
    'No se pudo publicar el comentario.': 'Could not post the comment.', 'Traducir': 'Translate',
    'Ver original': 'Show original', 'Traduciendo…': 'Translating…',
    'Traducción automática no disponible en este navegador.': 'Automatic translation is unavailable in this browser.',
    'No se pudo traducir el texto.': 'Could not translate the text.',
    'Progreso guardado en este navegador. Todavía no está sincronizado con tu cuenta.': 'Progress saved in this browser. It has not been synced with your account yet.'
  };

  const t = value => language === 'en' && Object.hasOwn(labels, value) ? labels[value] : value;
  const choose = (es, en) => language === 'en' ? en : es;
  function localizedUrl(path) {
    const url = new URL(path, location.origin);
    if (language === 'en' || params.has('lang')) url.searchParams.set('lang', language);
    return url.pathname + url.search + url.hash;
  }

  function mount() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.vice-language')) return;
    const select = document.createElement('select');
    select.className = 'vice-language';
    select.setAttribute('aria-label', choose('Idioma de la web', 'Website language'));
    select.add(new Option('Español', 'es'));
    select.add(new Option('English', 'en'));
    select.value = language;
    select.addEventListener('change', () => {
      try { localStorage.setItem(storageKey, select.value); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('lang', select.value);
      document.dispatchEvent(new CustomEvent('vice-language-change', { detail: url }));
      location.assign(url);
    });
    header.append(select);
  }

  function translateInterface(root) {
    if (language !== 'en') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement.closest('script,style,textarea,[data-original]')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const key = node.data.trim().replace(/\s+/g, ' ');
      const translated = t(key);
      if (translated !== key) node.data = node.data.replace(/\S(?:[\s\S]*\S)?/, translated);
    }
    for (const attribute of ['placeholder', 'aria-label']) {
      root.querySelectorAll('[' + attribute + ']').forEach(node => {
        node.setAttribute(attribute, t(node.getAttribute(attribute)));
      });
    }
  }

  async function translator(sourceLanguage, targetLanguage) {
    const api = window.Translator;
    const options = { sourceLanguage, targetLanguage };
    if (!api || await api.availability(options) === 'unavailable') return null;
    return api.create(options);
  }

  function translationButton(nodes, source, target = language, articleUrl) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vice-translate';
    button.textContent = t('Traducir');
    const status = document.createElement('span');
    status.className = 'vice-translate-status';
    status.setAttribute('role', 'status');
    const originals = nodes.map(node => node.textContent);
    const originalLanguages = nodes.map(node => node.getAttribute('lang'));
    let translated;
    let showing = false;

    function addExternalLink() {
      const text = originals.join('\n\n');
      if (!articleUrl && text.length > 1500) return;
      const parameters = new URLSearchParams({ sl: source, tl: target });
      if (articleUrl) parameters.set('u', articleUrl);
      else {
        parameters.set('text', text);
        parameters.set('op', 'translate');
      }
      const link = document.createElement('a');
      link.textContent = t('Abrir en Google Traductor');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.href = 'https://translate.google.com/' + (articleUrl ? 'translate?' : '?') + parameters;
      status.append(' ', link);
    }

    button.addEventListener('click', async () => {
      status.textContent = '';
      if (showing) {
        nodes.forEach((node, index) => {
          node.textContent = originals[index];
          if (originalLanguages[index]) node.lang = originalLanguages[index];
          else node.removeAttribute('lang');
        });
        button.textContent = t('Traducir');
        showing = false;
        return;
      }

      let engine;
      button.disabled = true;
      button.textContent = t('Traduciendo…');
      try {
        if (!translated) {
          engine = await translator(source, target);
          if (!engine) {
            status.textContent = t('Traducción automática no disponible en este navegador.');
            addExternalLink();
            return;
          }
          const results = [];
          for (const original of originals) results.push(await engine.translate(original));
          translated = results;
        }
        nodes.forEach((node, index) => {
          node.textContent = translated[index];
          node.lang = target;
        });
        showing = true;
      } catch {
        status.textContent = t('No se pudo traducir el texto.');
        addExternalLink();
      } finally {
        engine?.destroy();
        button.disabled = false;
        button.textContent = t(showing ? 'Ver original' : 'Traducir');
      }
    });
    const actions = document.createElement('div');
    actions.className = 'vice-translation';
    actions.append(button, status);
    return actions;
  }

  window.ViceLanguage = { language, t, choose, translationButton, translateInterface, localizedUrl };
  document.addEventListener('DOMContentLoaded', () => {
    const article = document.querySelector('[data-editorial-article]');
    if (article && language === 'en' && !params.has('lang')) {
      location.replace(localizedUrl(location.href));
      return;
    }
    translateInterface(document.body);
    mount();
    if (article && language === 'en') {
      const nodes = [...article.querySelectorAll('[data-original]')].filter(node => node.textContent.trim());
      const canonical = document.querySelector('link[rel=canonical]')?.href;
      if (nodes.length) article.before(translationButton(nodes, 'es', language, canonical));
    }
  });
})();
