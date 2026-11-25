export const ROCKSTAR = {
  name: 'Rockstar Games',
  url: 'https://www.rockstargames.com/VI',
  level: 'official',
  markers: [/Welcome to Leonida/i, /Grand Theft Auto VI/i]
};

const vice = (slug, ...markers) => ({
  name: 'VICE',
  url: 'https://www.vice.com/en/article/' + slug + '/',
  level: 'secondary',
  markers
});

export const specialistTopics = {
  trucos: [
    vice('gta-6-cheat-codes-list', /D-pad/i, /Unlimited Focus/i),
    {
      name: 'Beebom',
      url: 'https://beebom.com/gta-6-cheat-codes/',
      level: 'secondary',
      markers: [/main story/i, /Unlimited Focus/i]
    }
  ],
  'cajas-fuertes': [
    vice('all-gta-6-safe-codes-illegal-operations', /Illegal Operations/i, /Port Gellhorn/i),
    vice('gta-6-chapter-2-port-gellhorn-safe-codes', /Chapter 2/i, /Safe Code/i)
  ],
  'cambio-personaje': [
    vice('how-to-switch-characters-in-gta-6', /Chapter 2/i, /D-pad/i, /Jason/i)
  ],
  'garaje-vamos': [
    vice('declasse-vamos-gta-6-code', /2727/, /Grayson/i, /Moses/i)
  ]
};

// Las secuencias se transcriben de forma explícita para excluir cambios del modelo.
export function controllerGuide() {
  const codes = [
    ['Dinero (250.000 $)', '↑ → ↓ ← ↑ ← ↓ →'],
    ['Concentración ilimitada', '↓ ↑ ↑ ↓ ↑ ↓ ↑ ↓ ↑ →'],
    ['Cambiar el clima', '↓ → ↑ ↓ → ↑ →'],
    ['Fuerza de ataque', '↓ ↑ ← ← → ↓ ↓ ↑ ↓']
  ];
  return {
    decision: 'publish',
    title: 'Trucos de GTA VI con el mando en PS5 y Xbox',
    summary: 'Cuatro códigos de cruceta para el modo historia de GTA VI, cómo desbloquearlos después de la campaña y cómo introducirlos en PS5 y Xbox Series X|S.',
    body: [
      'Desbloqueo y plataformas\nEstas cuatro combinaciones se habilitan al terminar la campaña principal. Comprueba tu partida en el menú de pausa, dentro de Progreso → Trucos. Las flechas son las mismas en PS5 y Xbox Series X|S.',
      'Cómo introducir los códigos\nPulsa arriba en la cruceta para sacar el móvil del juego. En PS5, mantén L1 y pulsa R1. En Xbox, mantén LB y pulsa RB. Con ambos botones pulsados, marca las direcciones de la secuencia en la cruceta.',
      'Códigos desbloqueados al completar la historia\n' + codes.map(([name, code]) => name + ' · ' + code).join('\n'),
      'Antes de probarlos\nGuarda la partida antes de activar un truco. Según las guías consultadas, los trucos desactivan el guardado y los trofeos o logros durante esa sesión. Si un código no responde, revisa en Progreso si aparece desbloqueado en esa partida.',
      'Comprobación editorial\nVICE y Beebom recogen las mismas cuatro secuencias. Esta guía cubre los trucos que se desbloquean al finalizar la historia. Otros requieren completar desafíos adicionales.'
    ].join('\n\n'),
    tags: ['trucos gta vi', 'ps5', 'xbox', 'cruceta', 'modo historia'],
    reason: 'Secuencias revisadas contrastando VICE y Beebom.'
  };
}

export async function readGuideSource(source) {
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 VICEHUB-AutoGuides', Accept: 'text/html' }
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);

  const origin = new URL(source.url);
  const final = new URL(response.url);
  if (final.protocol !== 'https:' || final.hostname.replace(/^www\./, '') !== origin.hostname.replace(/^www\./, '')
    || final.pathname.replace(/\/$/, '') !== origin.pathname.replace(/\/$/, '')) {
    throw new Error('La fuente redirigió a otra página');
  }

  const html = await response.text();
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const text = (source.level === 'official' ? main?.[1] || article?.[1] || html : article?.[1] || main?.[1] || '')
    .replace(/<(script|style|noscript|svg|aside|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(?:p|h[1-6]|li|tr|section)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 350 || !source.markers.every(marker => marker.test(text))) {
    throw new Error('Contenido temático insuficiente');
  }

  return { name: source.name, url: source.url, level: source.level, text: text.slice(0, 18000) };
}
