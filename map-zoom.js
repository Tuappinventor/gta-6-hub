
/* VICE HUB - Leonida Maps 8.2 */

(() => {

 const go = event => {

  const element = event.target.closest(
   '[data-page="mapa"],[data-go="mapa"]'
  );

  if (!element) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  window.location.assign('./mapa-v8.html');

 };

 document.addEventListener(
  'click', go, true
 );

})();
