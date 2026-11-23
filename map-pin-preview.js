/* VICE HUB Maps 6.0 - immediate marker preview, non-invasive fix */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const world = document.getElementById('world');
  const newPin = document.getElementById('newPin');
  const cancel = document.getElementById('cancelPin');
  const save = document.getElementById('savePin');
  const editorToggle = document.getElementById('editorToggle');
  const coords = document.getElementById('pinCoords');
  if (!stage || !world || !newPin || !coords) return;
  let placing = false;
  let start = null;
  let preview = null;
  function clear() { preview?.remove(); preview = null; }
  newPin.addEventListener('click', () => { placing = true; clear(); });
  cancel?.addEventListener('click', () => { placing = false; clear(); });
  editorToggle?.addEventListener('click', () => { placing = false; clear(); });
  save?.addEventListener('click', () => {
    // The main application validates and saves. Only remove after success.
    const old = document.getElementById('editStatus')?.textContent || '';
    setTimeout(() => {
      const now = document.getElementById('editStatus')?.textContent || '';
      if (now !== old && now.includes('guardada en Supabase')) { placing = false; clear(); }
    }, 650);
  });
  stage.addEventListener('pointerdown', e => {
    if (!placing || e.target.closest('button') || e.target.closest('#detail') || e.target.closest('#controls')) return;
    start = {id: e.pointerId, x: e.clientX, y: e.clientY};
  });
  stage.addEventListener('pointerup', e => {
    if (!placing || !start || start.id !== e.pointerId) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    start = null;
    if (dist > 8) return;
    // The main map listener sets the image-pixel coordinates on the same event.
    queueMicrotask(() => {
      const match = coords.value.match(/^\s*(\d+)\s*,\s*(\d+)\s*$/);
      if (!match) return;
      const image = document.getElementById('poster');
      const width = image?.naturalWidth || 2805;
      const height = image?.naturalHeight || 3840;
      const x = Math.min(100, Math.max(0, Number(match[1]) / width * 100));
      const y = Math.min(100, Math.max(0, Number(match[2]) / height * 100));
      clear();
      preview = document.createElement('div');
      preview.id = 'newPinPreview';
      preview.textContent = '📍';
      preview.setAttribute('aria-label', 'Marcador provisional');
      preview.style.cssText = 'position:absolute;z-index:4;pointer-events:none;left:'+x+'%;top:'+y+'%;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;border:3px solid #fff;background:#f59e0b;box-shadow:0 0 0 6px #f59e0b55,0 2px 12px #000;transform:translate(-50%,-100%) scale(var(--marker-scale,1));transform-origin:50% 100%;font-size:18px';
      world.appendChild(preview);
      placing = false;
    });
  });
  stage.addEventListener('pointercancel', () => { start = null; });
})();
