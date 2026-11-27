(() => {
  'use strict';

  const account = window.ViceMapAccount;
  if (!account) return;
  const { client, signIn } = account;
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });
  const selectColumns = 'id,author_alias,body,language,created_at';
  const originalPopup = popup;
  const ownCommentsKey = 'vicehub-own-map-comments';
  let openThread;
  let ownComments = {};

  try { ownComments = JSON.parse(localStorage.getItem(ownCommentsKey)) || {}; } catch {}

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function rememberComment(id, userId) {
    ownComments = Object.fromEntries([...Object.entries(ownComments).slice(-199), [id, userId]]);
    try { localStorage.setItem(ownCommentsKey, JSON.stringify(ownComments)); } catch {}
  }

  async function accountState() {
    const { data } = await client.auth.getSession();
    const member = data?.session?.user;
    if (!member || member.is_anonymous) return {};
    const { data: profile } = await client.from('profiles').select('role').eq('id', member.id).maybeSingle();
    return { member, moderator: ['admin', 'editor'].includes(profile?.role) };
  }

  function mountThread(point) {
    const details = element('details');
    details.className = 'vice-comments';
    const summary = element('summary', t('Comentarios de la ubicación'));
    const status = element('p');
    status.setAttribute('role', 'status');
    const list = element('div');
    list.className = 'vice-comments-list';
    const composer = element('div');
    const refresh = makeButton('Actualizar', () => load());
    let generation = 0;
    let viewer = {};

    function renderComment(row) {
      const card = element('article');
      const meta = element('small');
      const date = new Date(row.created_at);
      const time = element('time', dateFormat.format(date));
      time.dateTime = row.created_at;
      meta.append(element('strong', row.author_alias), ' · ', time);
      const body = element('p', row.body);
      body.lang = row.language;
      body.dataset.original = '';
      card.append(meta, body);

      if (language !== row.language) card.append(translationButton([body], row.language));

      if (viewer.moderator || (viewer.member && ownComments[row.id] === viewer.member.id)) {
        const remove = makeButton('Eliminar comentario', async () => {
          if (!window.confirm(t('¿Eliminar este comentario?'))) return;
          remove.disabled = true;
          try {
            const { data, error } = await client.from('map_location_comments').delete().eq('id', row.id).select('id');
            if (error || !data?.length) throw error || new Error('Comment not deleted');
            await load();
          } catch {
            status.textContent = t('No se pudo eliminar el comentario.');
            remove.disabled = false;
          }
        });
        card.append(remove);
      }

      return card;
    }

    function renderComposer() {
      if (!viewer.member) {
        composer.replaceChildren(makeButton('Inicia sesión para comentar', signIn));
        return;
      }
      if (composer.dataset.user === viewer.member.id && composer.querySelector('form')) return;
      composer.dataset.user = viewer.member.id;

      const form = element('form');
      const body = element('textarea');
      body.required = true;
      body.maxLength = 1000;
      body.rows = 3;
      body.placeholder = t('Tu comentario');
      body.setAttribute('aria-label', t('Tu comentario'));
      const languageField = element('select');
      languageField.setAttribute('aria-label', t('Idioma del comentario'));
      languageField.add(new Option('Español', 'es'));
      languageField.add(new Option('English', 'en'));
      languageField.value = language;
      const submit = element('button', t('Publicar comentario'));

      form.addEventListener('submit', async event => {
        event.preventDefault();
        const message = body.value.trim();
        if (!message || submit.disabled) return;
        submit.disabled = true;
        submit.textContent = t('Publicando…');
        const authorId = viewer.member?.id;
        try {
          const { data, error } = await client.from('map_location_comments').insert({
            location_id: point.id, body: message, language: languageField.value
          }).select('id').single();
          if (error) throw error;
          if (authorId) rememberComment(data.id, authorId);
          body.value = '';
          await load();
        } catch (error) {
          status.textContent = t(error?.code === '23505'
            ? 'Espera unos segundos antes de publicar otro comentario.'
            : 'No se pudo publicar el comentario.');
        } finally {
          submit.disabled = false;
          submit.textContent = t('Publicar comentario');
        }
      });

      form.append(body, languageField, submit);
      composer.replaceChildren(form);
    }

    async function load() {
      const request = ++generation;
      status.textContent = t('Cargando comentarios…');
      refresh.disabled = true;
      try {
        const [result, state] = await Promise.all([
          client.from('map_location_comments').select(selectColumns).eq('location_id', point.id)
            .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50),
          accountState()
        ]);
        if (request !== generation) return;
        if (result.error) throw result.error;
        viewer = state;
        list.replaceChildren(...result.data.map(renderComment));
        status.textContent = result.data.length ? '' : t('Todavía no hay comentarios.');
        renderComposer();
      } catch {
        if (request === generation) status.textContent = t('No se pudieron cargar los comentarios.');
      } finally {
        if (request === generation) refresh.disabled = false;
      }
    }

    details.addEventListener('toggle', () => {
      if (!details.open || !details.isConnected) return;
      openThread = { details, load };
      load();
    });
    details.append(summary, status, list, composer, refresh);
    return details;
  }

  client.auth.onAuthStateChange(event => {
    if (!['SIGNED_IN', 'SIGNED_OUT'].includes(event)) return;
    setTimeout(() => {
      if (openThread?.details.open && openThread.details.isConnected) openThread.load();
    }, 0);
  });

  popup = function(point) {
    const content = originalPopup(point);
    content.append(mountThread(point));
    return content;
  };
})();
