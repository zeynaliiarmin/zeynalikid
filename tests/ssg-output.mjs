import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { routes, siteUrl } from '../scripts/ssg-config.mjs';

const failures=[];
for(const route of routes){
 const file=route==='/'?'dist/index.html':path.join('dist',route.slice(1),'index.html');
 const html=await readFile(file,'utf8');
 if(!html.includes('data-ssg="true"'))failures.push(`${route}: missing SSG marker`);
 const expected=`rel="canonical" href="${siteUrl}${route}"`;
 if(!html.includes(expected))failures.push(`${route}: canonical mismatch`);
 const canonicalCount=(html.match(/rel="canonical"/g)||[]).length;
 if(canonicalCount!==1)failures.push(`${route}: expected one canonical, got ${canonicalCount}`);
 if(!/<h1(?:\s|>)/i.test(html))failures.push(`${route}: missing rendered h1`);
 if(html.length<8000)failures.push(`${route}: rendered document unexpectedly small`);
}
const spa=await readFile('dist/spa.html','utf8');
if(spa.includes('data-ssg="true"'))failures.push('spa shell must not contain route-specific SSG markup');
if(!spa.includes('<div id="root"></div>'))failures.push('spa shell root is not empty');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`SSG output verified for ${routes.length} public routes plus the stateful SPA shell.`);
