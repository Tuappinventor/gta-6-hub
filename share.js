/* VICE HUB - ViceShare 1.0 */
(()=>{'use strict';
function mount(container,article){
if(!container||container.querySelector('.vice-share'))return;
const url=article.url||location.href,title=article.title||document.title,u=encodeURIComponent(url),t=encodeURIComponent(title);
if(!document.getElementById('vice-share-css')){const s=document.createElement('style');s.id='vice-share-css';s.textContent='.vice-share{margin:24px 0;padding:16px;border:1px solid #343c55;border-radius:16px;background:#111729;color:white}.vice-share-title{font-weight:800;color:#ff84bd;margin-bottom:12px;font-size:14px}.vice-share-buttons{display:flex;flex-wrap:wrap;gap:8px}.vice-share-buttons a,.vice-share-buttons button{padding:10px 14px;border-radius:10px;border:0;color:white;font:600 13px system-ui;text-decoration:none;cursor:pointer;background:#39445e}.vice-share-status{font-size:12px;margin-top:8px}@media(max-width:600px){.vice-share-buttons>*{flex:1 1 35%;text-align:center}}';document.head.append(s)}
const box=document.createElement('div');box.className='vice-share';const heading=document.createElement('div');heading.className='vice-share-title';heading.textContent='COMPARTIR PUBLICACIÓN';const buttons=document.createElement('div');buttons.className='vice-share-buttons';const status=document.createElement('div');status.className='vice-share-status';status.setAttribute('role','status');
for(const [name,href,color] of [['WhatsApp','https://wa.me/?text='+t+'%20'+u,'#168b49'],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+u,'#1877f2'],['𝕏','https://twitter.com/intent/tweet?text='+t+'&url='+u,'#000'],['Telegram','https://t.me/share/url?url='+u+'&text='+t,'#167ca9']]){const a=document.createElement('a');a.textContent=name;a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.style.background=color;buttons.append(a)}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;buttons.append(b);return b}
button('Copiar enlace',async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Enlace copiado'}catch{window.prompt('Copia este enlace:',url)}});
if(navigator.share)button('Compartir…',async()=>{try{await navigator.share({title,url})}catch(e){if(e.name!=='AbortError')status.textContent='Utiliza los otros botones.'}}).style.background='#a43e91';
box.append(heading,buttons,status);container.append(box)}
window.ViceShare={mount};function init(){mount(document.getElementById('viceShare'),{title:document.querySelector('article h1')?.textContent||document.title,url:document.querySelector('link[rel="canonical"]')?.href||location.href})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
