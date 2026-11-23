/* VICE HUB 3.3: panel editorial adicional, sin alterar backend.js */
(() => {
  'use strict';
  const cfg = window.VICEHUB_CONFIG || {};
  const host = document.getElementById('editorWorkspace');
  if (!host || !window.supabase || !cfg.url || !cfg.anonKey) return;
  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const el = (tag, text, cls) => { const x = document.createElement(tag); if (text !== undefined) x.textContent = String(text); if (cls) x.className = cls; return x; };
  const panel = el('section', undefined, 'v33-panel');
  panel.id = 'v33Editorial';
  const heading = el('h3', 'AutoNews · Revisión editorial');
  const info = el('p', 'Inicia sesión con una cuenta de editor o administrador.', 'muted');
  info.setAttribute('role', 'status');
  const reload = el('button', 'Actualizar borradores'); reload.type = 'button';
  const list = el('div', undefined, 'v33-list');
  panel.append(heading, info, reload, list);
  host.prepend(panel);
  const date = x => x ? new Date(x).toLocaleString('es-ES') : 'Sin fecha';
  async function session() {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;
    const { data: profile, error: roleError } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (roleError || !['admin', 'editor'].includes(profile?.role)) return null;
    return user;
  }
  function link(url, label) {
    try { const u = new URL(url); if (!['https:', 'http:'].includes(u.protocol)) return null;
      const a = el('a', label); a.href = u.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
    } catch { return null; }
  }
  async function load() {
    list.replaceChildren(); info.textContent = 'Comprobando permisos y cargando borradores…';
    if (!await session()) { info.textContent = 'Inicia sesión con una cuenta editor o admin para revisar borradores.'; return; }
    const { data, error } = await db.from('articles')
      .select('id,title,summary,body,status,source_url,source_name,verification_level,verification_notes,category,created_at')
      .eq('status', 'draft').order('created_at', { ascending: false }).limit(100);
    if (error) { info.textContent = `No se pudieron cargar los borradores: ${error.message}`; return; }
    info.textContent = `${data.length} borrador(es) encontrado(s). Revisa la fuente antes de publicar.`;
    if (!data.length) { list.append(el('p', 'No hay borradores pendientes.', 'muted')); return; }
    for (const article of data) {
      const card = el('article', undefined, 'card v33-card');
      card.append(el('div', `${article.category || 'actualidad'} · ${article.verification_level || 'sin verificar'} · ${date(article.created_at)}`, 'tag'));
      const title = el('input'); title.value = article.title || ''; title.maxLength = 180; title.setAttribute('aria-label', 'Título');
      const summary = el('textarea'); summary.value = article.summary || ''; summary.maxLength = 600; summary.setAttribute('aria-label', 'Resumen');
      const body = el('textarea'); body.value = article.body || ''; body.rows = 9; body.setAttribute('aria-label', 'Contenido');
      card.append(el('label', 'Título'), title, el('label', 'Resumen'), summary, el('label', 'Contenido'), body);
      card.append(el('p', `Motivo de revisión: ${article.verification_notes || 'No indicado'}`, 'muted'));
      const source = link(article.source_url, `Consultar fuente: ${article.source_name || 'Abrir enlace'}`);
      if (source) card.append(source);
      const actions = el('div', undefined, 'actions');
      const save = el('button', 'Guardar cambios');
      const publish = el('button', 'Aprobar y publicar'); publish.className = 'primary';
      const discard = el('button', 'Descartar');
      const feedback = el('p', '', 'note'); feedback.setAttribute('role', 'status');
      const fields = () => ({ title: title.value.trim(), summary: summary.value.trim(), body: body.value.trim() });
      const perform = async (mode) => {
        if (!await session()) { feedback.textContent = 'Sesión caducada o sin permisos.'; return; }
        const f = fields();
        if (mode !== 'discard' && (f.title.length < 10 || f.summary.length < 20 || f.body.length < 80)) {
          feedback.textContent = 'Completa el título, resumen y contenido antes de guardar.'; return;
        }
        if (mode === 'publish' && !confirm('¿Has comprobado la fuente y quieres publicar esta noticia?')) return;
        if (mode === 'discard' && !confirm('¿Descartar este borrador? No se eliminará de la base de datos.')) return;
        for (const b of [save, publish, discard]) b.disabled = true;
        const update = mode === 'discard' ? { status: 'rejected' } : {
          ...f, ...(mode === 'publish' ? { status: 'published', published_at: new Date().toISOString(), reviewed_at: new Date().toISOString() } : {})
        };
        const { data: changed, error } = await db.from('articles').update(update).eq('id', article.id).eq('status', 'draft').select('id');
        if (error) { feedback.textContent = `No se pudo actualizar: ${error.message}. Comprueba las políticas RLS.`; }
        else if (!changed?.length) { feedback.textContent = 'No se actualizó el artículo. Revisa permisos RLS o si otro editor lo modificó.'; }
        else { feedback.textContent = 'Guardado correctamente.'; if (mode !== 'save') await load(); }
        for (const b of [save, publish, discard]) b.disabled = false;
      };
      save.onclick = () => perform('save'); publish.onclick = () => perform('publish'); discard.onclick = () => perform('discard');
      actions.append(save, publish, discard); card.append(actions, feedback); list.append(card);
    }
  }
  reload.onclick = load;
  db.auth.onAuthStateChange(() => { /* El botón Actualizar permite sincronizar el panel sin alterar backend.js */ });
  load();
  document.querySelectorAll('[data-page="editor"]').forEach(b => b.addEventListener('click', load));
  document.getElementById('signIn')?.addEventListener('click', () => setTimeout(load, 1200));
  document.getElementById('signOut')?.addEventListener('click', () => setTimeout(load, 1200));
})();
