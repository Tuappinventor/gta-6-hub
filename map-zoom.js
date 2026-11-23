/* VICE HUB Maps 6.0: un único mapa interactivo, sin visor duplicado. */
(()=>{
 const go=e=>{
  const el=e.target.closest('[data-page="mapa"],[data-go="mapa"]');
  if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();
  window.location.assign('./mapa-interactivo.html');
 };
 document.addEventListener('click',go,true);
 // El mapa anterior se mantiene en el HTML por compatibilidad, pero el menú
 // siempre abre el visor 6.0, sin superponer controles de zoom antiguos.
})();
