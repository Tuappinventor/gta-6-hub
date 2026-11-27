import { articleSourceLabel, publicHeadline } from '../article-verification.js';
import { guideMapLinks } from '../guide-map-links.js';

// Vercel Serverless: HTML indexable de artículos publicados.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlSafe = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
export default async function handler(req,res) {
 const english = req.query.lang === 'en';
 const language = english ? 'en' : 'es';
 const slug=String(req.query.slug||'').slice(0,200);
 if(!/^[a-z0-9-]{1,200}$/.test(slug))return res.status(404).send('Artículo no encontrado');
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!base||!key)return res.status(503).send('Servicio temporalmente no disponible');
 try{
 const endpoint=`${base.replace(/\/$/,'')}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,summary,body,title_en,summary_en,body_en,slug,kind,published_at,source_url,source_name,verification_level,category,image_url,image_credit&limit=1`;
 const response=await fetch(endpoint,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!response.ok)throw Error('Supabase unavailable');
 const [a]=await response.json();if(!a)return res.status(404).send('Artículo no encontrado');
 const canonical=`https://vicehubgta6.com/articulo/${encodeURIComponent(a.slug)}`;
 const image=urlSafe(a.image_url),source=urlSafe(a.source_url),headline=publicHeadline(a, language),title=escapeHtml(headline);
 const summary = (english && a.summary_en) || a.summary || (english ? 'GTA VI news on VICE HUB' : 'Noticias sobre GTA VI en VICE HUB');
 const description=escapeHtml(summary);
 const titleLang=english && a.title_en ? 'en' : 'es';
 const summaryLang=english && a.summary_en ? 'en' : 'es';
 const bodyLang=english && a.body_en ? 'en' : 'es';
 const original = lang => lang === 'es' ? ' data-original lang="es"' : ' lang="en"';
 const blocks=String(a.body||'').split(/\n\s*\n/).filter(Boolean);
 const sourceHeading='Fuentes consultadas\n';
 const sourcesBlock=a.kind==='guide' && blocks.at(-1)?.startsWith(sourceHeading)
  ? blocks.pop().slice(sourceHeading.length) : '';
 const references=sourcesBlock.split('\n').filter(Boolean).map(line=>{
  const [name, url]=line.split(' · ');
  const href=urlSafe(url);
  return href
   ? `<li><a rel="nofollow noopener noreferrer" href="${escapeHtml(href)}">${escapeHtml(name)}</a></li>`
   : `<li>${escapeHtml(line)}</li>`;
 }).join('');
 const paragraphs=(bodyLang === 'en' ? a.body_en.split(/\n\s*\n/).filter(Boolean) : blocks)
  .map(x=>`<p${original(bodyLang)}>${escapeHtml(x)}</p>`).join('')
  +(references?`<h2>Fuentes consultadas</h2><ul>${references}</ul>`:'');
 const mapPoints = a.kind === 'guide' && Object.hasOwn(guideMapLinks, a.slug)
  ? guideMapLinks[a.slug] : [];
 const mapLinks = mapPoints.length
  ? `<section><h2>Ver en el mapa</h2><p>Ubicaciones señaladas por la comunidad.</p><ul>${mapPoints
   .map(point => `<li><a href="/mapa-v8.html?id=${encodeURIComponent(point.id)}${english ? '&amp;lang=en' : ''}">${escapeHtml(point.name)}</a></li>`)
   .join('')}</ul></section>`
  : '';
 const share = a.kind === 'guide'
  ? '<details class="guide-share"><summary>Compartir guía</summary><div id="viceShare"></div></details>'
  : '<div id="viceShare"></div>';
 const back = a.kind === 'guide' ? (english ? '/?lang=en#guias' : '/guia.html') : '/?seccion=noticias' + (english ? '&amp;lang=en' : '');
 const structured=JSON.stringify({'@context':'https://schema.org','@type':a.kind==='guide'?'Article':'NewsArticle',headline,description:summary,inLanguage:language,datePublished:a.published_at,mainEntityOfPage:canonical,publisher:{'@type':'Organization',name:'VICE HUB'},...(image?{image:[image]}:{})}).replace(/</g,'\\u003c');
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 return res.status(200).send(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | VICE HUB</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="twitter:card" content="summary_large_image">${image?`<meta property="og:image" content="${escapeHtml(image)}">`:''}<script type="application/ld+json">${structured}</script><style>body{margin:0;background:#090c16;color:#f8f8ff;font:17px/1.75 system-ui,Arial}main{max-width:790px;margin:auto;padding:25px}a{color:#ff84bd}h1{font-size:clamp(32px,6vw,54px);line-height:1.14}img{width:100%;border-radius:16px}header{padding:18px;background:#151a30;font-weight:900}header a{color:white;text-decoration:none}small{color:#f8a2c7}article p{white-space:pre-wrap}.guide-share{margin-top:28px}.guide-share summary{width:fit-content;cursor:pointer;padding:8px 13px;border:1px solid #56435d;border-radius:9px;color:#ffb0d2}footer{margin-top:40px;color:#b6bfd1}</style><script defer src="/web-analytics.js"></script><link rel="stylesheet" href="/idiomas.css"><script src="/idiomas.js?v=2"></script></head><body><header><a href="${english ? '/?lang=en' : '/'}">VICE HUB · GTA VI</a></header><main><a href="${back}">Volver a ${a.kind==='guide'?'guías':'noticias'}</a><article data-editorial-article><small>${escapeHtml(a.category||'Actualidad')} · ${escapeHtml(a.verification_level==='official'?'Fuente oficial':a.verification_level==='unverified'?'No confirmado':'Fuente secundaria')}</small><h1${original(titleLang)}>${title}</h1><p${original(summaryLang)}>${description}</p>${image?`<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(a.image_credit||a.title)}"><figcaption>${escapeHtml(a.image_credit||'')}</figcaption></figure>`:''}${mapLinks}${paragraphs}</article>${share}<footer>${source?`${english ? 'Source' : 'Fuente'}: <a rel="nofollow noopener noreferrer" href="${escapeHtml(source)}">${escapeHtml(articleSourceLabel(source, language))}</a>${a.source_name ? ` · ${escapeHtml(a.source_name)}` : ''}`: (english ? 'VICE HUB editorial content' : 'Contenido editorial de VICE HUB')}</footer></main><script src="/share.js" defer></script></body></html>`);
 }catch{return res.status(503).send('Servicio temporalmente no disponible')}
}
