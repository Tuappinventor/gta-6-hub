(() => {
  const $ = id => document.getElementById(id);
  const grid = $('vehicleGrid');
  const search = $('vehicleSearch');
  const category = $('vehicleFilter');
  const make = $('vehicleMake');
  const status = $('vehicleStatus');
  const more = $('vehicleMore');
  const pageSize = 24;
  const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  const starterCars = new Map(
    (window.VICEHUB_GARAGE_CATALOG ?? []).map(car => [car.name, car])
  );
  for (const car of window.VICEHUB_GARAGE_CARS) {
    starterCars.set(car.name, { ...starterCars.get(car.name), ...car });
  }
  const vehicleFields = 'id,name,category,description,image_url,verified';
  const normalize = value => String(value ?? '').normalize('NFD')
    .replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const modelKey = name => normalize(name).replace(/[^a-z0-9]/g, '');
  const inputFilters = [category, make];
  let cars = [];
  let matches = [];
  let shown = 0;
  let editorPanel;
  let connection = 0;

  function add(parent, tag, content, className) {
    const element = document.createElement(tag);
    if (content) element.textContent = content;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }

  function webUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function link(parent, label, href) {
    add(parent, 'a', label).href = href;
  }

  function renderCard(car) {
    const article = add(grid, 'article', '', 'garage-car');
    const image = webUrl(car.image_url);
    if (image) {
      const figure = add(article, 'figure');
      const picture = add(figure, 'img');
      picture.alt = car.name;
      picture.loading = 'lazy';
      picture.addEventListener('error', () => figure.remove(), { once: true });
      picture.src = image;
      if (car.imageCredit) add(figure, 'figcaption', car.imageCredit);
    }

    const body = add(article, 'div', '', 'garage-body');
    if (car.category) add(body, 'span', car.category, 'tag');
    add(body, 'h3', car.name);

    if (!car.description && !car.acquisition && !car.sourceUrl && !car.mapId && !image) return;

    const details = add(body, 'details');
    add(details, 'summary', 'Ver ficha').setAttribute('aria-label', `Ver ficha de ${car.name}`);
    if (car.description) add(details, 'p', car.description);
    if (car.acquisition) add(details, 'p', car.acquisition);

    if (car.sourceUrl || car.mapId || image) {
      const links = add(details, 'div', '', 'garage-links');
      if (car.sourceUrl) link(links, car.sourceLabel, car.sourceUrl);
      if (image) link(links, 'Abrir imagen', image);
      if (car.mapId) {
        link(links, car.mapLabel, `./mapa-v8.html?id=${encodeURIComponent(car.mapId)}`);
      }
    }
  }

  function render() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    matches = cars.filter(car => {
      const text = normalize([car.name, car.make, car.category, car.description].join(' '))
        .replace(/['’]/g, '');
      return (!category.value || car.category === category.value)
        && (!make.value || car.make === make.value)
        && words.every(word => text.includes(word.replace(/['’]/g, '')));
    });

    grid.replaceChildren();
    shown = 0;
    showMore();
  }

  function showMore(moveFocus = false) {
    const firstNew = shown;
    const next = matches.slice(shown, shown + pageSize);
    for (const car of next) renderCard(car);
    shown += next.length;
    more.hidden = shown >= matches.length;
    status.textContent = matches.length
      ? `${shown} de ${matches.length} resultados · ${cars.length} fichas en el catálogo`
      : 'No hay coches que coincidan con la búsqueda.';
    if (moveFocus && next.length) grid.children[firstNew].querySelector('summary').focus();
  }

  function setCars(rows) {
    const byModel = new Map([...starterCars.values()].map(car => [modelKey(car.name), car]));
    for (const row of rows) {
      if (!row.verified) continue;

      const key = modelKey(row.name);
      const existing = byModel.get(key);
      byModel.set(key, {
        ...existing,
        name: row.name,
        category: row.category || existing?.category,
        description: row.description || existing?.description,
        image_url: row.image_url || existing?.image_url,
        imageCredit: row.image_url ? '' : existing?.imageCredit,
      });
    }

    cars = [...byModel.values()].sort((first, second) => collator.compare(first.name, second.name));
    for (const [select, field] of [[category, 'category'], [make, 'make']]) {
      const previous = select.value;
      const values = [...new Set(cars.map(car => car[field]).filter(Boolean))];
      values.sort(collator.compare);
      select.options.length = 1;
      for (const value of values) select.add(new Option(value, value));
      if (values.includes(previous)) select.value = previous;
    }
    render();
  }

  function showEditor(db, rows, refresh) {
    const panel = add($('editorWorkspace'), 'section', '', 'panel garage-editor');
    editorPanel = panel;
    add(panel, 'h3', 'Fichas del garaje');
    add(panel, 'p', 'Añade fichas a Supabase y marca como verificadas las que quieras publicar.');
    const form = add(panel, 'form', '', 'editor-form');
    form.innerHTML = `
      <label>Ficha de Supabase<select name="record"><option value="">Nueva ficha</option></select></label>
      <label>Nombre<input name="model" maxlength="160" required></label>
      <label>Categoría<input name="category" maxlength="80"></label>
      <label>Descripción<textarea name="description" maxlength="3000"></textarea></label>
      <label>URL de imagen<input name="image" type="url" maxlength="1000"></label>
      <label class="garage-verified"><input name="verified" type="checkbox"> Verificada y visible</label>
      <button type="submit" class="primary">Guardar ficha</button>`;
    const fields = form.elements;
    const message = add(panel, 'p');
    message.setAttribute('role', 'status');

    function fillRecord() {
      const car = rows.find(row => row.id === fields.record.value);
      fields.model.value = car?.name || '';
      fields.category.value = car?.category || '';
      fields.description.value = car?.description || '';
      fields.image.value = car?.image_url || '';
      fields.verified.checked = Boolean(car?.verified);
      message.textContent = '';
    }

    for (const car of rows) {
      fields.record.add(new Option(car.name + (car.verified ? '' : ' · borrador'), car.id));
    }
    fields.record.addEventListener('change', fillRecord);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const image = fields.image.value.trim();
      const name = fields.model.value.trim();
      if (!name || (image && !webUrl(image))) {
        message.textContent = 'Introduce un nombre y, si añades una imagen, una URL HTTP o HTTPS.';
        return;
      }

      const id = fields.record.value;
      const record = {
        name,
        category: fields.category.value.trim() || null,
        description: fields.description.value.trim() || null,
        image_url: image || null,
        verified: fields.verified.checked,
      };
      const submit = form.querySelector('button');
      submit.disabled = true;
      message.textContent = 'Guardando ficha…';

      try {
        const result = await (id
          ? db.from('vehicles').update(record).eq('id', id)
          : db.from('vehicles').insert(record)).select('id').single();
        if (result.error) throw result.error;
        try {
          await refresh(result.data.id);
        } catch {
          message.textContent = 'Ficha guardada. Recarga la página para ver los cambios.';
        }
      } catch {
        message.textContent = 'No se ha podido guardar la ficha. Comprueba tu sesión y vuelve a intentarlo.';
      } finally {
        submit.disabled = false;
      }
    });

    return (id, messageText) => {
      fields.record.value = id;
      fillRecord();
      message.textContent = messageText;
    };
  }

  async function connect(db, role) {
    const attempt = ++connection;
    const canEdit = ['editor', 'admin'].includes(role);
    editorPanel?.remove();
    editorPanel = undefined;

    async function load(savedId) {
      const query = db.from('vehicles').select(vehicleFields).order('name').order('id');
      if (!canEdit) query.eq('verified', true);

      const rows = [];
      const batchSize = 500;
      for (let start = 0; ; start += batchSize) {
        const { data, error } = await query.range(start, start + batchSize - 1);
        if (attempt !== connection) return;
        if (error) throw error;
        rows.push(...data);
        if (data.length < batchSize) break;
      }

      setCars(rows);
      if (!canEdit) return;
      editorPanel?.remove();
      const selectRecord = showEditor(db, rows, load);
      if (savedId) selectRecord(savedId, 'Ficha guardada.');
    }

    try {
      await load();
    } catch {
      if (attempt === connection && canEdit) {
        editorPanel = add($('editorWorkspace'), 'p',
          'No se han podido cargar las fichas del garaje desde Supabase.');
      }
    }
  }

  more.addEventListener('click', () => showMore(true));
  search.addEventListener('input', render);
  for (const select of inputFilters) select.addEventListener('change', render);
  setCars([]);
  if (window.location.hash === '#vehiculos') {
    document.querySelector('[data-page="vehiculos"]').click();
  }
  window.VICEHUB_GARAGE = { connect };
})();
