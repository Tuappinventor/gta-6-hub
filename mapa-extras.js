/* VICE HUB Maps 6.1: panel de progreso y fichas ampliadas. Compatible con Maps 6.0 */
(()=>{'use strict';
const ready=()=>{
 const stage=document.getElementById('stage'), aside=document.querySelector('.layout aside'), detail=document.getElementById('detail');
 if(!stage||!aside||!detail)return;
 const css=document.createElement('style');css.textContent=`
 #viceProgress{background:#19253b;border:1px solid #4b5c77;border-radius:12px;padding:12px;margin:10px 0;color:#f5f6fc}
 #viceProgressBar{height:10px;border-radius:20px;background:#344259;overflow:hidden;margin:8px 0}
 #viceProgressFill{height:100%;width:0%;background:linear-gradient(90deg,#16a085,#ff63a7);transition:width .25s}
 #viceProgressText{font-size:13px;color:#d4e0ee}
 #viceProgress small{color:#b9c7d9}
 #detail .vice-photo{display:block;width:100%;max-height:190px;object-fit:cover;border-radius:9px;margin:8px 0}
 #detail .vice-type{font-size:12px;color:#ffbad7;margin:5px 0}
 #vicePhotoEditor{margin:8px 0}
 #vicePhotoEditor label{display:block;font-size:12px;color:#c9d5e7}
 #vicePhotoEditor input{width:100%}
 `;document.head.append(css);
 const panel=document.createElement('section');panel.id='viceProgress';panel.innerHTML='<strong>🧭 Mi exploración de Leonida</strong><div id="viceProgressBar" role="progressbar" aria-label="Progreso de exploración" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="viceProgressFill"></div></div><div id="viceProgressText">Calculando ubicaciones…</div><small>Marca «Visitado» en las fichas para registrar tu progreso.</small>';
 const items=document.getElementById('items');if(items)aside.insertBefore(panel,items);else aside.append(panel);
 const getStored=()=>{try{return new Set(JSON.parse(localStorage.getItem('vicehub-maps-4-discovered')||'[]'))}catch{return new Set()}};
 const update=()=>{
  const buttons=[...document.querySelectorAll('#items .item')];
  const total=buttons.length;
  const done=buttons.filter(b=>b.querySelector('small')?.textContent.includes('Visitado')).length;
  const pct=total?Math.round(done/total*100):0;
  document.getElementById('viceProgressFill').style.width=pct+'%';
  document.getElementById('viceProgressBar').setAttribute('aria-valuenow',String(pct));
  document.getElementById('viceProgressText').textContent=`${done} de ${total} ubicaciones visibles visitadas · ${pct}%`;
 };
 const listObserver=new MutationObserver(update);if(items)listObserver.observe(items,{childList:true,subtree:true,characterData:true});update();
 // Las imágenes se vinculan por ID y se cargan desde la tabla pública; nunca se usa innerHTML con datos externos.
 const cfg=window.VICEHUB_CONFIG||{};
 let client=null,photos=new Map(),currentId=null;
 try{if(cfg.url&&cfg.anonKey&&window.supabase)client=window.supabase.createClient(cfg.url,cfg.anonKey)}catch{}
 async function loadPhotos(){if(!client)return;const {data,error}=await client.from('vice_map_locations').select('id,name,image_url').limit(3000);if(error)return;photos=new Map((data||[]).map(p=>[p.name,p.image_url]));decorate()}
 function decorate(){
  const strong=detail.querySelector('strong');if(!strong)return;
  const name=strong.textContent;
  detail.querySelectorAll('.vice-photo,.vice-type').forEach(e=>e.remove());
  const p=document.createElement('p');p.className='vice-type';p.textContent='📍 Ficha de ubicación · Leonida';strong.after(p);
  const url=photos.get(name);
  if(url&&/^https:\/\//i.test(url)){
   const img=document.createElement('img');img.className='vice-photo';img.alt='Fotografía de '+name;img.loading='lazy';img.referrerPolicy='no-referrer';img.src=url;p.after(img);
  }
 }
 const detailObserver=new MutationObserver(()=>{if(detail.hidden||detail.style.display==='none')return;const name=detail.querySelector('strong')?.textContent;if(!name)return;if(detail.dataset.viceName!==name){detail.dataset.viceName=name;decorate()}});
 detailObserver.observe(detail,{childList:true});
 // Campo opcional de imagen en el editor; se guarda por el ID de la ubicación una vez publicada.
 const editor=document.getElementById('editorForm'),save=document.getElementById('savePin');
 if(editor&&save){
  const wrap=document.createElement('div');wrap.id='vicePhotoEditor';const label=document.createElement('label');label.htmlFor='vicePhotoUrl';label.textContent='Fotografía (URL HTTPS, opcional)';const input=document.createElement('input');input.id='vicePhotoUrl';input.type='url';input.placeholder='https://…/imagen.jpg';wrap.append(label,input);save.parentElement.before(wrap);
  document.getElementById('newPin')?.addEventListener('click',()=>{input.value='';currentId=null});
  // Se obtiene el nombre de la ubicación seleccionada y se usa para localizar su ID al guardar.
  document.getElementById('items')?.addEventListener('click',async e=>{const btn=e.target.closest('.item');if(!btn||!client)return;const name=btn.firstChild?.textContent||'';input.value=photos.get(name)||''});
  save.addEventListener('click',async()=>{
   const url=input.value.trim();if(url&&!/^https:\/\//i.test(url))return;
   // Esperar a que el controlador principal finalice el guardado; no sustituimos su lógica.
   await new Promise(resolve=>setTimeout(resolve,900));
   if(!client||!document.getElementById('editStatus')?.textContent.includes('guardada en Supabase'))return;
   const name=document.getElementById('pinName')?.value.trim();if(!name)return;
   const {data:session}=await client.auth.getSession();if(!session?.session)return;
   const {data:rows}=await client.from('vice_map_locations').select('id').eq('name',name).order('created_at',{ascending:false}).limit(1);
   if(rows?.[0]){const {error}=await client.from('vice_map_locations').update({image_url:url||null}).eq('id',rows[0].id);if(!error){photos.set(name,url||null);decorate()}else document.getElementById('editStatus').textContent+=' · Fotografía no guardada: '+error.message}
  });
 }
 loadPhotos();
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
