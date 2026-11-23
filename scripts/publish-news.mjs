import Parser from 'rss-parser';
import OpenAI from 'openai';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
for(const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'])if(!process.env[k])throw Error(`Falta ${k}`);
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const parser=new Parser({timeout:12000,headers:{'User-Agent':'VICEHUB/3.0'}});
const feeds=[{name:'Google News · GTA VI',url:'https://news.google.com/rss/search?q=%22GTA+6%22+OR+%22GTA+VI%22&hl=es&gl=ES&ceid=ES:es'},{name:'Google News · Rockstar GTA VI',url:'https://news.google.com/rss/search?q=%22Rockstar+Games%22+%22GTA+VI%22&hl=en&gl=US&ceid=US:en'}];
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,12);
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,105);
const canon=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const now=Date.now(),start=new Date();start.setUTCHours(0,0,0,0);
const {count,error:countError}=await db.from('articles').select('id',{count:'exact',head:true}).not('source_url','is',null).gte('published_at',start.toISOString());if(countError)throw countError;
const remaining=Math.max(0,3-(count||0));console.log(`Publicadas hoy: ${count||0}; disponibles: ${remaining}`);
if(remaining){
 const items=[];
 for(const f of feeds){try{const feed=await parser.parseURL(f.url);for(const i of feed.items||[]){const date=new Date(i.isoDate||i.pubDate||'');const url=canon(i.link||'');if(!url||!Number.isFinite(date.getTime())||now-date.getTime()>48*3600000||date.getTime()>now+3600000)continue;items.push({title:String(i.title||'').slice(0,300),url,excerpt:String(i.contentSnippet||'').slice(0,1200),date:date.toISOString(),feed:f.name})}console.log(`RSS leído: ${f.name}`)}catch(e){console.warn(`RSS no disponible: ${f.name}: ${e.message}`)}}
 items.sort((a,b)=>b.date.localeCompare(a.date));let calls=0,published=0;const seen=new Set();
 for(const item of items){if(published>=Math.min(1,remaining)||calls>=2)break;if(seen.has(item.url))continue;seen.add(item.url);const {data:old,error:oldErr}=await db.from('articles').select('id').eq('source_url',item.url).limit(1);if(oldErr)throw oldErr;if(old?.length)continue;calls++;
 const prompt=`Eres un verificador y redactor extremadamente conservador de noticias de GTA VI. Solo dispones del título y extracto de un RSS de Google News: NO del artículo completo. No inventes cifras, fechas, citas, anuncios, declaraciones ni confirmaciones. No confundas noticias antiguas con actuales. Si no puedes confirmar una afirmación importante con la entrada, publish=false. Si hay cifras llamativas, filtraciones, especulación, anuncios de lanzamiento o promesas financieras, publish=false a menos que el extracto incluya una declaración oficial explícita y verificable (el RSS agregado por sí solo no es prueba oficial). No marques nunca 'official' solo porque un titular mencione Rockstar. Solo puedes usar verification_level='secondary' o 'unverified'; los rumores, si son relevantes y claramente atribuidos, deben usar 'unverified', título no categórico y category='rumores'. No atribuyas a Rockstar algo que diga un tercero. Escribe español de España, sin plagio. Responde SOLO JSON: {"publish":boolean,"title":string,"summary":string,"body":string,"category":string,"verification_level":string,"reason":string}. Categorías válidas: actualidad, rumores, filtraciones, trailers, guias. El cuerpo debe contener 2-3 párrafos y terminar en Fuente: URL exacta. No incluyas material de otras franquicias.`;
 let result;try{const response=await ai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(item)}]});result=JSON.parse(response.choices[0].message.content)}catch(e){console.error(`OpenAI: ${e.status||'error'} ${e.code||e.message}`);throw e}
 if(result.publish!==true){console.log(`Descartada: ${String(result.reason||'evidencia insuficiente').slice(0,120)}`);continue}
 const category=['actualidad','rumores','filtraciones','trailers','guias'].includes(result.category)?result.category:'actualidad';const verification_level=result.verification_level==='unverified'?'unverified':'secondary';const title=String(result.title||'').slice(0,180),summary=String(result.summary||'').slice(0,600),body=String(result.body||'').slice(0,10000);
 if(title.length<20||summary.length<40||body.length<180||!body.includes(item.url)||/\$\s?\d+(?:[.,]\d+)?\s*(?:mil\s+)?millones/i.test(title))continue;
 const record={title,summary,body,slug:`${slug(title)||'noticia'}-${hash(item.url)}`,kind:'news',status:'published',published_at:new Date().toISOString(),source_url:item.url,source_name:item.feed,verification_level,category,featured:false};
 const {error}=await db.from('articles').insert(record);if(error?.code==='23505')continue;if(error)throw error;published++;console.log(`Publicada: ${title}`)
 }
 console.log(`Resultado: ${published} publicadas; ${items.length} entradas RSS; ${calls} llamadas IA`)
}
