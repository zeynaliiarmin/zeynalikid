import fs from 'node:fs';
import puppeteer from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const fixtures=[
 {design:'wellness',theme:'light'},
 {design:'kidlearn',theme:'light'},
 {design:'navystack',theme:'light'},
 {design:'classic',theme:'light'},
 {design:'classic',theme:'cream'},
 {design:'classic',theme:'ocean'},
 {design:'classic',theme:'dark'},
 {design:'classic',theme:'motherly-trust'},
 {design:'classic',theme:'blend'},
 {design:'blend',theme:'cream'},
 {design:'blend',theme:'dark'},
];
let mockedMode='light';
let blockAppScript=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;

function assert(condition,message,detail){if(!condition)throw new Error(`${message}${detail?`\n${JSON.stringify(detail,null,2)}`:''}`)}
async function setStorage(page,values){await page.evaluate(data=>{for(const [key,value] of Object.entries(data)){if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,String(value))}sessionStorage.clear()},values)}
async function waitForMode(page,mode){await page.waitForFunction(expected=>document.documentElement.dataset.publicTheme===expected,{timeout:15000},mode);await sleep(900)}
async function readFormState(page){return page.evaluate(()=>{
 const visible=el=>!!el&&el instanceof HTMLElement&&el.offsetParent!==null;
 const input=[...document.querySelectorAll('input:not([type="hidden"]),textarea,select')].find(visible);
 let form=input?.parentElement||null;
 while(form&&form.parentElement&&form.parentElement!==document.body){const s=getComputedStyle(form),r=form.getBoundingClientRect();if(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&r.width>330)break;form=form.parentElement}
 const submit=[...document.querySelectorAll('button')].reverse().find(el=>{if(!visible(el))return false;const r=el.getBoundingClientRect();return r.width>280&&r.height>=44});
 const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2)}:null};
 const style=el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,borderColor:s.borderColor,borderRadius:s.borderRadius,padding:s.padding}};
 return {
  path:location.pathname,mode:document.documentElement.dataset.publicTheme||'',theme:document.documentElement.dataset.theme||'',zkTheme:document.documentElement.dataset.zkTheme||'',colorScheme:getComputedStyle(document.documentElement).colorScheme,
  body:{background:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color},
  vars:{bg:getComputedStyle(document.body).getPropertyValue('--zk-bg').trim(),surface:getComputedStyle(document.body).getPropertyValue('--zk-surface').trim(),primary:getComputedStyle(document.body).getPropertyValue('--zk-primary').trim(),text:getComputedStyle(document.body).getPropertyValue('--zk-text').trim(),border:getComputedStyle(document.body).getPropertyValue('--zk-border').trim()},
  form:form?{rect:rect(form),...style(form)}:null,input:input?{rect:rect(input),...style(input)}:null,submit:submit?{rect:rect(submit),...style(submit)}:null,
 };
})}
const geometry=state=>({form:state.form&&{rect:state.form.rect,radius:state.form.borderRadius,padding:state.form.padding},input:state.input&&{rect:state.input.rect,radius:state.input.borderRadius,padding:state.input.padding},submit:state.submit&&{rect:state.submit.rect,radius:state.submit.borderRadius,padding:state.submit.padding}});
function assertMode(state,expected,label){
 assert(state.mode===expected&&state.theme===expected&&state.colorScheme===expected,`${label}: theme was not resolved`,state);
 assert(state.form&&state.input&&state.submit,`${label}: consultation controls were not rendered`,state);
 if(expected==='dark'){
  assert(state.body.background===rgb(10,14,39)&&state.body.color===rgb(226,232,240),`${label}: shared NavyStack canvas mismatch`,state);
  assert(state.vars.bg.toLowerCase()==='#0a0e27'&&state.vars.surface.toLowerCase()==='#111638'&&state.vars.primary.toLowerCase()==='#00d4ff'&&state.vars.text.toLowerCase()==='#e2e8f0',`${label}: shared dark variables mismatch`,state);
  assert(state.input.background===rgb(10,14,39)&&state.input.color===rgb(226,232,240),`${label}: dark form field mismatch`,state);
 }else{
  assert(state.body.background!==rgb(10,14,39)&&state.input.background!==rgb(10,14,39),`${label}: dark colour leaked into forced light mode`,state);
 }
}
async function openFixture(page,fixture,mode,hour=12){
 mockedMode=mode;
 await setStorage(page,{'zk_design_system':fixture.design,'zk_theme':fixture.theme,'zk_public_theme_mode':mode,'zkid_settings_v2':null,'zkid_settings_migrated_v2':null,'zkid_lang':'fa'});
 await page.goto(`${base}/form?test-hour=${hour}&design=${fixture.design}&theme=${fixture.theme}&mode=${mode}`,{waitUntil:'domcontentloaded',timeout:30000});
 const expected=mode==='dark'||(mode==='auto'&&(hour>=23||hour<7))?'dark':'light';
 await waitForMode(page,expected);return {expected,state:await readFormState(page)};
}

const index=fs.readFileSync('index.html','utf8'),prerender=fs.readFileSync('scripts/prerender.mjs','utf8'),app=fs.readFileSync('src/App.tsx','utf8'),support=fs.readFileSync('src/app/appSupport.tsx','utf8');
assert(index.includes('__zkApplyPublicMode')&&index.includes("zk_public_theme_mode"),'Early public theme bootstrap is missing');
assert(prerender.includes("window.__zkApplyPublicMode?.(window.__APP_SSG_SETTINGS__?.publicThemeMode)"),'SSG does not apply its server-provided mode before first paint');
assert(app.includes('({...publicLightTheme,...PUBLIC_DARK_COLORS})'),'Public dark colours are not layered over the selected design geometry');
assert(support.includes('export const PUBLIC_DARK_COLORS'),'Shared public dark palette is missing');

