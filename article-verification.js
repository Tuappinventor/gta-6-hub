export function publicHeadline(article, language = 'es') {
  const english = language === 'en' && Boolean(article.title_en);
  const title = String((english ? article.title_en : article.title) ?? '').trim();
  if (!title || article.kind === 'guide' ||
      ['official', 'secondary'].includes(article.verification_level)) {
    return title;
  }

  if (english && /^(?:unverified|unconfirmed|rumou?rs?|leaks?)(?:\s*:| (?:about|point|suggest)\b)/i.test(title)) return title;

  if (/^(?:sin verificar|sin confirmar|no confirmado|rumor(?:es)?|filtración)(?:\s*:| sobre\b)/i.test(title)) {
    return title;
  }

  const label = article.category === 'rumores' ? 'Rumor' : english ? 'Unverified' : 'Sin verificar';
  return `${label}: ${title}`;
}

export function articleSourceLabel(source, language = 'es') {
  return new URL(source).hostname === 'news.google.com'
    ? (language === 'en' ? 'Google News reference' : 'Referencia en Google News')
    : (language === 'en' ? 'View original source' : 'Consultar fuente original');
}
