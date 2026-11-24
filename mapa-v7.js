
(() => {
  'use strict';

  // VICE HUB - Leonida Maps 7.0
  // Categorías múltiples y marcadores

  const $ = id =>
    document.getElementById(id);

  const world = $('world');
  const items = $('items');
  const filter = $('filter');

  if (!world || !items || !filter) return;

  const categories = {
    ciudad: ['🏙️', 'Ciudades', '#38bdf8'],
    region: ['🗺️', 'Regiones', '#818cf8'],
    isla: ['🏝️', 'Islas', '#2dd4bf'],
    aeropuerto: ['✈️', 'Aeropuertos', '#94a3b8'],
    garaje: ['🚗', 'Garajes', '#f97316'],
    casa: ['🏠', 'Casas', '#a78bfa'],
    tienda: ['🛒', 'Tiendas', '#22c55e'],
    vehiculo: ['🚘', 'Vehículos', '#eab308'],
    secreto: ['💎', 'Secretos', '#ec4899'],
    mision: ['🎯', 'Misiones', '#ef4444'],
    coleccionable: ['⭐', 'Coleccionables', '#fbbf24'],
    arma: ['🔫', 'Armas', '#f87171'],
    servicio: ['🏥', 'Servicios', '#14b8a6'],
    otro: ['📍', 'Otros', '#64748b']
  };

  const keys = Object.keys(categories);

  const storageKey =
    'vicehub-map-v7-filters';

  let active = new Set(keys);

  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey)
    );

    if (Array.isArray(saved)) {
      active = new Set(
        saved.filter(k => keys.includes(k))
      );
    }
  } catch {}

  let verifiedOnly = false;
  let hideVisited = false;
  let scheduled = false;

  const style =
    document.createElement('style');

  style.textContent = `
    #mapV7Filters {
      margin: 12px 0;
      padding: 12px;
      border: 1px solid #35445d;
      border-radius: 12px;
      background: #111a2b;
    }

    #mapV7Filters h3 {
      margin: 0 0 12px;
      color: #ffc2de;
      font-size: 15px;
    }

    .v7-filter-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 6px;
    }

    .v7-filter {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 9px 6px;
      text-align: left;
      font-size: 11px;
      min-width: 0;
      background: #19253b;
      border: 1px solid #35445d;
    }

    .v7-filter.active {
      border-color: var(--category-color);
      background: #263149;
    }

    .v7-filter:not(.active) {
      opacity: .5;
    }

    .v7-filter-count {
      margin-left: auto;
      font-size: 10px;
      color: #cbd5e1;
    }

    .v7-actions {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }

    .v7-actions button {
      flex: 1;
      font-size: 11px;
      padding: 8px 4px;
    }

    .v7-options {
      display: grid;
      gap: 7px;
      margin-top: 12px;
      font-size: 12px;
    }

    .v7-options input {
      width: auto;
      margin: 0 5px 0 0;
    }

    .v7-hidden {
      display: none !important;
    }

    #world .marker[data-v7-category] {
      background: var(--pin-color);
    }

    #world .marker.done[data-v7-category] {
      background: #119c79;
      border-color: #a7f3d0;
    }

    #world .marker.unverified {
      border-style: dashed;
    }

    #v7VisibleCount {
      color: #aebdd2;
      font-size: 12px;
      margin: 10px 0 0;
    }

    @media(max-width:700px) {
      .v7-filter-grid {
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
      }

      .v7-filter {
        font-size: 10px;
      }
    }
  `;

  document.head.append(style);

  const panel =
    document.createElement('section');

  panel.id = 'mapV7Filters';

  panel.innerHTML = `
    <h3>Categorías del mapa</h3>

    <div class="v7-actions">
      <button id="v7All" type="button">
        Mostrar todo
      </button>
      <button id="v7None" type="button">
        Ocultar todo
      </button>
    </div>

    <div class="v7-filter-grid"
         id="v7Categories">
    </div>

    <div class="v7-options">
      <label>
        <input type="checkbox"
               id="v7Verified">
        Solo ubicaciones verificadas
      </label>

      <label>
        <input type="checkbox"
               id="v7Unvisited">
        Ocultar lugares visitados
      </label>
    </div>

    <p id="v7VisibleCount"></p>
  `;

  filter.after(panel);

  // Mantener el filtro original en modo
  // todas las categorías.

  filter.value = 'all';
  filter.style.display = 'none';

  const buttons = {};

  for (const [key, info] of
    Object.entries(categories)) {

    const [icon, label, color] = info;

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className = 'v7-filter';

    button.style.setProperty(
      '--category-color',
      color
    );

    const name =
      document.createElement('span');

    name.textContent =
      `${icon} ${label}`;

    const count =
      document.createElement('span');

    count.className = 'v7-filter-count';
    count.textContent = '0';

    button.append(name, count);

    button.addEventListener('click', () => {
      if (active.has(key)) {
        active.delete(key);
      } else {
        active.add(key);
      }

      saveFilters();
      applyFilters();
    });

    buttons[key] = {
      button,
      count
    };

    $('v7Categories').append(button);
  }

  function saveFilters() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([...active])
      );
    } catch {}
  }

  function markerCategory(marker) {
    const icon =
      marker.textContent.trim();

    return keys.find(key =>
      categories[key][0] === icon
    ) || 'otro';
  }

  function applyFilters() {
    const markers = [
      ...world.querySelectorAll('.marker')
    ];

    const rows = [
      ...items.querySelectorAll('.item')
    ];

    const counts = Object.fromEntries(
      keys.map(key => [key, 0])
    );

    let visible = 0;

    markers.forEach((marker, index) => {
      const category =
        markerCategory(marker);

      const info =
        categories[category];

      counts[category]++;

      marker.dataset.v7Category =
        category;

      marker.style.setProperty(
        '--pin-color',
        info[2]
      );

      const verified =
        !marker.classList.contains(
          'unverified'
        );

      const visited =
        marker.classList.contains('done');

      const show =
        active.has(category) &&
        (!verifiedOnly || verified) &&
        (!hideVisited || !visited);

      marker.classList.toggle(
        'v7-hidden',
        !show
      );

      if (rows[index]) {
        rows[index].classList.toggle(
          'v7-hidden',
          !show
        );
      }

      if (show) visible++;
    });

    for (const key of keys) {
      const enabled = active.has(key);

      buttons[key].button
        .classList.toggle(
          'active',
          enabled
        );

      buttons[key].button.setAttribute(
        'aria-pressed',
        String(enabled)
      );

      buttons[key].count.textContent =
        counts[key];
    }

    $('v7VisibleCount').textContent =
      `${visible} de ${markers.length} ubicaciones seleccionadas`;
  }

  function schedule() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      applyFilters();
    });
  }

  $('v7All').onclick = () => {
    active = new Set(keys);
    saveFilters();
    applyFilters();
  };

  $('v7None').onclick = () => {
    active.clear();
    saveFilters();
    applyFilters();
  };

  $('v7Verified').onchange = event => {
    verifiedOnly = event.target.checked;
    applyFilters();
  };

  $('v7Unvisited').onchange = event => {
    hideVisited = event.target.checked;
    applyFilters();
  };

  // Completar las categorías del editor.

  const editorSelect = $('pinCategory');

  if (editorSelect) {
    for (const [key, info] of
      Object.entries(categories)) {

      const exists = [
        ...editorSelect.options
      ].some(option =>
        option.value === key
      );

      if (!exists) {
        const option =
          document.createElement('option');

        option.value = key;
        option.textContent =
          `${info[0]} ${info[1]}`;

        editorSelect.append(option);
      }
    }
  }

  // Actualizar al cargar Supabase,
  // buscar, editar o marcar visitados.

  const observer =
    new MutationObserver(schedule);

  observer.observe(world, {
    childList: true
  });

  observer.observe(items, {
    childList: true
  });

  $('search')?.addEventListener(
    'input',
    schedule
  );

  filter.dispatchEvent(
    new Event('change')
  );

  applyFilters();

})();
                    
