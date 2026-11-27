// Sitemap XML dinámico de artículos publicados; requiere variables Vercel públicas.
const xml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export default async function handler(req,res){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!base||!key)return res.status(503).send('Sitemap no configurado');
 try{
 const response=await fetch(`${base.replace(/\/$/,'')}/rest/v1/articles?status=eq.published&select=slug,published_at&order=published_at.desc&limit=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
 if(!response.ok)throw Error('database');
 const rows=await response.json(),origin='https://vicehubgta6.com';
 const entries=[`<url><loc>${origin}/</loc></url>`,...rows.filter(a=>/^[a-z0-9-]+$/.test(a.slug)).map(a=>`<url><loc>${origin}/articulo/${xml(a.slug)}</loc>${a.published_at?`<lastmod>${xml(new Date(a.published_at).toISOString())}</lastmod>`:''}</url>`)];
 res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=600');return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`);
 }catch{return res.status(503).send('Sitemap temporalmente no disponible')}
}
