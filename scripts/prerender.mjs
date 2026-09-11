import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { brand, routes, siteUrl } from './ssg-config.mjs';

const dist=path.resolve('dist');
const template=await readFile(path.join(dist,'index.html'),'utf8');
const serverEntry=pathToFileURL(path.resolve('.ssr/entry-server.js')).href;
const {render}=await import(serverEntry);
// SPA shell serves app-only routes (forms, dashboard, referral links) that render
// empty shells to non-JS crawlers and would duplicate the home page in search indexes.
// Page-level Helmet noindex only runs after JS executes, so the raw shell itself must
// carry noindex,follow as well (keeps link equity flowing, keeps SERPs clean).
const spaTemplate=template.replace('</head>','<meta name="robots" content="noindex,follow" />\n</head>');
await writeFile(path.join(dist,'spa.html'),spaTemplate);

async function loadPublicSettings(){
 const base=String(process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
 if(!base)return {};
 try{
  const response=await fetch(`${base}/functions/v1/public-settings`,{headers:{Origin:siteUrl},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const payload=await response.json();
  return payload?.settings&&typeof payload.settings==='object'?payload.settings:{};
 }catch(error){
  console.warn(`[ssg] Public settings unavailable; using versioned defaults: ${String(error?.message||error)}`);
  return {};
 }
}

const settings=await loadPublicSettings();
const serialized=JSON.stringify(settings).replace(/</g,'\\u003c').replaceAll(String.fromCharCode(0x2028),'\\u2028').replaceAll(String.fromCharCode(0x2029),'\\u2029');
const heroUrl = settings.images?.hero?.url || '/images/asset13c-hero-mother-child.webp';
const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';

// Persian display names for BreadcrumbList structured data on interior pages.
const routeNames={
 '/courses':'دوره‌ها','/experience':'تجربه والدین','/licenses':'مجوزها','/education':'آموزش والدین',
 '/about':'درباره ما','/faq':'سؤالات متداول','/contact':'ارتباط با ما','/products':'محصولات','/privacy':'حریم خصوصی',
 '/form':'فرم مشاوره والدین','/consultation':'فرم مشاوره والدین',
};
const ldEscape=(s)=>s.replace(/</g,'\\u003c').replaceAll(String.fromCharCode(0x2028),'\\u2028').replaceAll(String.fromCharCode(0x2029),'\\u2029');
function breadcrumbLd(route){
 if(route==='/')return '';
 const json=ldEscape(JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
  {'@type':'ListItem','position':1,'name':'صفحه اصلی','item':`${siteUrl}/`},
  {'@type':'ListItem','position':2,'name':routeNames[route]||route.replace(/^\//,''),'item':`${siteUrl}${route}`},
 ]}));
 return `<script type="application/ld+json">${json}</script>\n`;
}

// Helmet-provided SEO tags (title, description, og/url, twitter, canonical) must
// REPLACE the template defaults — crawlers should see exactly one of each tag.
function stripTemplateHeadDupes(htmlStr, helmetHead){
 if(!helmetHead)return htmlStr;
 const kill=[];
 if(/<title[\s>]/i.test(helmetHead))kill.push(/<title>[\s\S]*?<\/title>/);
 if(/name="description"/.test(helmetHead))kill.push(/<meta name="description"[^>]*\/?>/);
 if(/property="og:title"/.test(helmetHead))kill.push(/<meta property="og:title"[^>]*\/?>/);
 if(/property="og:description"/.test(helmetHead))kill.push(/<meta property="og:description"[^>]*\/?>/);
 if(/property="og:url"/.test(helmetHead))kill.push(/<meta property="og:url"[^>]*\/?>/);
 if(/name="twitter:title"/.test(helmetHead))kill.push(/<meta name="twitter:title"[^>]*\/?>/);
 if(/name="twitter:description"/.test(helmetHead))kill.push(/<meta name="twitter:description"[^>]*\/?>/);
 if(/rel="canonical"/.test(helmetHead))kill.push(/<link rel="canonical"[^>]*\/?>/);
 for(const re of kill)htmlStr=htmlStr.replace(re,'');
 return htmlStr;
}

for(const route of routes){
 const result=await render(route,settings);
 let html=template.replace(/<div id="root"><\/div>/,`<div id="root" data-ssg="true">${result.body}</div>`);
 if (heroUrl && heroUrl !== '/images/asset13c-hero-mother-child.webp') {
   html = html.replace('/images/asset13c-hero-mother-child.webp', heroUrl);
 }
 html=stripTemplateHeadDupes(html, result.head);
 let extraHead = '';
 if (supabaseOrigin) {
   extraHead += `\n<link rel="preconnect" href="${supabaseOrigin}" crossorigin />\n<link rel="dns-prefetch" href="${supabaseOrigin}" />`;
 }
 html=html.replace('</head>',`${breadcrumbLd(route)}${result.head}${extraHead}
<script>window.__APP_SSG_SETTINGS__=${serialized};{const mode=window.__APP_SSG_SETTINGS__?.publicThemeMode;if(mode==='light'||mode==='dark'||mode==='auto')window.__zkApplyPublicMode?.(mode)}</script>
</head>`);
 const relative=route==='/'?'index.html':path.join(route.slice(1),'index.html');
 const output=path.join(dist,relative);
 await mkdir(path.dirname(output),{recursive:true});
 await writeFile(output,html);
}
await rm(path.resolve('.ssr'),{recursive:true,force:true});
console.log(`[ssg] Rendered ${routes.length} routes for ${brand}.`);
