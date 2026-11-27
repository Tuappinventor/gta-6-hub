(() => {
  const panel = document.getElementById('editorialTraffic');
  const config = window.VICEHUB_CONFIG;
  if (!panel || !config?.url || !config?.anonKey || !window.supabase) return;

  const db = window.supabase.createClient(config.url, config.anonKey);
  const period = document.getElementById('trafficPeriod');
  const status = document.getElementById('trafficStatus');
  const summary = document.getElementById('trafficSummary');
  const visitors = document.getElementById('trafficVisitors');
  const pageviews = document.getElementById('trafficPageviews');
  const pages = document.getElementById('trafficPages');
  const sources = document.getElementById('trafficSources');
  const number = new Intl.NumberFormat('es-ES');
  let version = 0;

  function renderRanking(list, rows, fallback) {
    const items = rows.map(row => {
      const item = document.createElement('li');
      item.textContent = `${row.label || fallback} · ${number.format(row.pageviews)} vistas`;
      return item;
    });
    list.replaceChildren(...items);
    if (!items.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Sin datos en este periodo.';
      list.append(empty);
    }
  }

  async function load() {
    const request = ++version;
    summary.hidden = true;
    status.textContent = 'Cargando estadísticas…';
    try {
      const { data } = await db.auth.getSession();
      if (request !== version) return;
      if (!data.session) {
        status.textContent = 'Inicia sesión para consultar el tráfico.';
        return;
      }

      const response = await fetch('/api/editorial-traffic?days=' + period.value, {
        headers: { Authorization: 'Bearer ' + data.session.access_token },
      });
      const result = await response.json();
      if (request !== version) return;

      if (result.error === 'analytics_not_configured') {
        status.textContent = 'Pendiente de conectar la API de Vercel Analytics.';
        return;
      }
      if (response.status === 401 || response.status === 403) {
        status.textContent = 'Acceso reservado a editores y administradores.';
        return;
      }
      if (!response.ok) throw new Error('Analytics unavailable');

      visitors.textContent = number.format(result.visitors);
      pageviews.textContent = number.format(result.pageviews);
      renderRanking(pages, result.pages, 'Página sin identificar');
      renderRanking(sources, result.referrers, 'Origen sin identificar');
      status.textContent = result.pageviews ? '' : 'Aún no hay vistas registradas en este periodo.';
      summary.hidden = false;
    } catch {
      if (request === version) status.textContent = 'No se han podido cargar las estadísticas.';
    }
  }

  document.querySelector('[data-page="editor"]').addEventListener('click', load);
  period.addEventListener('change', load);
  document.getElementById('trafficReload').addEventListener('click', load);
  db.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      version++;
      summary.hidden = true;
      status.textContent = 'Inicia sesión para consultar el tráfico.';
    }
    if (event === 'SIGNED_IN' && document.getElementById('editor').classList.contains('active')) {
      setTimeout(load, 0);
    }
  });
})();
