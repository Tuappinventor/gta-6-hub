/* Mejora progresiva de enlaces: los artículos se abren en su URL indexable. */
(()=>{'use strict';
 const slugOk=s=>/^[a-z0-9-]+$/.test(s||'');
 const cfg=window.VICEHUB_CONFIG||{};
 if(!cfg.url||!cfg.anonKey||!window.supabase)return;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const map=new Map();
 db.from('articles').select('id,slug').eq('status','published').limit(1000).then(({data,error})=>{if(!error)for(const a of data||[])if(slugOk(a.slug))map.set(String(a.id),a.slug)});
 document.addEventListener('click',e=>{
   const button=e.target.closest('[data-v3-open],[data-article],[data-open]');
   if(!button)return;
   const id=button.dataset.v3Open||button.dataset.article||button.dataset.open;
   const slug=map.get(String(id));
   if(!slug)return; // Deja intacto el comportamiento anterior si aún no ha cargado el mapa.
   e.preventDefault();e.stopImmediatePropagation();
   location.assign(`/articulo/${encodeURIComponent(slug)}`);
 },true);
})();
