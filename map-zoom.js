/* VICE HUB: zoom/pan without replacing Supabase map rendering */
(() => {
  const init = () => {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas || document.getElementById('mapZoomControls')) return;
    const section = document.getElementById('mapa');
    const controls = document.createElement('div');
    controls.id = 'mapZoomControls';
    controls.className = 'map-zoom-controls';
    controls.innerHTML = '<button type="button" data-zoom="in" aria-label="Acercar mapa">＋</button><button type="button" data-zoom="out" aria-label="Alejar mapa">－</button><button type="button" data-zoom="reset">Centrar</button>';
    canvas.before(controls);
    const layer = document.createElement('div');
    layer.className = 'map-zoom-layer';
    canvas.appendChild(layer);
    let scale = 1, x = 0, y = 0, drag = null;
    function moveChildren() {
      for (const node of [...canvas.childNodes]) {
        if (node !== layer && node.nodeType === 1 && node.classList.contains('pin')) layer.appendChild(node);
      }
    }
    // Existing backend.js replaces canvas.innerHTML on each redraw.
    // Observe and restore the layer after Supabase redraws, without changing backend.js.
    const observer = new MutationObserver(() => {
      if (!canvas.contains(layer)) canvas.appendChild(layer);
      moveChildren();
      apply();
    });
    observer.observe(canvas, {childList:true});
    function apply() { layer.style.transform = `translate(${x}px,${y}px) scale(${scale})`; canvas.style.setProperty('--map-zoom-scale', scale); }
    function zoom(next) {
      const old = scale; scale = Math.min(4, Math.max(1, next));
      const rect = canvas.getBoundingClientRect();
      x = rect.width / 2 - (rect.width / 2 - x) * scale / old;
      y = rect.height / 2 - (rect.height / 2 - y) * scale / old;
      if (scale === 1) x = y = 0;
      apply();
    }
    controls.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      const action = btn.dataset.zoom;
      if (action === 'reset') {scale=1;x=0;y=0;apply();}
      else zoom(scale * (action === 'in' ? 1.25 : 0.8));
    });
    canvas.addEventListener('wheel', e => {e.preventDefault();zoom(scale * (e.deltaY < 0 ? 1.12 : 1/1.12));}, {passive:false});
    canvas.addEventListener('pointerdown', e => {
      if (e.target.closest('.pin')) return;
      drag = {id:e.pointerId, px:e.clientX, py:e.clientY, x, y};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId || scale === 1) return;
      x=drag.x+e.clientX-drag.px;y=drag.y+e.clientY-drag.py;apply();
    });
    const stop = () => {drag=null;};
    canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
    moveChildren();apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
