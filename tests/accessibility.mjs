import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const routes=['/','/courses','/products','/faq','/education','/about','/contact','/privacy','/track','/profile','/admin/login','/not-found-a11y'];
const blocking=[];
for(const route of routes){
 const page=await browser.newPage();await page.setViewport({width:390,height:844});await page.setRequestInterception(true);
 page.on('request',request=>{const method=request.method();if(request.url().includes('.supabase.co')&&!['GET','HEAD','OPTIONS'].includes(method))request.abort();else request.continue()});
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});await new Promise(resolve=>setTimeout(resolve,route.includes('not-found')?3400:1400));
 let result;for(let attempt=0;attempt<2;attempt++){try{await page.waitForSelector('body',{timeout:5000});result=await new AxePuppeteer(page).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();break}catch(error){if(attempt===1)throw new Error(`${route}: ${String(error?.message||error)}`);await new Promise(resolve=>setTimeout(resolve,350));}}
 for(const violation of result.violations.filter(item=>item.impact==='critical'||item.impact==='serious'))blocking.push({route,id:violation.id,impact:violation.impact,nodes:violation.nodes.length,help:violation.help});
 await page.close();
}
await browser.close();
if(blocking.length){console.error(JSON.stringify(blocking,null,2));process.exit(1)}
console.log(`Accessibility smoke passed for ${routes.length} routes.`);
