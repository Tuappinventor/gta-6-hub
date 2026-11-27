export function publicHeadline(article) {
  const title = String(article.title ?? '').trim();
  if (!title || article.kind === 'guide' ||
      ['official', 'secondary'].includes(article.verification_level)) {
    return title;
  }

  if (/^(?:sin verificar|sin confirmar|no confirmado|rumor(?:es)?|filtración)(?:\s*:| sobre\b)/i.test(title)) {
    return title;
  }

  const label = article.category === 'rumores' ? 'Rumor' : 'Sin verificar';
  return `${label}: ${title}`;
}

export function articleSourceLabel(source) {
  return new URL(source).hostname === 'news.google.com'
    ? 'Referencia en Google News'
    : 'Consultar fuente original';
}
