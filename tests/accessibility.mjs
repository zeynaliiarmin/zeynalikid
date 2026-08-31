import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const launchOptions={headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']};
const routes=['/education','/','/courses','/products','/consultation','/child-info','/faq','/about','/contact','/privacy','/track','/profile','/admin/login','/not-found-a11y'];
const modes=(process.env.A11Y_MODES||'light').split(',').map(m=>m.trim()).filter(Boolean);
const blocking=[];
for(const mode of modes)for(const route of routes){
 const browser=await puppeteer.launch(launchOptions);const page=await browser.newPage();await page.setBypassServiceWorker(true);await page.evaluateOnNewDocument((m,d)=>{try{localStorage.setItem('zk_public_theme_mode',m);if(m!=='auto')localStorage.setItem('zk_personal_color_mode',m);if(d)localStorage.setItem('zk_design_system',d)}catch{}},mode,process.env.A11Y_DESIGN||'');await page.setViewport({width:390,height:844});
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});await new Promise(resolve=>setTimeout(resolve,route.includes('not-found')?3400:1400));
 let result;for(let attempt=0;attempt<4;attempt++){try{await page.waitForFunction(()=>document.readyState==='complete',{timeout:10000});result=await new AxePuppeteer(page).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();break}catch(error){if(attempt===3)throw new Error(`${route}: ${String(error?.message||error)}`);await page.reload({waitUntil:'domcontentloaded',timeout:30000});await new Promise(resolve=>setTimeout(resolve,900));}}
 for(const violation of result.violations.filter(item=>item.impact==='critical'||item.impact==='serious'))blocking.push({route,mode,design:process.env.A11Y_DESIGN||'default',id:violation.id,impact:violation.impact,nodes:violation.nodes.length,help:violation.help,targets:violation.nodes.slice(0,6).map(node=>({target:(node.target||[]).join(' '),html:String(node.html||'').slice(0,220)}))});
 await browser.close();
}
if(blocking.length){console.error(JSON.stringify(blocking,null,2));process.exit(1)}
console.log(`Accessibility smoke passed for ${routes.length} routes × ${modes.length} colour mode(s): ${modes.join(', ')}.`);
