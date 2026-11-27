
(() => {
'use strict';

// VICE HUB - Leonida Maps 8.2

const V82 = 'vicehub-maps-v82';

let districts = [];
let districtLayer = L.layerGroup();
let selectedDistrict = '';
let favoritesOnly = false;
let showDistricts = false;

const favorites = new Set(
 read(':favorites-v82', [])
);

window.VICE_MAP_FAVORITES = function(ids) {

 favorites.clear();

 for(const id of ids) {
  favorites.add(id);
 }

 if(currentPanel === 'favorites') {
  renderPanel('favorites');
 }
};

const originalMatches = matches;
const originalPopup = popup;
const originalPanel = renderPanel;
const originalOpen = openLocation;

function districtName(p) {
 return String(p.district || p.area || '');
}

function inDistrict(p) {
 return !selectedDistrict ||
 normalize(districtName(p)) ===
 normalize(selectedDistrict);
}

matches = function(p) {
 return originalMatches(p) &&
 inDistrict(p) &&
 (!favoritesOnly || favorites.has(p.id));
};

function saveFavorites() {
 save(':favorites-v82', [...favorites]);
}

function selectDistrict(name) {
 selectedDistrict = name;
 favoritesOnly = false;
 query = '';

 renderMarkers();
 drawDistricts();

 if(name) {
  const d = districts.find(
   item => item.name === name
  );

  if(d && d.rings?.length) {
   const points = d.rings.flat()
    .filter(p =>
     Array.isArray(p) &&
     Number.isFinite(p[0]) &&
     Number.isFinite(p[1])
    )
    .map(p => [-p[1],p[0]]);

   if(points.length) {
    map.fitBounds(
     L.latLngBounds(points),
     {padding:[20,20],maxZoom:5}
    );
   }
  }
 }

 renderPanel('districts');
}

function drawDistricts() {

 districtLayer.clearLayers();

 if(!showDistricts) return;

 for(const d of districts) {

  const rings = (d.rings || [])
   .map(ring => ring
    .filter(p =>
     Number.isFinite(p[0]) &&
     Number.isFinite(p[1])
    )
    .map(p => [-p[1],p[0]])
   )
   .filter(ring => ring.length >= 3);

  const selected =
   selectedDistrict === d.name;

  for(const ring of rings) {

   const polygon = L.polygon(ring,{
    color:selected?'#f472b6':'#38bdf8',
    weight:selected?3:1,
    fillColor:selected?'#ec4899':'#38bdf8',
    fillOpacity:selected?.18:.035
   });

   polygon.bindTooltip(d.name,{
    sticky:true
   });

   polygon.on('click',event => {
    L.DomEvent.stopPropagation(event);
    selectDistrict(d.name);
   });

   polygon.addTo(districtLayer);
  }
 }
}

districtLayer.addTo(map);

async function loadDistricts() {

 try {

  const data = await getJSON(
   '/data/districts.json'
  );

  if(!Array.isArray(data)) {
   throw Error('Formato incompatible');
  }

  districts = data.filter(d =>
   d &&
   typeof d.name === 'string' &&
   Array.isArray(d.rings)
  );

  drawDistricts();

  if(currentPanel === 'districts') {
   renderPanel('districts');
  }

 } catch(error) {

  console.warn(
   'VICE HUB: distritos no disponibles',
   error
  );

  if(currentPanel === 'districts') {
   $('panelContent').append(
    paragraph('No se pudieron cargar los límites.')
   );
  }
 }
}

function showLocation(p) {

 selectedDistrict = '';
 favoritesOnly = false;

 drawDistricts();
 originalOpen(p);
}

openLocation = showLocation;

function nextNearby(p) {

 const candidates = locations.filter(
  item =>
   item.id !== p.id &&
   item.kind === p.kind &&
   category(item).pinnable &&
   !found.has(item.id) &&
   inDistrict(item)
 );

 if(!candidates.length) {
  alert('No quedan ubicaciones pendientes de esta categoría en la zona seleccionada.');
  return;
 }

 let nearest = null;
 let distance = Infinity;

 for(const item of candidates) {

  const d = Math.hypot(
   item.x-p.x,
   item.y-p.y
  );

  if(d < distance) {
   distance = d;
   nearest = item;
  }
 }

 if(nearest) {
  active.add(nearest.kind);
  query = '';
  favoritesOnly = false;

  closePanel();
  renderMarkers();

  const marker =
   markerIndex.get(nearest.id);

  if(marker) {
   cluster.zoomToShowLayer(
    marker,
    () => marker.openPopup()
   );
  }
 }
}

async function shareLocation(p) {

 const url = new URL(location.href);

 url.search = '';
 url.hash = '';

 url.searchParams.set('id',p.id);

 const link = url.toString();

 try {

  if(navigator.share) {

   await navigator.share({
    title:pointLabel(p),
    text:'Ubicación en VICE HUB',
    url:link
   });

  } else if(navigator.clipboard) {

   await navigator.clipboard.writeText(link);
   alert('Enlace copiado');

  } else {

   prompt('Copia el enlace:',link);
  }

 } catch(error) {

  if(error.name !== 'AbortError') {
   prompt('Copia el enlace:',link);
  }
 }
}

popup = function(p) {

 const content = originalPopup(p);

 const favoriteButton = makeButton(
  favorites.has(p.id)
   ? '★ Quitar de favoritos'
   : '☆ Añadir a favoritos',
  () => {

   if(favorites.has(p.id)) {
    favorites.delete(p.id);
   } else {
    favorites.add(p.id);
   }

   saveFavorites();

   favoriteButton.textContent = t(favorites.has(p.id)
     ? '★ Quitar de favoritos'
     : '☆ Añadir a favoritos');

   if(favoritesOnly) {
    map.closePopup();
    renderMarkers();
   }

   if(currentPanel === 'favorites') {
    renderPanel('favorites');
   }
  }
 );

 content.append(favoriteButton);

 if(category(p).pinnable) {

  content.append(
   makeButton(
    '📍 Siguiente pendiente cercano',
    () => nextNearby(p)
   )
  );
 }

 content.append(
  makeButton(
   '🔗 Compartir ubicación',
   () => shareLocation(p)
  )
 );

 return content;
};

function locationRow(p) {

 const b = makeButton(
  `${category(p).icon || '📍'} ${pointLabel(p)}`,
  () => showLocation(p)
 );

 b.className = 'result';

 const small = document.createElement('small');

 small.textContent = [
  categoryLabel(p),
  districtName(p)
 ].filter(Boolean).join(' · ');

 b.append(small);

 return b;
}

function progressText(list) {

 const trackable = list.filter(
  p => category(p).pinnable
 );

 const done = trackable.filter(
  p => found.has(p.id)
 ).length;

 return `${list.length} ${choose('lugares', 'locations')} · ${done}/${trackable.length} ${choose('registrados', 'found')}`;
}

renderPanel = function(type) {

 if(!['districts','favorites'].includes(type)) {

  originalPanel(type);

  if(type === 'layers') {

   $('panelContent').append(
    makeButton(
     showDistricts
      ? 'Ocultar límites de distritos'
      : 'Mostrar límites de distritos',
     () => {

      showDistricts = !showDistricts;
      drawDistricts();
      renderPanel('layers');
     }
    )
   );
  }

  return;
 }

 currentPanel = type;

 $('panel').hidden = false;

 $('panelTitle').textContent =
  t(type === 'districts'
   ? 'Explorar distritos'
   : 'Mis favoritos');

 document.querySelectorAll('[data-panel]')
 .forEach(b => {

  b.classList.toggle(
   'active',
   b.dataset.panel === type
  );
 });

 const content = $('panelContent');
 content.replaceChildren();

 if(type === 'districts') {

  content.append(
   makeButton(
    'Mostrar toda Leonida',
    () => selectDistrict('')
   ),
   makeButton(
    showDistricts
     ? 'Ocultar límites'
     : 'Mostrar límites',
    () => {

     showDistricts = !showDistricts;
     drawDistricts();
     renderPanel('districts');
    }
   )
  );

  const names = new Set(
   districts.map(d => d.name)
  );

  for(const p of locations) {

   const name = districtName(p);

   if(name) names.add(name);
  }

  content.append(
   paragraph(
    selectedDistrict
     ? choose('Zona seleccionada', 'Selected area') + ': ' + selectedDistrict
     : 'Todas las zonas'
   )
  );

  for(const name of [...names].sort(
   (a,b) => a.localeCompare(b)
  )) {

   const list = locations.filter(
    p => normalize(districtName(p)) ===
         normalize(name)
   );

   const b = makeButton(
    (selectedDistrict === name?'✓ ':'')+name,
    () => selectDistrict(name)
   );

   b.className = 'result';

   const small = document.createElement('small');
   small.textContent = progressText(list);

   b.append(small);
   content.append(b);
  }

  content.append(
   paragraph(
    'Los límites son aproximaciones comunitarias.'
   )
  );
 }

 if(type === 'favorites') {

  const list = locations.filter(
   p => favorites.has(p.id)
  );

  content.append(
   paragraph(`${list.length} ${choose('lugares guardados', 'saved locations')}`),

   makeButton(
    favoritesOnly
     ? 'Mostrar todas las ubicaciones'
     : 'Mostrar solo favoritos',
    () => {

     favoritesOnly = !favoritesOnly;
     selectedDistrict = '';
     query = '';

     if(favoritesOnly) {
      for(const p of list) {
       active.add(p.kind);
      }
      hideFound = false;
     }

     drawDistricts();
     renderMarkers();
     renderPanel('favorites');
    }
   )
  );

  if(!list.length) {

   content.append(
    paragraph(
     'Pulsa cualquier marcador y añádelo a favoritos.'
    )
   );
  }

  for(const p of list) {
   content.append(locationRow(p));
  }

  content.append(
   paragraph(
    'Favoritos guardados en este navegador.'
   )
  );
 }
};

function addNavButton(type,icon,label) {

 const button = document.createElement('button');
 button.dataset.panel = type;

 const symbol = document.createElement('span');
 symbol.textContent = icon;

 button.append(symbol,t(label));

 button.onclick = () => {

  if(currentPanel === type) {
   closePanel();
  } else {
   renderPanel(type);
  }
 };

 document.querySelector('nav')
 .insertBefore(button,$('fullButton'));
}

addNavButton('districts','📍','Zonas');
addNavButton('favorites','⭐','Favoritos');

// Indicador de filtros especiales.

const originalRender = renderMarkers;

renderMarkers = function() {

 originalRender();

 if(!loaded) return;

 const status = $('status');

 if(selectedDistrict) {
  status.textContent += ' · '+selectedDistrict;
 }

 if(favoritesOnly) {
  status.textContent += ' · ' + t('Favoritos');
 }
};

// Minimapa esquemático de posición.

const mini = document.createElement('div');

mini.id = 'v82Mini';

mini.innerHTML = `
 <svg viewBox="0 0 100 100"
      width="76" height="76">
  <rect x="1" y="1" width="98" height="98"
   rx="5" fill="#172033" stroke="#64748b"/>
  <path d="M25 0V100 M50 0V100 M75 0V100
           M0 25H100 M0 50H100 M0 75H100"
   stroke="#334155" stroke-width="1"/>
  <rect id="v82Viewport"
   fill="#ec489944"
   stroke="#f472b6"
   stroke-width="2"/>
 </svg>
 <small>Posición</small>
`;

document.body.append(mini);

function updateMini() {

 const b = map.getBounds();

 const clamp = n =>
  Math.max(0,Math.min(100,n));

 const left = clamp(
  b.getWest()/1024*100
 );

 const right = clamp(
  b.getEast()/1024*100
 );

 const top = clamp(
  -b.getNorth()/1024*100
 );

 const bottom = clamp(
  -b.getSouth()/1024*100
 );

 const r = $('v82Viewport');

 r.setAttribute('x',left);
 r.setAttribute('y',top);

 r.setAttribute(
  'width',Math.max(1,right-left)
 );

 r.setAttribute(
  'height',Math.max(1,bottom-top)
 );

 mini.hidden = map.getZoom() < 3;
}

mini.onclick = () => map.fitBounds(bounds);

map.on('moveend zoomend',updateMini);

const css = document.createElement('style');

css.textContent = `
 #v82Mini {
  position:absolute;
  top:110px;
  right:10px;
  z-index:850;
  padding:5px;
  border-radius:9px;
  background:#111827e8;
  text-align:center;
  cursor:pointer;
 }
 #v82Mini small {
  display:block;
  font-size:9px;
  color:#cbd5e1;
 }
 #v82Mini[hidden] {
  display:none;
 }
 nav button {
  min-width:0;
  font-size:10px;
  padding:4px 1px;
 }
 nav button span {
  font-size:19px;
 }
 #panelContent>button {
  margin:4px 3px 4px 0;
 }
`;

document.head.append(css);

document.title =
 'Leonida Maps 8.2 | VICE HUB';

const brand =
 document.querySelector('.brand');

if(brand?.firstChild) {
 brand.firstChild.nodeValue =
 'VICE HUB · MAPS 8.2';
}

// Abrir una ubicación compartida.

let attempts = 0;

function start() {

 if(!loaded) {

  if(++attempts < 100) {
   setTimeout(start,200);
  }

  return;
 }

 const id = new URLSearchParams(
  location.search
 ).get('id');

 if(id) {

  const p = locations.find(
   item => item.id === id
  );

  if(p) {
   showLocation(p);
  } else {
   $('status').textContent =
    t('Ubicación compartida no disponible');
  }
 }

 updateMini();
}

loadDistricts();
start();

})();
   
