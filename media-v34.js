/* VICE HUB 3.4 · gestión editorial de imágenes. No descarga ni copia imágenes de terceros. */
(() => {
 'use strict';
 const cfg=window.VICEHUB_CONFIG||{};
 const host=document.getElementById('editorWorkspace');
 if(!host||!window.supabase||!cfg.url||!cfg.anonKey)return;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const root=document.createElement('section');root.className='v34-panel';
 root.innerHTML='<h3>Imágenes de noticias · VICE HUB 3.4</h3><p class="muted">Usa únicamente imágenes propias, oficiales con permiso de reutilización o con licencia compatible. La URL y los créditos se guardan en Supabase.</p><button type="button" id="v34Refresh">Cargar noticias</button><p id="v34Status" role="status"></p><div id="v34Items"></div>';
 host.append(root);
 const $=id=>document.getElementById(id);
 const mk=(tag,value)=>{const x=document.createElement(tag);if(value!==undefined)x.textContent=value;return x};
 const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
 async function authorized(){const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const {data}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();return ['editor','admin'].includes(data?.role)}
 async function load(){const list=$('v34Items'),status=$('v34Status');list.replaceChildren();status.textContent='Cargando…';if(!await authorized()){status.textContent='Inicia sesión con una cuenta editor o admin.';return}
 const {data,error}=await db.from('articles').select('id,title,status,image_url,image_credit,source_url').in('status',['published','draft']).order('created_at',{ascending:false}).limit(40);
 if(error){status.textContent=error.message;return}status.textContent=`${data.length} noticias encontradas`;
 for(const a of data){const card=mk('article');card.className='card v34-card';card.append(mk('h4',a.title),mk('small',a.status));
 const url=mk('input');url.type='url';url.placeholder='https://... imagen autorizada';url.value=a.image_url||'';url.setAttribute('aria-label','URL de imagen');
 const credit=mk('input');credit.placeholder='Autor, titular de derechos y licencia';credit.value=a.image_credit||'';credit.setAttribute('aria-label','Crédito y licencia');
 const proof=mk('input');proof.type='checkbox';proof.setAttribute('aria-label','Confirmo derechos de uso');
 const proofLabel=mk('label');proofLabel.append(proof,document.createTextNode(' Confirmo que tengo permiso para usar esta imagen'));
 const preview=mk('img');preview.className='v34-preview';preview.alt='Vista previa';preview.loading='lazy';if(validUrl(url.value))preview.src=validUrl(url.value);
 const show=mk('button','Vista previa');show.type='button';show.onclick=()=>{const u=validUrl(url.value.trim());if(!u){preview.removeAttribute('src');return}preview.src=u};
 const save=mk('button','Guardar imagen');save.type='button';const clear=mk('button','Quitar imagen');clear.type='button';const feedback=mk('p');feedback.setAttribute('role','status');
 save.onclick=async()=>{const u=validUrl(url.value.trim());if(!u||!credit.value.trim()||!proof.checked){feedback.textContent='Indica una URL HTTPS, créditos y confirma el permiso.';return}if(!await authorized()){feedback.textContent='Sin permisos';return}save.disabled=true;const {data:changed,error}=await db.from('articles').update({image_url:u,image_credit:credit.value.trim()}).eq('id',a.id).select('id');feedback.textContent=error?.message||(!changed?.length?'No se actualizó: comprueba RLS.':'Imagen guardada.');save.disabled=false};
 clear.onclick=async()=>{if(!confirm('¿Quitar imagen de esta noticia?'))return;if(!await authorized())return;const {data:changed,error}=await db.from('articles').update({image_url:null,image_credit:null}).eq('id',a.id).select('id');feedback.textContent=error?.message||(!changed?.length?'No se actualizó: comprueba RLS.':'Imagen retirada.');if(changed?.length){url.value='';credit.value='';preview.removeAttribute('src')}};
 card.append(url,credit,proofLabel,show,save,clear,preview,feedback);list.append(card)} }
 $('v34Refresh').onclick=load;
 document.querySelectorAll('[data-page="editor"]').forEach(b=>b.addEventListener('click',load));
 document.getElementById('signIn')?.addEventListener('click',()=>setTimeout(load,1000));
 load();
})();
