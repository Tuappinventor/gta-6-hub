import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

for (const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY']) if (!process.env[key]) throw new Error(`Falta ${key}`);
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const parser=new Parser({timeout:12000,headers:{'User-Agent':'VICEHUB-AutoGuides/1.0'}});
const today=new Date();today.setUTCHours(0,0,0,0);
const {count,error:countError}=await db.from('articles').select('id',{count:'exact',head:true}).eq('kind','guide').gte('created_at',today.toISOString());
if(countError)throw countError;
if((count||0)>=1){console.log('AutoGuides: ya se creó una guía hoy.');process.exit(0)}
const sources=[
 {name:'Rockstar Games',url:'https://www.rockstargames.com/newswire/rss'},
 {name:'Google News GTA VI',url:'https://news.google.com/rss/search?q=%22GTA+VI%22+%28gu%C3%ADa+OR+personajes+OR+veh%C3%ADculos+OR+localizaciones%29&hl=es&gl=ES&ceid=ES:es'}
];
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim();
const valid=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,12);
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
async function original(url){try{const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),9000);let res;try{res=await fetch(url,{signal:ctl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 VICEHUB-AutoGuides','Accept':'text/html'}})}finally{clearTimeout(timer)}if(!res.ok||!String(res.headers.get('content-type')).includes('text/html'))return null;const final=valid(res.url);if(!final||new URL(final).hostname==='news.google.com')return null;const html=(await res.text()).slice(0,350000);const body=clean(html.replace(/<(?:header|footer|nav|aside)[\s\S]*?<\/(?:header|footer|nav|aside)>/gi,'')).slice(0,14000);return body.length>=900?{url:final,body}:null}catch{return null}}
const entries=[];
for(const source of sources){try{const feed=await parser.parseURL(source.url);for(const item of feed.items||[]){const title=clean(item.title),url=valid(item.link);const date=new Date(item.isoDate||item.pubDate||'');if(!url||!Number.isFinite(date.getTime())||Date.now()-date.getTime()>30*86400000||date.getTime()>Date.now()+3600000)continue;if(!/\b(gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi))\b/i.test(title+' '+clean(item.contentSnippet)))continue;entries.push({title,url,date:date.toISOString(),source:source.name,excerpt:clean(item.contentSnippet||item.content).slice(0,1400)})}console.log('Fuente RSS leída:',source.name)}catch(e){console.warn('Fuente no disponible:',source.name,e.message)}}
entries.sort((a,b)=>b.date.localeCompare(a.date));
let calls=0;
for(const item of entries){if(calls>=2)break;const {data:duplicate,error:dupErr}=await db.from('articles').select('id').eq('source_url',item.url).limit(1);if(dupErr)throw dupErr;if(duplicate?.length)continue;
const src=await original(item.url);if(!src){console.log('Sin artículo original verificable:',item.title);continue}
const {data:finalDuplicate,error:finalErr}=await db.from('articles').select('id').eq('source_url',src.url).limit(1);if(finalErr)throw finalErr;if(finalDuplicate?.length)continue;
calls++;
const prompt=`Eres editor de guías de VICE HUB sobre GTA VI. Escribe español de España. Solo puedes usar la fuente aportada; no afirmes contrastar con otras fuentes. Si la fuente no ofrece información práctica suficiente para una guía útil y verificable, devuelve decision="skip". Si es un anuncio o noticia sin contenido de guía, devuelve skip. No inventes mecánicas, ubicaciones, personajes, fechas, prestaciones, consejos ni misiones. Si el texto es una filtración o rumor, devuelve decision="draft". Si la fuente es oficial de Rockstar Games, su texto confirma los hechos y no hay afirmaciones dudosas, puedes devolver publish; en cualquier otro caso devuelve draft. Redacta una guía clara, con apartados separados por dobles saltos de línea, extensión objetivo 500-800 palabras SOLO cuando la fuente lo permita; evita relleno y citas inventadas. Resume qué se sabe, cómo interpretar la información, qué falta confirmar y la fecha/contexto de la fuente. Devuelve JSON exclusivamente con campos: decision (publish|draft|skip), title, summary, body, reason, category (guias).`;
const response=await ai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify({rss:item,original:src})}]});
const out=JSON.parse(response.choices[0]?.message?.content||'{}');if(out.decision==='skip'){console.log('Tema descartado:',String(out.reason||'').slice(0,200));continue}
const title=String(out.title||'').trim().slice(0,180),summary=String(out.summary||'').trim().slice(0,600),body=String(out.body||'').trim().slice(0,16000);
if(title.length<20||summary.length<40||body.length<500){console.log('Guía insuficiente');continue}
const host=new URL(src.url).hostname.toLowerCase();const official=host==='rockstargames.com'||host.endsWith('.rockstargames.com');const published=official&&out.decision==='publish';
const record={title,summary,body,slug:`${slug(title)||'guia'}-${hash(src.url)}`,kind:'guide',status:published?'published':'draft',published_at:published?new Date().toISOString():null,source_url:src.url,source_name:host,verification_level:official?'official':'secondary',category:'guias',featured:false,verification_notes:`AutoGuides 1.0 · ${String(out.reason||'Revisión editorial pendiente').slice(0,500)} · Fuente única: ${src.url} · Sin corroboración independiente`};
const {error}=await db.from('articles').insert(record);if(error?.code==='23505')continue;if(error)throw error;
console.log(published?'Guía publicada:':'Guía enviada a borradores:',title);process.exit(0)
}
console.log(`AutoGuides: sin nuevas guías aptas; ${entries.length} entradas, ${calls} llamadas IA.`);
