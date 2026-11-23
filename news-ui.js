/* VICE HUB — edición de noticias. Usa solo la clave pública de config.js. */
(() => {
  'use strict';
  const section = document.getElementById('noticias');
  const oldGrid = document.getElementById('newsGrid');
  const search = document.getElementById('newsSearch');
  const cfg = window.VICEHUB_CONFIG || {};
  if (!section || !oldGrid || !search) return;
  oldGrid.hidden = true;
  const root = document.createElement('div');
  root.id = 'newsExperience';
  root.innerHTML = `<div class="vh-news-top"><div><span class="vh-eyebrow">VICE HUB · REDACCIÓN DIGITAL</span><h2>Última hora en Vice City</h2><p>Noticias y guías sobre GTA VI. Información de fuentes externas identificada como tal.</p></div><div class="vh-news-count" id="vhNewsCount">Cargando…</div></div><div class="vh-news-filters" aria-label="Filtrar publicaciones"><button class="is-selected" data-filter="all">Todo</button><button data-filter="news">Noticias</button><button data-filter="guide">Guías</button></div><div id="vhNewsError" role="status"></div><div id="vhNewsCards" class="vh-news-grid" aria-live="polite"></div><div id="vhArticle" class="vh-article" hidden></div>`;
  section.insertBefore(root, oldGrid);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = s => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('es-ES', {dateStyle:'medium'}).format(d); };
  const paragraphs = text => String(text || '').split(/\n\s*\n|\r\n\s*\r\n/).map(s=>s.trim()).filter(Boolean);
  const safeUrl = value => {try {const u = new URL(value);return ['https:','http:'].includes(u.protocol) ? u.href : '';} catch {return '';} };
  const db = cfg.url && cfg.anonKey && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey, {auth:{persistSession:false,autoRefreshToken:false}}) : null;
  let articles = [], filter = 'all', current = null;
  function cards() {
    const q = search.value.trim().toLocaleLowerCase('es');
    const list = articles.filter(a => (filter === 'all' || a.kind === filter) && `${a.title} ${a.summary || ''}`.toLocaleLowerCase('es').includes(q));
    $('vhNewsCount').textContent = `${articles.length} publicaciones`;
    $('vhNewsCards').innerHTML = list.map((a,i) => `<article class="vh-news-card ${i===0 && !q && filter==='all'?'vh-featured':''}"><div class="vh-news-art" aria-hidden="true"><span>VI</span><small>VICE CITY</small></div><div class="vh-news-copy"><div class="vh-news-meta"><span>${a.kind === 'guide'?'GUÍA':'NOTICIA'}</span><time>${esc(formatDate(a.published_at))}</time></div><h3>${esc(a.title)}</h3><p>${esc(a.summary || 'Lee el artículo completo.')}</p><div class="vh-news-foot"><span>${a.source_url?'Fuente externa':'Redacción'}</span><button type="button" data-open="${esc(a.id)}">Leer artículo <span aria-hidden="true">→</span></button></div></div></article>`).join('') || '<p class="vh-empty">No hay publicaciones para esta búsqueda.</p>';
  }
  function closeArticle(){current=null;$('vhArticle').hidden=true;$('vhNewsCards').hidden=false;document.querySelector('.vh-news-filters').hidden=false;search.hidden=false;const u=new URL(location.href);u.searchParams.delete('articulo');history.replaceState(null,'',u);}
  function showArticle(a, updateHistory=true){
    current=a;$('vhNewsCards').hidden=true;document.querySelector('.vh-news-filters').hidden=true;search.hidden=true;
    const src=safeUrl(a.source_url);
    const source=src?`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer nofollow">Consultar fuente original ↗</a>`:'';
    $('vhArticle').innerHTML=`<button type="button" id="vhBack">← Volver a noticias</button><div class="vh-article-hero"><span class="vh-eyebrow">${a.kind==='guide'?'GUÍA':'ACTUALIDAD'} · ${esc(formatDate(a.published_at))}</span><h1>${esc(a.title)}</h1><p>${esc(a.summary||'')}</p></div><div class="vh-article-body">${paragraphs(a.body).map(p=>`<p>${esc(p)}</p>`).join('')||'<p>El artículo todavía no tiene contenido.</p>'}<div class="vh-source">${a.source_url?'<strong>Información de terceros.</strong> Contrasta los datos con la fuente original.':'Artículo de VICE HUB.'} ${source}</div><button type="button" id="vhShare">Compartir artículo</button></div>`;
    $('vhArticle').hidden=false;$('vhBack').onclick=closeArticle;
    $('vhShare').onclick=async()=>{const link=location.href;try{if(navigator.share)await navigator.share({title:a.title,url:link});else if(navigator.clipboard){await navigator.clipboard.writeText(link);$('vhShare').textContent='Enlace copiado';}}catch{}};
    if(updateHistory){const u=new URL(location.href);u.searchParams.set('articulo',a.slug || a.id);history.pushState(null,'',u);}section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function load(){
    if(!db){$('vhNewsError').textContent='Falta configurar la conexión pública a Supabase.';return;}
    const {data,error}=await db.from('articles').select('id,slug,title,summary,body,kind,published_at,source_url,source_name,verification_level').eq('status','published').order('published_at',{ascending:false}).limit(100);
    if(error){$('vhNewsError').textContent='No se han podido cargar las noticias: '+error.message;return;}
    articles=data||[];cards();const slug=new URL(location.href).searchParams.get('articulo');if(slug){const a=articles.find(x=>x.slug===slug||String(x.id)===slug);if(a){if(typeof window.page==='function')window.page('noticias');showArticle(a,false);}}
  }
  root.addEventListener('click', e=>{const b=e.target.closest('[data-open]');if(b){const a=articles.find(x=>String(x.id)===b.dataset.open);if(a)showArticle(a);}});
  root.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;root.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-selected',x===b));cards();}));
  search.addEventListener('input',cards);
  window.addEventListener('popstate',()=>{const slug=new URL(location.href).searchParams.get('articulo');const a=articles.find(x=>x.slug===slug||String(x.id)===slug);if(a)showArticle(a,false);else if(current)closeArticle();});
  load().catch(e=>{$('vhNewsError').textContent='No se pudieron cargar las noticias.';console.error(e);});
})();
