
(() => {
  'use strict';

  // VICE HUB 3.6
  // Acceso privado a automatizaciones

  const cfg =
    window.VICEHUB_CONFIG || {};

  if (
    !window.supabase ||
    !cfg.url ||
    !cfg.anonKey
  ) return;

  const db = window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );

  let version = 0;

  function removeButton() {
    document
      .getElementById('automationAccess')
      ?.remove();
  }

  async function checkAccess() {
    const current = ++version;

    removeButton();

    try {
      const { data, error } =
        await db.auth.getUser();

      if (error || !data?.user) return;

      const {
        data: profile,
        error: profileError
      } = await db
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (
        current !== version ||
        profileError ||
        profile?.role !== 'admin'
      ) return;

      const panel =
        document.getElementById(
          'v33Editorial'
        );

      if (!panel) return;

      const container =
        document.createElement('div');

      container.id = 'automationAccess';

      Object.assign(container.style, {
        margin: '16px 0',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #49365e',
        background: '#191424'
      });

      const title =
        document.createElement('strong');

      title.textContent =
        '⚙ Control de automatizaciones';

      title.style.color = '#f5f3ff';

      const description =
        document.createElement('p');

      description.textContent =
        'Supervisa las noticias, guías, imágenes, errores y consumo de OpenAI.';

      Object.assign(description.style, {
        color: '#b8adc9',
        fontSize: '14px',
        lineHeight: '1.5',
        margin: '8px 0 14px'
      });

      const button =
        document.createElement('a');

      button.href =
        './automatizaciones.html';

      button.textContent =
        'Abrir control de automatizaciones →';

      Object.assign(button.style, {
        display: 'inline-block',
        padding: '12px 16px',
        borderRadius: '8px',
        background:
          'linear-gradient(135deg, #db2777, #7c3aed)',
        color: '#ffffff',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '14px'
      });

      container.append(
        title,
        description,
        button
      );

      const heading =
        panel.querySelector('h3');

      if (heading) {
        heading.after(container);
      } else {
        panel.prepend(container);
      }

    } catch (error) {
      if (current === version) {
        removeButton();
      }

      console.warn(
        '[AUTOMATION ACCESS]',
        'No se pudieron verificar los permisos.'
      );
    }
  }

  db.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      version++;
      removeButton();
      return;
    }

    if (
      event === 'SIGNED_IN' ||
      event === 'INITIAL_SESSION' ||
      event === 'USER_UPDATED'
    ) {
      setTimeout(checkAccess, 0);
    }
  });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (!document.hidden) {
        checkAccess();
      }
    }
  );

  checkAccess();

})();
