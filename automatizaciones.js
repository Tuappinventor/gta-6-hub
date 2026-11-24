
/* =========================================
   VICE HUB 3.6
   Control de automatizaciones
   ========================================= */

(() => {

  'use strict';

  const cfg = window.VICEHUB_CONFIG || {};

  const $ = id =>
    document.getElementById(id);

  const SERVICES = {

    autonews: {
      name: 'AutoNews',
      description: 'Noticias automáticas',
      workflow: 'automatic-news.yml'
    },

    autoimages: {
      name: 'AutoImages',
      description: 'Generación de imágenes',
      workflow: 'automatic-images.yml'
    },

    autoguides: {
      name: 'AutoGuides',
      description: 'Generación de guías',
      workflow: 'automatic-guides.yml'
    },

    autocategories: {
      name: 'AutoCategories',
      description: 'Clasificación editorial',
      workflow: 'reclassify-articles.yml'
    }
  };

  const GITHUB =
    'https://github.com/Tuappinventor/gta-6-hub';

  const STATUS = {
    success: 'Correcto',
    skipped: 'Omitido',
    error: 'Error',
    running: 'En ejecución',
    unknown: 'Sin registros'
  };

  let db = null;
  let authorized = false;
  let loading = false;
  let refreshTimer = null;

  let runs = [];
  let latestRuns = [];

  let visibleRows = 30;

  const PAGE_SIZE = 500;

  // =======================================
  // UTILIDADES
  // =======================================

  const escapeHTML = value =>
    String(value ?? '')
      .replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);

  const number = value => {

    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : 0;
  };

  const formatNumber = value =>
    new Intl.NumberFormat('es-ES')
      .format(number(value));

  const formatMoney = value =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(number(value));

  function setText(id, value) {

    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatDate(value) {

    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(ms) {

    if (ms === null || ms === undefined) {
      return '—';
    }

    const seconds =
      Math.max(0, Math.round(number(ms) / 1000));

    if (seconds < 60) {
      return `${seconds} s`;
    }

    return `${Math.floor(seconds / 60)} min ${
      seconds % 60
    } s`;
  }

  function sum(rows, field) {

    return rows.reduce(
      (total, row) =>
        total + number(row[field]),
      0
    );
  }

  function todayStart() {

    const date = new Date();

    date.setUTCHours(0, 0, 0, 0);

    return date;
  }

  function periodStart() {

    const date = todayStart();

    const period = $('period').value;

    if (period === '7' || period === '30') {

      date.setUTCDate(
        date.getUTCDate() -
        (Number(period) - 1)
      );
    }

    return date.toISOString();
  }

  function showMessage(message, type = '') {

    const element = $('dashboardMessage');

    element.textContent = message;

    element.className =
      `message ${type}`;
  }

  function statusBadge(status) {

    const safeStatus =
      Object.hasOwn(STATUS, status)
        ? status
        : 'unknown';

    return `
      <span class="status ${safeStatus}">
        ${STATUS[safeStatus]}
      </span>
    `;
  }

  function safeRunUrl(row) {

    try {

      const url = new URL(
        row.github_run_url || ''
      );

      if (
        url.origin === 'https://github.com' &&
        /^\/Tuappinventor\/gta-6-hub\/actions\/runs\/\d+\/?$/
          .test(url.pathname)
      ) {

        return url.href;
      }

    } catch {
      // Utilizar el enlace del workflow.
    }

    const service = SERVICES[row.service];

    return service
      ? `${GITHUB}/actions/workflows/${service.workflow}`
      : `${GITHUB}/actions`;
  }

  // =======================================
  // SEGURIDAD Y AUTORIZACIÓN
  // =======================================

  function denyAccess(message) {

    authorized = false;

    runs = [];
    latestRuns = [];

    $('dashboardContent').hidden = true;
    $('accessGate').hidden = false;

    setText('accessMessage', message);

    if (refreshTimer) {

      clearInterval(refreshTimer);

      refreshTimer = null;
    }
  }

  async function checkAdmin() {

    const {
      data,
      error
    } = await db.auth.getUser();

    if (error || !data?.user) {

      denyAccess(
        'Inicia sesión en VICE HUB con tu cuenta de administrador.'
      );

      return false;
    }

    const {
      data: profile,
      error: profileError
    } = await db
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {

      denyAccess(
        'No se han podido comprobar los permisos.'
      );

      return false;
    }

    if (profile?.role !== 'admin') {

      denyAccess(
        'Este apartado es exclusivo para administradores.'
      );

      return false;
    }

    authorized = true;

    $('accessGate').hidden = true;
    $('dashboardContent').hidden = false;

    return true;
  }

  // =======================================
  // CONSULTAR REGISTROS
  // =======================================

  async function fetchRuns() {

    const result = [];

    const start = periodStart();

    const end = new Date().toISOString();

    let offset = 0;

    while (true) {

      const {
        data,
        error
      } = await db
        .from('automation_runs')
        .select('*')
        .gte('started_at', start)
        .lte('started_at', end)
        .order('started_at', {
          ascending: false
        })
        .order('id', {
          ascending: false
        })
        .range(
          offset,
          offset + PAGE_SIZE - 1
        );

      if (error) throw error;

      if (!data?.length) break;

      result.push(...data);

      if (data.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
    }

    return result;
  }

  async function fetchLatestRuns() {

    const result = await Promise.all(

      Object.keys(SERVICES)
        .map(async service => {

          const {
            data,
            error
          } = await db
            .from('automation_runs')
            .select('*')
            .eq('service', service)
            .order('started_at', {
              ascending: false
            })
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          return data;
        })
    );

    return result.filter(Boolean);
  }

  async function fetchPendingImages() {

    const {
      count,
      error
    } = await db
      .from('articles')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('status', 'published')
      .or('image_url.is.null,image_url.eq.');

    if (error) throw error;

    return count ?? 0;
  }

  // =======================================
  // ESTADÍSTICAS PRINCIPALES
  // =======================================

  function renderMetrics(pending) {

    const fields = {

      detected: 'articles_detected',

      published: 'articles_published',

      drafts: 'drafts_created',

      guidesCreated: 'guides_created',

      guidesUpdated: 'guides_updated',

      imagesGenerated: 'images_generated',

      imagesLinked: 'images_linked',

      classified: 'articles_classified',

      apiCalls: 'api_calls',

      totalTokens: 'total_tokens',

      inputTokens: 'input_tokens',

      outputTokens: 'output_tokens',

      cachedTokens: 'cached_tokens'
    };

    Object.entries(fields)
      .forEach(([id, field]) => {

        setText(
          id,
          runs.length
            ? formatNumber(sum(runs, field))
            : '—'
        );
      });

    setText(
      'pendingImages',
      pending === null
        ? '—'
        : formatNumber(pending)
    );

    setText(
      'errors',
      runs.length
        ? formatNumber(
            runs.filter(
              row => row.status === 'error'
            ).length
          )
        : '—'
    );
  }

  // =======================================
  // OBJETIVOS DIARIOS
  // =======================================

  function renderGoals() {

    const start =
      todayStart().getTime();

    const today = runs.filter(
      row =>
        new Date(row.started_at).getTime()
          >= start
    );

    const goals = [

      {
        label: 'Noticias publicadas',
        service: 'autonews',
        value: sum(
          today,
          'articles_published'
        ),
        target: 3
      },

      {
        label: 'Imágenes vinculadas',
        service: 'autoimages',
        value: sum(
          today,
          'images_linked'
        ),
        target: 3
      },

      {
        label: 'Guías creadas',
        service: 'autoguides',
        value: sum(
          today,
          'guides_created'
        ),
        target: 1
      }
    ];

    $('dailyGoals').innerHTML = goals
      .map(goal => {

        const available = today.some(
          row => row.service === goal.service
        );

        const percentage = Math.min(
          100,
          Math.max(
            0,
            goal.value / goal.target * 100
          )
        );

        return `
          <div class="goal">

            <div class="goal-header">

              <span>
                ${escapeHTML(goal.label)}
              </span>

              <strong>
                ${
                  available
                    ? formatNumber(goal.value)
                    : '—'
                } / ${goal.target}
              </strong>

            </div>

            <div class="progress-track"
                 role="progressbar"
                 aria-label="${escapeHTML(goal.label)}"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-valuenow="${percentage}">

              <div class="progress-fill"
                   style="width:${percentage}%">
              </div>

            </div>

          </div>
        `;
      }).join('');
  }

  // =======================================
  // CONSUMO Y COSTES
  // =======================================

  function renderCosts() {

    const chargedRuns = runs.filter(
      row => number(row.api_calls) > 0
    );

    const knownCosts = chargedRuns.filter(
      row =>
        row.estimated_cost_usd !== null &&
        row.estimated_cost_usd !== undefined &&
        Number.isFinite(
          Number(row.estimated_cost_usd)
        )
    );

    const total = sum(
      knownCosts,
      'estimated_cost_usd'
    );

    if (!runs.length) {

      setText('estimatedCost', '—');

      setText(
        'costMessage',
        'No hay registros en el periodo seleccionado.'
      );

    } else if (!chargedRuns.length) {

      setText(
        'estimatedCost',
        formatMoney(0)
      );

      setText(
        'costMessage',
        'No se han registrado llamadas a OpenAI durante este periodo.'
      );

    } else if (!knownCosts.length) {

      setText('estimatedCost', '—');

      setText(
        'costMessage',
        'Costes pendientes de calcular. Los tokens registrados ya están disponibles.'
      );

    } else {

      setText(
        'estimatedCost',
        formatMoney(total)
      );

      setText(
        'costMessage',
        knownCosts.length < chargedRuns.length
          ? 'Coste parcial: existen ejecuciones sin valoración económica.'
          : 'Coste estimado de las ejecuciones registradas. Puede diferir de la facturación oficial.'
      );
    }

    // Agrupar consumo por modelo.

    const models = new Map();

    for (const row of chargedRuns) {

      const model =
        row.model || 'Desconocido';

      if (!models.has(model)) {

        models.set(model, {
          calls: 0,
          input: 0,
          output: 0,
          total: 0
        });
      }

      const item = models.get(model);

      item.calls +=
        number(row.api_calls);

      item.input +=
        number(row.input_tokens);

      item.output +=
        number(row.output_tokens);

      item.total +=
        number(row.total_tokens);
    }

    $('modelRows').innerHTML =
      [...models.entries()]
        .sort(
          (a, b) => b[1].calls - a[1].calls
        )
        .map(([model, item]) => `
          <tr>

            <td>${escapeHTML(model)}</td>

            <td>${formatNumber(item.calls)}</td>

            <td>${formatNumber(item.input)}</td>

            <td>${formatNumber(item.output)}</td>

            <td>${formatNumber(item.total)}</td>

          </tr>
        `).join('') ||

        `<tr>
          <td colspan="5" class="empty">
            Sin consumo registrado.
          </td>
        </tr>`;
  }

  // =======================================
  // ESTADO DE LOS SERVICIOS
  // =======================================

  function renderServices() {

    $('serviceGrid').innerHTML =
      Object.entries(SERVICES)
        .map(([key, service]) => {

          const last = latestRuns.find(
            row => row.service === key
          );

          const periodRuns = runs.filter(
            row => row.service === key
          );

          const errors = periodRuns.filter(
            row => row.status === 'error'
          ).length;

          const status =
            last?.status || 'unknown';

          const message =
            last?.message ||
            last?.error_message ||
            'Todavía no hay actividad registrada.';

          const stale =
            status === 'running' &&
            Date.now() -
              new Date(last.started_at).getTime()
              > 30 * 60 * 1000;

          return `
            <article class="service-card">

              <h3>
                ${escapeHTML(service.name)}
              </h3>

              <p>
                ${escapeHTML(service.description)}
              </p>

              ${statusBadge(status)}

              <p>
                Última ejecución:
                ${formatDate(last?.started_at)}
              </p>

              <p>
                ${escapeHTML(message)}
              </p>

              ${
                stale
                  ? `<p class="message error">
                      Ejecución sin finalizar.
                      Revisar GitHub Actions.
                    </p>`
                  : ''
              }

              <p>
                Ejecuciones del periodo:
                ${formatNumber(periodRuns.length)}
              </p>

              <p>
                Errores del periodo:
                ${formatNumber(errors)}
              </p>

              <a href="${GITHUB}/actions/workflows/${service.workflow}"
                 target="_blank"
                 rel="noopener noreferrer">

                Abrir GitHub Actions ↗

              </a>

            </article>
          `;
        }).join('');
  }

  // =======================================
  // HISTORIAL DE EJECUCIONES
  // =======================================

  function renderHistory() {

    const service =
      $('serviceFilter').value;

    const status =
      $('statusFilter').value;

    const filtered = runs.filter(row => {

      const serviceMatches =
        service === 'all' ||
        row.service === service;

      const statusMatches =
        status === 'all' ||
        row.status === status;

      return serviceMatches &&
        statusMatches;
    });

    const visible =
      filtered.slice(0, visibleRows);

    $('historyRows').innerHTML =
      visible.map(row => {

        const name =
          SERVICES[row.service]?.name ||
          row.service;

        const message =
          row.error_message ||
          row.message ||
          '—';

        return `
          <tr>

            <td>
              ${formatDate(row.started_at)}
            </td>

            <td>
              ${escapeHTML(name)}
            </td>

            <td>
              ${statusBadge(row.status)}
            </td>

            <td>
              ${formatDuration(row.duration_ms)}
            </td>

            <td>
              ${formatNumber(row.api_calls)}
            </td>

            <td>
              ${formatNumber(row.total_tokens)}
            </td>

            <td>
              ${escapeHTML(message)}
            </td>

            <td>

              <a href="${escapeHTML(safeRunUrl(row))}"
                 target="_blank"
                 rel="noopener noreferrer">

                Ver ejecución ↗

              </a>

            </td>

          </tr>
        `;
      }).join('') ||

      `<tr>
        <td colspan="8" class="empty">
          No hay ejecuciones para estos filtros.
        </td>
      </tr>`;

    setText(
      'historyCount',
      `Mostrando ${visible.length} de ${
        filtered.length
      } ejecuciones`
    );

    $('loadMore').hidden =
      visible.length >= filtered.length;
  }

  // =======================================
  // ERRORES RECIENTES
  // =======================================

  function renderErrors() {

    const errors = runs
      .filter(
        row => row.status === 'error'
      )
      .slice(0, 10);

    $('errorList').innerHTML =
      errors.map(row => {

        const name =
          SERVICES[row.service]?.name ||
          row.service;

        return `
          <article class="error-item">

            <strong>
              ${escapeHTML(name)}
            </strong>

            <p>
              <small>
                ${formatDate(row.started_at)}
              </small>
            </p>

            <p>
              ${escapeHTML(
                row.error_message ||
                row.message ||
                'Error sin descripción.'
              )}
            </p>

            <a class="button secondary"
               href="${escapeHTML(safeRunUrl(row))}"
               target="_blank"
               rel="noopener noreferrer">

              Revisar ejecución

            </a>

          </article>
        `;
      }).join('') ||

      `<p class="empty">
        No hay errores registrados
        en el periodo seleccionado.
      </p>`;
  }

  // =======================================
  // ACTUALIZAR PANEL
  // =======================================

  async function refresh() {

    if (!authorized || loading) return;

    loading = true;

    $('refreshButton').disabled = true;
    $('period').disabled = true;

    showMessage(
      'Actualizando estadísticas...'
    );

    try {

      if (!(await checkAdmin())) return;

      const [
        periodData,
        latestData,
        pendingResult
      ] = await Promise.all([

        fetchRuns(),

        fetchLatestRuns(),

        fetchPendingImages()
          .then(value => ({
            value,
            error: false
          }))
          .catch(() => ({
            value: null,
            error: true
          }))
      ]);

      if (!authorized) return;

      runs = periodData;
      latestRuns = latestData;

      renderMetrics(
        pendingResult.value
      );

      renderGoals();

      renderCosts();

      renderServices();

      renderHistory();

      renderErrors();

      setText(
        'lastUpdate',
        `Última actualización: ${
          formatDate(new Date())
        } · Hora peninsular española`
      );

      if (pendingResult.error) {

        showMessage(
          'Estadísticas cargadas. No se pudo consultar el número actual de imágenes pendientes.',
          'error'
        );

      } else if
