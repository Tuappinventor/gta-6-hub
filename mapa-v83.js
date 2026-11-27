
(() => {
'use strict';

// VICE HUB - Leonida Maps 8.3

const config = window.VICEHUB_CONFIG;

if (!config?.url || !config?.anonKey || !window.supabase) {
 console.error('VICE HUB: Supabase no disponible');
 return;
}

const client = window.supabase.createClient(
 config.url,
 config.anonKey
);

window.ViceMapAccount = {
 client,
 signIn: () => renderPanel('account')
};

const localRead = read;
const localSave = save;
const previousPanel = renderPanel;

const TYPES = {
 ':found': 'found',
 ':favorites-v82': 'favorite'
};

let user = null;
let ready = false;
let syncing = false;
let message = 'Comprobando sesión...';
let generation = 0;
let queue = Promise.resolve();

let states = {
 found: new Set(),
 favorite: new Set()
};

function accountKey(uid,type) {
 return ':account:'+uid+':'+type;
}

function pendingKey(uid) {
 return ':pending:'+uid;
}

function getPending(uid) {
 return localRead(pendingKey(uid),[]);
}

function setPending(uid,rows) {
 localSave(pendingKey(uid),rows);
}

function setMessage(text) {
 message = text;

 const el = document.getElementById('v83Status');

 if(el) el.textContent = t(text);

 const badge = document.getElementById('v83Badge');

 if(badge) {
  badge.textContent = t(user
   ? ready ? '☁ Conectado' : '☁ Pendiente'
   : 'Invitado');
 }
}

function applyStates() {

 found.clear();

 for(const id of states.found) {
  found.add(id);
 }

 // La versión 8.2 mantiene favoritos dentro
 // de su propio módulo. Se actualiza al recargar.

 if(typeof window.VICE_MAP_FAVORITES === 'function') {
  window.VICE_MAP_FAVORITES(
   [...states.favorite]
  );
 }

 map.closePopup();
 renderMarkers();
}

function persistStates() {

 if(!user) return;

 for(const type of Object.values(TYPES)) {

  localSave(
   accountKey(user.id,type),
   [...states[type]]
  );
 }
}

function enqueue(type,id,enabled) {

 if(!user) return;

 const uid = user.id;

 const pending = getPending(uid)
 .filter(row =>
  !(row.location_id === id &&
    row.state_type === type)
 );

 pending.push({
  user_id: uid,
  location_id: String(id),
  state_type: type,
  enabled,
  updated_at: new Date().toISOString()
 });

 setPending(uid,pending);
}

async function flush(uid) {

 if(!user || user.id !== uid) return;

 const pending = getPending(uid);

 if(!pending.length) return;

 syncing = true;
 setMessage('Guardando cambios...');

 try {

  for(let i=0;i<pending.length;i+=100) {

   if(!user || user.id !== uid) return;

   const batch = pending.slice(i,i+100);

   const {error} = await client
    .from('map_user_progress')
    .upsert(batch,{
     onConflict:
      'user_id,location_id,state_type'
    });

   if(error) throw error;

   const sent = new Set(
    batch.map(row => JSON.stringify(row))
   );

   setPending(
    uid,
    getPending(uid).filter(
     row => !sent.has(JSON.stringify(row))
    )
   );
  }

  if(user?.id === uid) {
   setMessage(
    getPending(uid).length
     ? 'Cambios pendientes'
     : '✓ Cambios guardados en la nube'
   );
  }

 } catch(error) {

  console.warn('Error de sincronización',error);

  setMessage(
   'Sin conexión o error de guardado. Cambios conservados en este navegador.'
  );

 } finally {

  syncing = false;
 }
}

function scheduleSync() {

 if(!user) return queue;

 const uid = user.id;

 queue = queue
  .catch(()=>{})
  .then(()=>flush(uid));

 return queue;
}

// Interceptar el guardado de progreso y favoritos.

save = function(key,value) {

 const type = TYPES[key];

 if(!type || !user) {
  localSave(key,value);
  return;
 }

 const next = new Set(
  value.map(String)
 );

 const before = states[type];

 for(const id of next) {

  if(!before.has(id)) {
   enqueue(type,id,true);
  }
 }

 for(const id of before) {

  if(!next.has(id)) {
   enqueue(type,id,false);
  }
 }

 states[type] = next;

 persistStates();
 scheduleSync();
};

read = function(key,fallback) {

 const type = TYPES[key];

 if(type && user) {
  return [...states[type]];
 }

 return localRead(key,fallback);
};

async function fetchCloud(uid) {

 const rows = [];
 const size = 500;

 for(let offset=0;;offset+=size) {

  const {data,error} = await client
   .from('map_user_progress')
   .select('location_id,state_type,enabled')
   .eq('user_id',uid)
   .order('location_id')
   .order('state_type')
   .range(offset,offset+size-1);

  if(error) throw error;

  rows.push(...(data||[]));

  if(!data || data.length<size) break;
 }

 return rows;
}

function applyPending(uid) {

 for(const row of getPending(uid)) {

  const set = states[row.state_type];

  if(!set) continue;

  if(row.enabled) {
   set.add(row.location_id);
  } else {
   set.delete(row.location_id);
  }
 }
}

async function refreshCloud() {

 if(!user || syncing) return;

 const uid = user.id;
 const version = generation;

 try {

  setMessage('Recuperando progreso...');

  await scheduleSync();

  const rows = await fetchCloud(uid);

  if(version !== generation ||
     user?.id !== uid) return;

  const next = {
   found:new Set(),
   favorite:new Set()
  };

  for(const row of rows) {

   if(row.enabled && next[row.state_type]) {

    next[row.state_type].add(
     row.location_id
    );
   }
  }

  states = next;

  applyPending(uid);
  persistStates();
  applyStates();

  ready = true;

  setMessage(
   getPending(uid).length
    ? 'Cambios pendientes de sincronizar'
    : '✓ Progreso sincronizado'
  );

 } catch(error) {

  console.warn('Error recuperando progreso',error);

  setMessage(
   'No se pudo conectar con la nube. Usando copia local.'
  );
 }

 if(currentPanel === 'account') {
  renderPanel('account');
 }
}

async function activateAccount(nextUser) {

 const nextId = nextUser?.id || null;

 if(nextId === (user?.id || null)) {

  if(nextUser) user = nextUser;

  return;
 }

 generation++;
 ready = false;

 user = nextUser || null;

 if(!user) {

  states = {
   found:new Set(localRead(':found',[])),
   favorite:new Set(
    localRead(':favorites-v82',[])
   )
  };

  applyStates();
  setMessage('Modo invitado');

  if(currentPanel === 'account') {
   renderPanel('account');
  }

  return;
 }

 states = {
  found:new Set(
   localRead(
    accountKey(user.id,'found'),[]
   )
  ),

  favorite:new Set(
   localRead(
    accountKey(user.id,'favorite'),[]
   )
  )
 };

 applyPending(user.id);
 applyStates();

 await refreshCloud();
}

async function importGuest() {

 if(!user || !ready) return;

 const guestFound = localRead(':found',[]);
 const guestFavorites =
  localRead(':favorites-v82',[]);

 const total =
  guestFound.length+guestFavorites.length;

 if(!total) {
  alert('No hay progreso de invitado para importar.');
  return;
 }

 if(!confirm(
  '¿Añadir el progreso de invitado a esta cuenta?'
 )) return;

 for(const id of guestFound.map(String)) {

  if(!states.found.has(id)) {
   states.found.add(id);
   enqueue('found',id,true);
  }
 }

 for(const id of guestFavorites.map(String)) {

  if(!states.favorite.has(id)) {
   states.favorite.add(id);
   enqueue('favorite',id,true);
  }
 }

 persistStates();
 applyStates();

 await scheduleSync();

 renderPanel('account');
}

function field(type,placeholder) {

 const input = document.createElement('input');

 input.type = type;
 input.placeholder = t(placeholder);
 input.style.marginBottom = '8px';

 return input;
}

function accountPanel() {

 currentPanel = 'account';

 $('panel').hidden = false;
 $('panelTitle').textContent = t('Mi cuenta');

 document.querySelectorAll('[data-panel]')
 .forEach(button => {

  button.classList.toggle(
   'active',
   button.dataset.panel === 'account'
  );
 });

 const content = $('panelContent');

 content.replaceChildren();

 const status = paragraph(message);

 status.id = 'v83Status';

 content.append(status);

 if(!user) {

  content.append(
   paragraph(
    'Accede con tu cuenta de VICE HUB para sincronizar tus favoritos y coleccionables.'
   )
  );

  const email = field(
   'email','Correo electrónico'
  );

  email.autocomplete = 'email';

  const password = field(
   'password','Contraseña'
  );

  password.autocomplete = 'current-password';

  const login = makeButton(
   'Iniciar sesión',
   async () => {

    if(!email.value || !password.value) {

     setMessage(
      'Introduce tu correo y contraseña.'
     );

     return;
    }

    login.disabled = true;

    setMessage('Iniciando sesión...');

    try {

     const {data,error} = await client.auth
      .signInWithPassword({
       email:email.value.trim(),
       password:password.value
      });

     if(error) throw error;

     password.value = '';

     await activateAccount(data.user);

     renderPanel('account');

    } catch(error) {

     setMessage(
      'No se pudo iniciar sesión. Comprueba tus datos.'
     );

    } finally {

     login.disabled = false;
    }
   }
  );

  const link = document.createElement('a');

  link.href = './index.html';
  link.textContent =
   t('Crear cuenta o gestionar acceso en VICE HUB');

  content.append(
   email,
   password,
   login,
   document.createElement('br'),
   document.createElement('br'),
   link
  );

  return;
 }

 const title = document.createElement('h3');

 title.textContent =
  user.email || 'Cuenta conectada';

 title.style.overflowWrap = 'anywhere';

 content.append(title);

 const stats = document.createElement('div');

 stats.className = 'v83Stats';

 for(const [label,count] of [
  ['Encontrados',states.found.size],
  ['Favoritos',states.favorite.size]
 ]) {

  const card = document.createElement('div');

  const number = document.createElement('strong');

  number.textContent = count;

  const caption = document.createElement('small');

  caption.textContent = t(label);

  card.append(number,caption);

  stats.append(card);
 }

 content.append(stats);

 content.append(
  paragraph(
   'Tus datos están asociados a tu cuenta.'
  ),

  paragraph(
   `${getPending(user.id).length} ${choose('cambios pendientes', 'pending changes')}`
  ),

  makeButton(
   '☁ Sincronizar ahora',
   refreshCloud
  ),

  makeButton(
   '📥 Importar progreso de invitado',
   importGuest
  ),

  makeButton(
   'Cerrar sesión',
   async () => {

    await scheduleSync();

    if(getPending(user.id).length) {

     if(!confirm(
      'Hay cambios pendientes. Se conservarán en este dispositivo. ¿Cerrar sesión?'
     )) return;
    }

    const {error} =
     await client.auth.signOut();

    if(error) {

     setMessage(
      'No se pudo cerrar sesión.'
     );

     return;
    }

    await activateAccount(null);

    renderPanel('account');
   }
  )
 );
}

renderPanel = function(type) {

 if(type === 'account') {
  accountPanel();
  return;
 }

 previousPanel(type);
};

// Botón de cuenta en la cabecera.

const accountButton =
 document.createElement('button');

accountButton.id = 'v83AccountButton';

accountButton.innerHTML =
 '👤 <span id="v83Badge">Cuenta</span>';

accountButton.onclick = () => {

 if(currentPanel === 'account') {
  closePanel();
 } else {
  renderPanel('account');
 }
};

const header =
 document.querySelector('header');

header.insertBefore(
 accountButton,
 header.querySelector('a')
);

const css = document.createElement('style');

css.textContent = `
 #v83AccountButton{
  font-size:11px;
  padding:7px;
  color:#f9a8d4;
  white-space:nowrap;
 }
 .v83Stats{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin:12px 0;
 }
 .v83Stats>div{
  background:#1e293b;
  border:1px solid #334155;
  border-radius:12px;
  padding:14px;
  text-align:center;
 }
 .v83Stats strong{
  display:block;
  color:#f472b6;
  font-size:25px;
 }
 .v83Stats small{
  color:#cbd5e1;
 }
 @media(max-width:450px){
  header{gap:6px}
  .brand{font-size:11px}
  header a{font-size:10px}
  #v83AccountButton{font-size:10px}
 }
`;

document.head.append(css);

document.title =
 'Leonida Maps 8.3 | VICE HUB';

const brand =
 document.querySelector('.brand');

if(brand?.firstChild) {

 brand.firstChild.nodeValue =
  'VICE HUB · MAPS 8.3';
}

client.auth.onAuthStateChange(
 (event,session) => {

  // Evita realizar operaciones de Supabase
  // dentro del callback de autenticación.

  setTimeout(()=>{

   activateAccount(
    session?.user || null
   );

  },0);
 }
);

async function initialize() {

 try {

  const {data,error} =
   await client.auth.getSession();

  if(error) throw error;

  if(data.session?.user) {

   await activateAccount(
    data.session.user
   );

  } else {

   setMessage('Modo invitado');
  }

 } catch(error) {

  setMessage(
   'No se pudo comprobar la sesión'
  );
 }
}

window.addEventListener(
 'online',
 ()=>refreshCloud()
);

document.addEventListener(
 'visibilitychange',
 ()=>{

  if(!document.hidden && user) {
   refreshCloud();
  }
 }
);

setInterval(()=>{

 if(user && !document.hidden) {
  refreshCloud();
 }

},60000);

initialize();

})();
           
