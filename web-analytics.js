(() => {
  if (location.hostname !== 'vicehubgta6.com') return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  window.va('beforeSend', event => {
    const url = new URL(event.url, location.origin);

    if (url.pathname === '/index.html') url.pathname = '/';
    if ((url.pathname === '/' || url.pathname === '/mapa-v8.html' ||
        url.pathname === '/mapa-interactivo.html') &&
        (url.searchParams.has('code') || url.hash.includes('access_token='))) {
      return null;
    }

    url.search = '';
    url.hash = '';
    return { ...event, url: url.href };
  });

  const script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  document.head.append(script);
})();
