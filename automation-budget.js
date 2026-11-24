
(() => {
  'use strict';

  // VICE HUB 3.6
  // Control presupuestario mensual

  const $ = id =>
    document.getElementById(id);

  const cfg =
    window.VICEHUB_CONFIG || {};

  const dashboard =
    $('dashboardContent');

  if (!dashboard) return;

  const services = {
    autonews: 'AutoNews',
    autoimages: 'AutoImages',
    autoguides: 'AutoGuides',
    autocategories: 'AutoCategories'
  };

  let db;
  let settings;
  let busy = false;
  let saving = false;
  let editing = false;

  const money = value =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);

  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  function mount() {
    if ($('budgetPanel')) return;

    const section =
      document.createElement('section');

    section.id = 'budgetPanel';
    section.className = 'panel';

    section.innerHTML = `
      <h2>Control presupuestario</h2>

      <p id="budgetMonth" class="muted">
        Presupuesto mensual de OpenAI
      </p>

      <div class="metrics compact">

        <article class="metric">
          <span>Presupuesto mensual</span>
          <strong id="budgetLimit">—</strong>
        </article>

        <article class="metric">
          <span>Consumo registrado</span>
          <strong id="budgetSpent">—</strong>
        </article>

        <article class="metric">
          <span>Disponible estimado</span>
          <strong id="budgetRemaining">—</strong>
        </article>

        <article class="metric">
          <span>Previsión fin de mes</span>
          <strong id="budgetForecast">—</strong>
        </article>

      </div>

      <div class="goal">

        <div class="goal-header">
          <strong>Presupuesto consumido</strong>
          <span id="budgetPercent">—</span>
        </div>

        <div class="progress-track">
          <div id="budgetProgress"
               class="progress-fill"
               style="width:0%">
          </div>
        </div>

      </div>

      <p id="budgetStatus"
         class="message"
         role="status">
        Cargando presupuesto...
      </p>

      <p id="budgetCoverage"
         class="muted">
      </p>

      <h3>Gasto mensual por servicio</h3>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Llamadas</th>
              <th>Coste USD</th>
              <th>Sin valorar</th>
            </tr>
          </thead>
          <tbody id="budgetServices"></tbody>
        </table>
      </div>

      <button id="budgetEdit"
              class="secondary"
              disabled>
        Configurar presupuesto
      </button>

      <form id="budgetForm" hidden>

        <p>
          <label for="budgetInput">
            Presupuesto mensual USD
          </label>
        </p>

        <input id="budgetInput"
               type="number"
               min="0.01"
               max="9999999999.99"
               step="0.01"
               required
               style="width:100%;
                      padding:12px;
                      border-radius:8px;
                      background:#15131f;
                      color:#fff;
                      border:1px solid #332d43">

        <p>
          <label for="budgetWarning">
            Aviso preventivo (%)
          </label>
        </p>

        <input id="budgetWarning"
               type="number"
               min="1"
               max="99"
               step="1"
               required
               style="width:100%;
                      padding:12px;
                      border-radius:8px;
                      background:#15131f;
                      color:#fff;
                      border:1px solid #332d43">

        <p>
          <label>
            <input id="budgetAlerts"
                   type="checkbox">
            Activar avisos visuales
          </label>
        </p>

        <div class="controls">

          <button id="budgetSave"
                  type="submit">
            Guardar configuración
          </button>

          <button id="budgetCancel"
                  type="button"
                  class="secondary">
            Cancelar
          </button>

        </div>

      </form>

      <p id="budgetSaveMessage"
         class="muted"
         role="status">
      </p>

      <p class="muted">
        Los importes son estimaciones.
        No incluyen impuestos ni consumo
        anterior al registro.
        El presupuesto no detiene
        las automatizaciones.
      </p>
    `;

    const anchor =
      $('estimatedCost')?.closest('.panel');

    if (anchor) {
      anchor.after(section);
    } else {
      dashboard.append(section);
    }

    $('budgetEdit').addEventListener(
      'click',
      openEditor
    );

    $('budgetCancel').addEventListener(
      'click',
      closeEditor
    );

    $('budgetForm').addEventListener(
      'submit',
      saveSettings
    );
  }

  async function checkAdmin() {
    const { data, error } =
      await db.auth.getUser();

    if (error || !data?.user) {
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

    return !profileError &&
      profile?.role === 'admin';
  }

  function monthStart() {
    const now = new Date();

    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    ));
  }

  function monthEnd() {
    const now = new Date();

    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1
    ));
  }

  async function getSettings() {
    const { data, error } = await db
      .from('automation_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    return data;
  }

  async function getMonthlyRuns() {
    const rows = [];
    const pageSize = 500;
    let offset = 0;

    const start =
      monthStart().toISOString();

    const end =
      monthEnd().toISOString();

    while (true) {
      const { data, error } = await db
        .from('automation_runs')
        .select(`
          id,
          service,
          status,
          started_at,
          api_calls,
          estimated_cost_usd,
          metadata
        `)
        .gte('started_at', start)
        .lt('started_at', end)
        .order('started_at', {
          ascending: true
        })
        .order('id', {
          ascending: true
        })
        .range(
          offset,
          offset + pageSize - 1
        );

      if (error) throw error;

      if (!data?.length) break;

      rows.push(...data);

      if (data.length < pageSize) break;

      offset += pageSize;
    }

    return rows;
  }

  function render(rows) {
    const budget =
      num(settings.monthly_budget_usd);

    const warning =
      num(settings.warning_percent);

    const totals = {};

    for (const service of
      Object.keys(services)) {

      totals[service] = {
        calls: 0,
        cost: 0,
        unknown: 0,
        historical: 0
      };
    }

    let spent = 0;
    let unknown = 0;
    let historical = 0;
    let knownCalls = 0;

    for (const row of rows) {
      const item = totals[row.service];

      if (!item) continue;

      const calls = num(row.api_calls);

      item.calls += calls;

      if (!calls) continue;

      if (
        row.estimated_cost_usd === null ||
        row.estimated_cost_usd === undefined
      ) {
        unknown++;
        item.unknown++;
        continue;
      }

      const cost =
        num(row.estimated_cost_usd);

      spent += cost;
      item.cost += cost;
      knownCalls += calls;

      if (
        row.metadata?.historical_estimate ||
        row.metadata?.cost_complete === false
      ) {
        historical++;
        item.historical++;
      }
    }

    const percent =
      budget > 0
        ? spent / budget * 100
        : 0;

    const remaining =
      Math.max(0, budget - spent);

    const now = new Date();

    const start = monthStart();
    const end = monthEnd();

    const elapsed =
      (now - start) / 86400000;

    const monthDays =
      (end - start) / 86400000;

    // No extrapolar un mes completo
    // cuando faltan registros.

    const first = rows[0]?.started_at;

    const sufficientCoverage =
      first &&
      new Date(first) - start
        <= 86400000 &&
      elapsed >= 3 &&
      unknown === 0 &&
      historical === 0 &&
      knownCalls > 0;

    const forecast =
      sufficientCoverage
        ? spent / elapsed * monthDays
        : null;

    const month =
      new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(now);

    $('budgetMonth').textContent =
      `Mes natural: ${month} · UTC`;

    $('budgetLimit').textContent =
      money(budget);

    const hasCost =
      knownCalls > 0 ||
      (rows.length > 0 && unknown === 0);

    $('budgetSpent').textContent =
      hasCost ? money(spent) : '—';

    $('budgetRemaining').textContent =
      hasCost ? money(remaining) : '—';

    $('budgetForecast').textContent =
      forecast === null
        ? 'Sin datos suficientes'
        : money(forecast);

    $('budgetPercent').textContent =
      hasCost
        ? `${percent.toFixed(1)} %`
        : '—';

    $('budgetProgress').style.width =
      `${Math.min(100, percent)}%`;

    let color = '#4ade80';

    let message =
      'Consumo registrado dentro del presupuesto.';

    if (percent >= 100) {
      color = '#fb7185';
      message =
        'Presupuesto mensual alcanzado.';
    } else if (percent >= warning) {
      color = '#fbbf24';
      message =
        'Precaución: presupuesto próximo al límite.';
    }

    if (!knownCalls && spent === 0) {
      color = '#a78bfa';
      message =
        'Todavía no hay consumo valorado de API.';
    }

    if (!settings.alerts_enabled) {
      color = '#a78bfa';
      message = 'Avisos visuales desactivados.';
    }

    $('budgetProgress')
      .style.background = color;

    $('budgetStatus').style.color =
      color;

    $('budgetStatus').textContent =
      message;

    const notes = [];

    if (unknown > 0) {
      notes.push(
        `${unknown} ejecuciones sin coste valorado.`
      );
    }

    if (historical > 0) {
      notes.push(
        `${historical} estimaciones históricas.`
      );
    }

    if (
      !first ||
      new Date(first) - start > 86400000
    ) {
      notes.push(
        'El registro no cubre el mes completo.'
      );
    }

    if (!rows.length) {
      notes.push(
        'No hay ejecuciones registradas este mes.'
      );
    }

    notes.push(
      'El saldo disponible se basa únicamente en los costes conocidos.'
    );

    $('budgetCoverage').textContent =
      notes.join(' ');

    $('budgetServices').innerHTML =
      Object.entries(totals)
        .sort((a, b) =>
          b[1].cost - a[1].cost
        )
        .map(([key, item]) => `
          <tr>
            <td>${services[key]}</td>
            <td>${item.calls}</td>
            <td>${money(item.cost)}</td>
            <td>${item.unknown}</td>
          </tr>
        `).join('');

    $('budgetEdit').disabled = false;
  }

  function openEditor() {
    if (!settings) return;

    editing = true;

    $('budgetInput').value =
      settings.monthly_budget_usd;

    $('budgetWarning').value =
      settings.warning_percent;

    $('budgetAlerts').checked =
      settings.alerts_enabled;

    $('budgetForm').hidden = false;
    $('budgetEdit').hidden = true;
  }

  function closeEditor() {
    editing = false;

    $('budgetForm').hidden = true;
    $('budgetEdit').hidden = false;
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (saving) return;

    const budget =
      Number($('budgetInput').value);

    const warning =
      Number($('budgetWarning').value);

    if (
      !Number.isFinite(budget) ||
      budget <= 0 ||
      budget > 9999999999.99 ||
      !Number.isInteger(warning) ||
      warning < 1 ||
      warning > 99
    ) {
      $('budgetSaveMessage').textContent =
        'Revisa los valores introducidos.';
      return;
    }

    saving = true;
    $('budgetSave').disabled = true;

    try {
      if (!(await checkAdmin())) {
        throw new Error(
          'Permisos insuficientes'
        );
      }

      const { data, error } = await db
        .from('automation_settings')
        .update({
          monthly_budget_usd: budget,
          warning_percent: warning,
          alerts_enabled:
            $('budgetAlerts').checked,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;

      settings = data;

      closeEditor();

      $('budgetSaveMessage').textContent =
        'Configuración guardada correctamente.';

    } catch (error) {
      console.error(
        '[BUDGET] Error guardando',
        error
      );

      $('budgetSaveMessage').textContent =
        'No se ha podido guardar la configuración.';

    } finally {
      saving = false;
      $('budgetSave').disabled = false;
    }

    await refresh();
  }

  async function refresh() {
    if (
      busy ||
      saving ||
      dashboard.hidden
    ) return;

    busy = true;

    try {
      if (!(await checkAdmin())) {
        if ($('budgetPanel')) {
          $('budgetPanel').hidden = true;
        }
        return;
      }

      mount();

      $('budgetPanel').hidden = false;

      const [config, rows] =
        await Promise.all([
          getSettings(),
          getMonthlyRuns()
        ]);

      if (!editing) {
        settings = config;
      }

      render(rows);

    } catch (error) {
      console.error(
        '[BUDGET] Error de carga',
        error
      );

      if ($('budgetStatus')) {
        $('budgetStatus').textContent =
          'No se ha podido cargar el presupuesto. Comprueba la tabla automation_settings.';
      }

    } finally {
      busy = false;
    }
  }

  function init() {
    if (
      !cfg.url ||
      !cfg.anonKey ||
      !window.supabase
    ) return;

    db = window.supabase.createClient(
      cfg.url,
      cfg.anonKey
    );

    $('refreshButton')
      ?.addEventListener(
        'click',
        refresh
      );

    const observer =
      new MutationObserver(() => {
        if (!dashboard.hidden) {
          refresh();
        }
      });

    observer.observe(dashboard, {
      attributes: true,
      attributeFilter: ['hidden']
    });

    setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 60000);

    refresh();
  }

  init();

})();
  
