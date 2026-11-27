import { loadLeonidaLocations } from './leonida-data.js';
import { publicHeadline } from './article-verification.js';

/* Integración opcional: Supabase Auth, contenido y progreso. */
(() => {
 const cfg=window.VICEHUB_CONFIG||{};
 const $=id=>document.getElementById(id);
 const msg=(id,value)=>{if($(id)) $(id).textContent=value};
 loadLeonidaLocations()
  .then(locations => msg('spins', locations.length.toLocaleString('es-ES')))
  .catch(() => msg('spins', '—'));
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let db=null,user=null,role='reader';
 if(cfg.url && cfg.anonKey && window.supabase){db=window.supabase.createClient(cfg.url,cfg.anonKey);}
 if(!db){msg('connectionStatus','Modo demostración: añade tus credenciales públicas en config.js para activar Supabase.');return;}
 msg('connectionStatus','Conectado a Supabase. Inicia sesión para sincronizar tu progreso.');
 const report=e=>{msg('authMessage',e?.message||String(e));};
 async function refreshAuth(){
  const {data,error}=await db.auth.getUser();if(error && error.name!=='AuthSessionMissingError')report(error);
  user=data?.user||null;role='reader';
  if(user){const {data:p}=await db.from('profiles').select('alias,role').eq('id',user.id).maybeSingle();role=p?.role||'reader';msg('connectionStatus',`Sesión: ${user.email} · Rol: ${role}`);if(p?.alias){$('alias').value=p.alias;msg('hello',`Hola, ${p.alias}`);}}
  else msg('connectionStatus','Conectado a Supabase · Sin sesión iniciada');
  $('editorWorkspace').classList.toggle('hidden',!user||!['editor','admin'].includes(role));
  msg('editorGate',['editor','admin'].includes(role)?'Editor autorizado':'Solo los usuarios con rol editor o admin pueden gestionar publicaciones.');
  await Promise.all([loadArticles(),loadMapSummary(),window.VICEHUB_GARAGE?.connect(db,role)]);
  if(['editor','admin'].includes(role))await loadEditor();
 }
 async function loadArticles(){
  const {data,error}=await db.from('articles').select('id,title,summary,kind,published_at,category,verification_level').eq('status','published').order('published_at',{ascending:false}).limit(60);
  if(error){msg('authMessage',error.message);return;}
  if(!data?.length){$('newsGrid').innerHTML='<p class="empty">Aún no hay artículos publicados.</p>';return;}
  const draw=()=>{let q=$('newsSearch').value.toLowerCase();$('newsGrid').innerHTML=data.filter(a=>(a.title+' '+(a.summary||'')).toLowerCase().includes(q)).map(a=>`<article class="card"><span class="tag">${a.kind==='guide'?'Guía':'Noticia'}</span><h3>${escapeHTML(publicHeadline(a))}</h3><p class="muted">${escapeHTML(a.summary)}</p></article>`).join('')||'<p class="empty">Sin resultados</p>';};
  $('newsSearch').addEventListener('input',draw);draw();$('snews').textContent=data.length;
 }
 function savedDiscoveries(key){
  try {
   const ids=JSON.parse(localStorage.getItem(key));
   return Array.isArray(ids)?new Set(ids).size:null;
  } catch {
   return null;
  }
 }
 async function loadMapSummary(){
  const uid=user?.id;
  const progressKey=uid?'vicehub-maps-v81:account:'+uid+':found':'vicehub-maps-v81:found';
  const localCount=savedDiscoveries(progressKey);
  const discoveries=uid && localCount===null
   ? db.from('map_user_progress').select('location_id',{count:'exact',head:true}).eq('user_id',uid).eq('state_type','found').eq('enabled',true)
   : Promise.resolve({count:localCount??0,error:null});
  const found=await discoveries;
  if(uid!==user?.id)return;
  const format=new Intl.NumberFormat('es-ES');
  msg('sdone',found.error?'—':format.format(found.count??0));
  msg('progressSummary',found.error
   ? 'Consulta tus descubrimientos desde el mapa de Leonida.'
   : 'Ubicaciones descubiertas en el mapa: '+format.format(found.count??0));
 }
 window.addEventListener('pageshow',event=>{if(event.persisted)loadMapSummary().catch(console.error);});
 async function loadEditor(){const {data,error}=await db.from('articles').select('id,title,status,kind').order('created_at',{ascending:false}).limit(100);if(error){msg('editorMessage',error.message);return;}$('editorArticles').innerHTML=(data||[]).map(a=>`<div class="card"><span class="tag">${escapeHTML(a.status)}</span><h3>${escapeHTML(a.title)}</h3><button data-delete-article="${a.id}">Eliminar</button></div>`).join('')||'<p class="muted">Sin artículos todavía.</p>';document.querySelectorAll('[data-delete-article]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar este artículo?'))return;const {error}=await db.from('articles').delete().eq('id',b.dataset.deleteArticle);msg('editorMessage',error?.message||'Artículo eliminado');if(!error){await loadEditor();await loadArticles();}});}
 $('articleForm').addEventListener('submit',async e=>{e.preventDefault();if(!user||!['editor','admin'].includes(role))return;const status=$('articleStatus').value;const record={title:$('articleTitle').value.trim(),slug:$('articleSlug').value.trim(),summary:$('articleSummary').value.trim(),body:$('articleBody').value.trim(),kind:$('articleKind').value,status,author_id:user.id,published_at:status==='published'?new Date().toISOString():null};const {error}=await db.from('articles').insert(record);msg('editorMessage',error?.message||'Artículo guardado');if(!error){$('articleForm').reset();await loadEditor();await loadArticles();}});
 $('signUp').onclick=async()=>{const {error}=await db.auth.signUp({email:$('email').value.trim(),password:$('password').value});msg('authMessage',error?.message||'Registro solicitado. Comprueba tu correo si está activada la confirmación.');if(!error)await refreshAuth();};
 $('signIn').onclick=async()=>{const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});msg('authMessage',error?.message||'Sesión iniciada');if(!error)await refreshAuth();};
 $('signOut').onclick=async()=>{const {error}=await db.auth.signOut();msg('authMessage',error?.message||'Sesión cerrada');if(!error)await refreshAuth();};
 $('saveAlias').onclick=async()=>{if(!user){report(new Error('Inicia sesión para guardar el alias.'));return;}const alias=$('alias').value.trim();const {error}=await db.from('profiles').update({alias}).eq('id',user.id);msg('authMessage',error?.message||'Alias guardado');if(!error)msg('hello',`Hola, ${alias}`);};
 db.auth.onAuthStateChange(()=>{});refreshAuth().catch(report);
})();
