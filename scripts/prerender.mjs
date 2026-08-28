import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { brand, routes, siteUrl } from './ssg-config.mjs';

const dist=path.resolve('dist');
const template=await readFile(path.join(dist,'index.html'),'utf8');
const serverEntry=pathToFileURL(path.resolve('.ssr/entry-server.js')).href;
const {render}=await import(serverEntry);
await writeFile(path.join(dist,'spa.html'),template);

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
for(const route of routes){
 const result=await render(route,settings);
 let html=template.replace(/<div id="root"><\/div>/,`<div id="root" data-ssg="true">${result.body}</div>`);
 html=html.replace('</head>',`${result.head}
<script>window.__APP_SSG_SETTINGS__=${serialized};window.__zkApplyPublicMode?.(window.__APP_SSG_SETTINGS__?.publicThemeMode)</script>
</head>`);
 const relative=route==='/'?'index.html':path.join(route.slice(1),'index.html');
 const output=path.join(dist,relative);
 await mkdir(path.dirname(output),{recursive:true});
 await writeFile(output,html);
}
await rm(path.resolve('.ssr'),{recursive:true,force:true});
console.log(`[ssg] Rendered ${routes.length} routes for ${brand}.`);