const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.setBypassServiceWorker(true);await page.setCacheEnabled(false);
 await page.evaluateOnNewDocument(()=>{
  const NativeDate=Date;
  const hour=Number(new URLSearchParams(location.search).get('test-hour')||12);
  const fixed=new NativeDate(2026,7,28,hour,0,0,0).getTime();
  class TestDate extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
  Object.defineProperty(window,'Date',{value:TestDate});
 });
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=request.url();
  if(blockAppScript&&/\/src\/main\.tsx(?:\?|$)/.test(url))return request.abort();
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(url.includes('/functions/v1/public-settings')){
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({settings:{publicThemeMode:mockedMode}})});
  }
  if(url.includes('/functions/v1/assistant-public')){
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(url.includes('status=1')?{enabled:false,revision:0,updated_at:''}:{knowledge:[],settings:{enabled:false}})});
  }
  request.continue();
 });
 await page.goto(`${base}/?test-hour=12&setup=1`,{waitUntil:'domcontentloaded',timeout:30000});await sleep(250);

 // Every visual design keeps its own dimensions/radii while consuming one dark colour layer.
 for(const fixture of fixtures){
  const light=await openFixture(page,fixture,'light');assertMode(light.state,'light',`light ${fixture.design}/${fixture.theme}`);
  const dark=await openFixture(page,fixture,'dark');assertMode(dark.state,'dark',`dark ${fixture.design}/${fixture.theme}`);
  assert(JSON.stringify(geometry(light.state))===JSON.stringify(geometry(dark.state)),`Geometry changed between modes for ${fixture.design}/${fixture.theme}`,{light:geometry(light.state),dark:geometry(dark.state)});
 }

 // Automatic boundaries, SPA navigation and refresh all keep the resolved mode.
 for(const [hour,expected] of [[0,'dark'],[6,'dark'],[7,'light'],[22,'light'],[23,'dark']]){
  const opened=await openFixture(page,fixtures[0],'auto',hour);assert(opened.expected===expected,`Bad auto fixture at ${hour}`);assertMode(opened.state,expected,`auto initial ${hour}`);
  await page.evaluate(()=>{history.pushState(null,'','/faq'+location.search);window.dispatchEvent(new PopStateEvent('popstate'))});
  await page.waitForFunction(mode=>location.pathname==='/faq'&&document.documentElement.dataset.publicTheme===mode,{timeout:10000},expected);
  const navigated=await page.evaluate(()=>({path:location.pathname,mode:document.documentElement.dataset.publicTheme}));
  assert(navigated.path==='/faq'&&navigated.mode===expected,`Auto mode changed during navigation at ${hour}`,navigated);
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,expected);
  const refreshed=await page.evaluate(()=>({path:location.pathname,mode:document.documentElement.dataset.publicTheme}));
  assert(refreshed.path==='/faq'&&refreshed.mode===expected,`Auto mode changed after refresh at ${hour}`,refreshed);
 }

 // A newer server setting wins over a stale cached preference after refresh.
 mockedMode='dark';await setStorage(page,{'zk_public_theme_mode':'light','zkid_settings_v2':null});
 await page.goto(`${base}/form?test-hour=12&remote-refresh=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'dark');assertMode(await readFormState(page),'dark','remote refresh');

 // The tiny inline bootstrap resolves a cached mode even if the React bundle has not loaded yet.
 await setStorage(page,{'zk_public_theme_mode':'dark'});blockAppScript=true;
 await page.goto(`${base}/?test-hour=12&bootstrap-only=1`,{waitUntil:'domcontentloaded',timeout:30000});
 const early=await page.evaluate(()=>({mode:document.documentElement.dataset.publicTheme,theme:document.documentElement.dataset.theme,rootBackground:document.documentElement.style.backgroundColor,bodyPublic:document.body.classList.contains('public-root')}));
 assert(early.mode==='dark'&&early.theme==='dark'&&early.rootBackground==='rgb(10, 14, 39)'&&early.bodyPublic,'Dark mode was not resolved before the app bundle',early);blockAppScript=false;

 // Public mode cannot leak into either admin mode.
 await page.goto(`${base}/?test-hour=12&restore=1`,{waitUntil:'domcontentloaded',timeout:30000});await sleep(250);
 for(const adminMode of ['light','dark']){
  await setStorage(page,{'zk_public_theme_mode':'dark','zk_theme':adminMode});
  await page.goto(`${base}/admin/login?test-hour=12&admin=${adminMode}`,{waitUntil:'domcontentloaded',timeout:30000});await sleep(950);
  const admin=await page.evaluate(()=>({publicTheme:document.documentElement.dataset.publicTheme||'',theme:document.documentElement.dataset.theme||'',zkTheme:document.documentElement.dataset.zkTheme||'',body:getComputedStyle(document.body).backgroundColor}));
  assert(!admin.publicTheme&&admin.theme===adminMode&&admin.zkTheme===(adminMode==='dark'?'navystack':'admin-light'),`Public mode leaked into admin ${adminMode}`,admin);
 }
 console.log('Public light/dark/auto modes preserve design geometry, share one NavyStack dark palette, survive navigation and refresh, and remain isolated from admin modes.');
}finally{await browser.close()}
