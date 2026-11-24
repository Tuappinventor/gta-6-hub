/* VICE HUB - ViceShare 1.1 */

(() => {
  'use strict';

  function instagram(container, article, title, url) {

    const panel = document.createElement('div');

    panel.hidden = true;
    panel.style.cssText = `
      margin-top:16px;
      display:none;
      gap:10px;
      flex-direction:column;
    `;

    const note = document.createElement('p');

    note.textContent =
      'Elige formato, prepara la imagen y compártela o guárdala. Instagram requiere confirmar la publicación en su aplicación.';

    panel.append(note);

    const controls = document.createElement('div');
    controls.className = 'vice-share-buttons';
    panel.append(controls);

    const preview = document.createElement('img');

    preview.alt = 'Vista previa para Instagram';

    preview.style.cssText = `
      max-width:320px;
      width:100%;
      height:auto;
      align-self:center;
      border-radius:12px;
    `;

    preview.hidden = true;
    panel.append(preview);

    const actions = document.createElement('div');
    actions.className = 'vice-share-buttons';
    panel.append(actions);

    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    panel.append(status);

    let file = null;
    let objectUrl = null;
    let sequence = 0;

    function btn(parent, label, fn) {
      const b = document.createElement('button');

      b.type = 'button';
      b.textContent = label;
      b.onclick = fn;

      parent.append(b);

      return b;
    }

    const summary =
      article.summary ||
      container.closest('article')
        ?.querySelector('p')?.textContent ||
      document.querySelector(
        'meta[property="og:description"]'
      )?.content ||
      '';

    const caption = [
      title,
      summary,
      'Lee más en VICE HUB:',
      url,
      '#GTAVI #GTA6 #ViceCity #Leonida #ViceHub'
    ].filter(Boolean).join('\n\n');

    // Compartir imagen en aplicaciones del móvil

    const share = btn(
      actions,
      'Compartir imagen',
      async () => {

        if (!file) return;

        try {

          if (
            navigator.canShare?.({ files: [file] }) &&
            navigator.share
          ) {

            await navigator.share({
              files: [file]
            });

            status.textContent =
              'Si Instagram está disponible, elige publicación o historia en la aplicación.';

          } else {

            status.textContent =
              'Tu navegador no permite compartir archivos. Guarda la imagen y ábrela en Instagram.';

          }

        } catch (e) {

          if (e.name !== 'AbortError') {

            status.textContent =
              'Guarda la imagen y súbela desde Instagram.';

          }
        }
      }
    );

    // Descargar imagen

    const save = btn(
      actions,
      'Guardar imagen',
      () => {

        if (!objectUrl) return;

        const a = document.createElement('a');

        a.href = objectUrl;
        a.download = file.name;
        a.click();

      }
    );

    // Copiar descripción y hashtags

    btn(actions, 'Copiar texto', async () => {

      try {

        await navigator.clipboard.writeText(caption);

        status.textContent =
          'Texto copiado. Pégalo en Instagram.';

      } catch {

        window.prompt('Copia el texto:', caption);

      }
    });

    share.disabled = true;
    save.disabled = true;

    // Cargar portada original

    function loadImage(src) {

      return new Promise((resolve, reject) => {

        const img = new Image();

        img.crossOrigin = 'anonymous';

        const timer = setTimeout(
          () => reject(new Error('timeout')),
          8000
        );

        img.onload = () => {

          clearTimeout(timer);
          resolve(img);

        };

        img.onerror = () => {

          clearTimeout(timer);
          reject(new Error('image'));

        };

        img.src = src;

      });
    }

    // Ajustar texto al tamaño de la imagen

    function lines(ctx, text, width, max) {

      const out = [];
      let line = '';

      for (const word of text.split(/\s+/)) {

        const parts = [];
        let part = '';

        for (const ch of word) {

          if (
            part &&
            ctx.measureText(part + ch).width > width
          ) {

            parts.push(part);
            part = '';

          }

          part += ch;

        }

        if (part) parts.push(part);

        for (const p of parts) {

          const next = line ? line + ' ' + p : p;

          if (
            line &&
            ctx.measureText(next).width > width
          ) {

            out.push(line);
            line = p;

          } else {

            line = next;

          }
        }
      }

      if (line) out.push(line);

      if (out.length > max) {

        out.length = max;

        while (
          out[max - 1] &&
          ctx.measureText(
            out[max - 1] + '…'
          ).width > width
        ) {

          out[max - 1] =
            out[max - 1].slice(0, -1);

        }

        out[max - 1] += '…';

      }

      return out;
    }

    // Generador de imágenes para Instagram

    async function prepare(height) {

      const run = ++sequence;

      file = null;

      share.disabled = true;
      save.disabled = true;
      preview.hidden = true;

      status.textContent = 'Preparando imagen…';

      try {

        const canvas = document.createElement('canvas');

        canvas.width = 1080;
        canvas.height = height;

        const c = canvas.getContext('2d');

        // Fondo corporativo VICE HUB

        const g = c.createLinearGradient(
          0, 0, 1080, height
        );

        g.addColorStop(0, '#301a46');
        g.addColorStop(1, '#090c16');

        c.fillStyle = g;
        c.fillRect(0, 0, 1080, height);

        const story = height === 1920;

        const top = story ? 230 : 120;
        const photoH = story ? 930 : 480;

        // Buscar imagen de la publicación

        const src =
          article.image ||
          container.closest('article')
            ?.querySelector('img')?.src ||
          document.querySelector(
            'meta[property="og:image"]'
          )?.content ||
          document.querySelector(
            'article figure img'
          )?.src;

        let hasImage = false;

        if (src) {

          try {

            const im = await loadImage(src);

            const scale = Math.max(
              1080 / im.width,
              photoH / im.height
            );

            c.save();
            c.beginPath();
            c.rect(0, top, 1080, photoH);
            c.clip();

            c.drawImage(
              im,
              (1080 - im.width * scale) / 2,
              top + (photoH - im.height * scale) / 2,
              im.width * scale,
              im.height * scale
            );

            c.restore();

            hasImage = true;

          } catch {}

        }

        // Diseño alternativo si no hay portada

        if (!hasImage) {

          c.fillStyle = '#482c60';
          c.fillRect(0, top, 1080, photoH);

          c.fillStyle = '#ff84bd';
          c.font = '900 180px system-ui';
          c.textAlign = 'center';

          c.fillText(
            'VI',
            540,
            top + photoH / 2 + 60
          );

          c.textAlign = 'left';

        }

        // Cabecera VICE HUB

        c.fillStyle = '#ff84bd';
        c.font = '900 48px system-ui';

        c.fillText(
          'VICE HUB  /  GTA VI',
          64,
          story ? 185 : 82
        );

        // Título de la publicación

        c.fillStyle = '#ffffff';
        c.font = '800 60px system-ui';

        const y = top + photoH + 88;

        lines(
          c,
          title,
          952,
          story ? 7 : 4
        ).forEach((l, i) => {

          c.fillText(l, 64, y + i * 72);

        });

        // Pie de imagen

        c.fillStyle = '#ff84bd';
        c.font = '600 32px system-ui';

        c.fillText(
          'Lee la publicación en VICE HUB',
          64,
          height - (story ? 240 : 52)
        );

        // Convertir imagen a JPEG

        const blob = await new Promise(
          (resolve, reject) => {

            canvas.toBlob(
              b => b
                ? resolve(b)
                : reject(new Error('canvas')),
              'image/jpeg',
              .92
            );

          }
        );

        if (run !== sequence) return;

        if (objectUrl) {

          URL.revokeObjectURL(objectUrl);

        }

        file = new File(
          [blob],
          story
            ? 'vicehub-historia.jpg'
            : 'vicehub-publicacion.jpg',
          { type: 'image/jpeg' }
        );

        objectUrl = URL.createObjectURL(file);

        preview.src = objectUrl;
        preview.hidden = false;

        share.disabled = false;
        save.disabled = false;

        status.textContent = hasImage
          ? 'Imagen preparada.'
          : 'Imagen preparada con diseño VICE HUB (portada no disponible o bloqueada).';

      } catch {

        if (run === sequence) {

          status.textContent =
            'No se pudo preparar la imagen. Prueba de nuevo.';

        }
      }
    }

    // Formatos de Instagram

    btn(
      controls,
      'Publicación 1:1',
      () => prepare(1080)
    );

    btn(
      controls,
      'Historia 9:16',
      () => prepare(1920)
    );

    return {

      panel,

      toggle() {

        panel.hidden = !panel.hidden;

        panel.style.display =
          panel.hidden ? 'none' : 'flex';

      }

    };
  }

  // Módulo principal de compartir

  function mount(container, article) {

    if (
      !container ||
      container.querySelector('.vice-share')
    ) return;

    const url = article.url || location.href;
    const title = article.title || document.title;

    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);

    // Estilos

    if (!document.getElementById('vice-share-css')) {

      const s = document.createElement('style');

      s.id = 'vice-share-css';

      s.textContent = `

        .vice-share {
          margin:24px 0;
          padding:16px;
          border:1px solid #343c55;
          border-radius:16px;
          background:#111729;
          color:white;
        }

        .vice-share-title {
          font-weight:800;
          color:#ff84bd;
          margin-bottom:12px;
          font-size:14px;
        }

        .vice-share-buttons {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }

        .vice-share-buttons a,
        .vice-share-buttons button {
          padding:10px 14px;
          border-radius:10px;
          border:0;
          color:white;
          font:600 13px system-ui;
          text-decoration:none;
          cursor:pointer;
          background:#39445e;
        }

        .vice-share-buttons a:hover,
        .vice-share-buttons button:hover {
          opacity:.85;
        }

        .vice-share-buttons button:disabled {
          opacity:.45;
          cursor:not-allowed;
        }

        .vice-share-status {
          font-size:12px;
          margin-top:8px;
        }

        @media(max-width:600px) {

          .vice-share-buttons > * {
            flex:1 1 35%;
            text-align:center;
          }

        }

      `;

      document.head.append(s);

    }

    const box = document.createElement('div');

    box.className = 'vice-share';

    const heading = document.createElement('div');

    heading.className = 'vice-share-title';
    heading.textContent = 'COMPARTIR PUBLICACIÓN';

    const buttons = document.createElement('div');

    buttons.className = 'vice-share-buttons';

    const status = document.createElement('div');

    status.className = 'vice-share-status';
    status.setAttribute('role', 'status');

    // Redes sociales

    const networks = [

      [
        'WhatsApp',
        'https://wa.me/?text=' + t + '%20' + u,
        '#168b49'
      ],

      [
        'Facebook',
        'https://www.facebook.com/sharer/sharer.php?u=' + u,
        '#1877f2'
      ],

      [
        '𝕏',
        'https://twitter.com/intent/tweet?text=' + t + '&url=' + u,
        '#000000'
      ],

      [
        'Telegram',
        'https://t.me/share/url?url=' + u + '&text=' + t,
        '#167ca9'
      ]

    ];

    for (const [name, href, color] of networks) {

      const a = document.createElement('a');

      a.textContent = name;
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.background = color;

      buttons.append(a);

    }

    function button(label, fn) {

      const b = document.createElement('button');

      b.type = 'button';
      b.textContent = label;
      b.onclick = fn;

      buttons.append(b);

      return b;
    }

    // Copiar enlace

    button('Copiar enlace', async () => {

      try {

        await navigator.clipboard.writeText(url);

        status.textContent = '✓ Enlace copiado';

      } catch {

        window.prompt('Copia este enlace:', url);

      }

    });

    // Compartir mediante Android o iPhone

    if (navigator.share) {

      button('Compartir…', async () => {

        try {

          await navigator.share({
            title,
            url
          });

        } catch (e) {

          if (e.name !== 'AbortError') {

            status.textContent =
              'Utiliza los otros botones.';

          }

        }

      }).style.background = '#a43e91';

    }

    // Instagram

    const ig = instagram(
      container,
      article,
      title,
      url
    );

    button(
      'Instagram',
      () => ig.toggle()
    ).style.background =
      'linear-gradient(120deg,#833ab4,#e1306c,#c65b24)';

    box.append(
      heading,
      buttons,
      status,
      ig.panel
    );

    container.append(box);

  }

  // API pública del módulo

  window.ViceShare = { mount };

  // Activación automática en artículos

  function init() {

    mount(
      document.getElementById('viceShare'),
      {

        title:
          document.querySelector('article h1')
            ?.textContent ||
          document.title,

        url:
          document.querySelector('link[rel="canonical"]')
            ?.href ||
          location.href

      }
    );

  }

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }

})();
