import fs from 'node:fs';
import puppeteer from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const retiredDesign=['navy','stack'].join('');
const fixtures=[
 {design:'wellness',theme:'light'},
 {design:'wellness',theme:'wellness-dark'},
 {design:'kidlearn',theme:'light'},
 {design:'kidlearn',theme:'kidlearn-dark'},
 {design:'classic',theme:'light'},
 {design:'classic',theme:'classic-dark'},
 {design:'blend',theme:'light'},
 {design:'blend',theme:'blend-dark'},
];
let mockedMode='light';
let blockAppScript=false;
let settingsWrites=0;
let adminSettingsWrites=0;
let adminSavePayload=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;
// پالت تاریک اختصاصی هر دیزاین (design-A-warm → src/theme/warmPalettes.ts)
const DARK_PALETTE={
 'wellness-dark':{bg:'#0F1A19',surface:'#182422',primary:'#A855F7',text:'#ECE9F2',border:'#ffffff14'},
 'kidlearn-dark':{bg:'#0F1A19',surface:'#182422',primary:'#F87171',text:'#F0EAE2',border:'#ffffff14'},
 'blend-dark':{bg:'#0F1A19',surface:'#182422',primary:'#38BDF8',text:'#E6F2F1',border:'#ffffff14'},
 'classic-dark':{bg:'#0F1A19',surface:'#182422',primary:'#60A5FA',text:'#E3EDF7',border:'#ffffff14'},
};
const hexRgb=hex=>{const h=hex.replace('#','');return rgb(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16));};

function assert(condition,message,detail){if(!condition)throw new Error(`${message}${detail?`\n${JSON.stringify(detail,null,2)}`:''}`)}
async function setStorage(page,values){await page.evaluate(data=>{for(const [key,value] of Object.entries(data)){if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,String(value))}sessionStorage.clear()},values)}
async function waitForMode(page,mode){await page.waitForFunction(expected=>document.documentElement.dataset.publicTheme===expected,{timeout:15000},mode);await sleep(700)}
async function readFormState(page){return page.evaluate(()=>{
 const visible=el=>!!el&&el instanceof HTMLElement&&el.offsetParent!==null;
 const input=[...document.querySelectorAll('input:not([type="hidden"]),textarea,select')].find(visible);
 let form=input?.parentElement||null;
 while(form&&form.parentElement&&form.parentElement!==document.body){const s=getComputedStyle(form),r=form.getBoundingClientRect();if(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&r.width>330)break;form=form.parentElement}
 const submit=[...document.querySelectorAll('button')].reverse().find(el=>{if(!visible(el))return false;const r=el.getBoundingClientRect();return r.width>280&&r.height>=44});
 const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2)}:null};
 const style=el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,borderColor:s.borderColor,borderRadius:s.borderRadius,padding:s.padding}};
 const root=document.documentElement;
 return {
  path:location.pathname,mode:root.dataset.publicTheme||'',globalMode:root.dataset.publicThemeMode||'',source:root.dataset.colorModeSource||'',theme:root.dataset.theme||'',zkTheme:root.dataset.zkTheme||'',colorScheme:getComputedStyle(root).colorScheme,
  body:{background:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color},
  vars:{bg:getComputedStyle(document.body).getPropertyValue('--zk-bg').trim(),surface:getComputedStyle(document.body).getPropertyValue('--zk-surface').trim(),primary:getComputedStyle(document.body).getPropertyValue('--zk-primary').trim(),text:getComputedStyle(document.body).getPropertyValue('--zk-text').trim(),border:getComputedStyle(document.body).getPropertyValue('--zk-border').trim()},
  form:form?{rect:rect(form),...style(form)}:null,input:input?{rect:rect(input),...style(input)}:null,submit:submit?{rect:rect(submit),...style(submit)}:null,
 };
})}
const geometry=state=>({form:state.form&&{rect:state.form.rect,radius:state.form.borderRadius,padding:state.form.padding},input:state.input&&{rect:state.input.rect,radius:state.input.borderRadius,padding:state.input.padding},submit:state.submit&&{rect:state.submit.rect,radius:state.submit.borderRadius,padding:state.submit.padding}});
function assertMode(state,expected,label,source='global'){
 assert(state.mode===expected&&state.theme===expected&&state.colorScheme===expected,`${label}: colour mode was not resolved`,state);
 assert(state.source===source,`${label}: wrong precedence source`,state);
 assert(state.form&&state.input&&state.submit,`${label}: consultation controls were not rendered`,state);
 if(expected==='dark'){
  const pal=DARK_PALETTE[state.zkTheme];
  assert(pal,`${label}: dark mode did not select a dedicated design palette`,state);
  assert(state.vars.bg.toLowerCase()===pal.bg.toLowerCase()&&state.body.background===hexRgb(pal.bg)&&state.body.color===hexRgb(pal.text),`${label}: dedicated dark canvas mismatch`,{pal,state});
  assert(state.vars.surface.toLowerCase()===pal.surface.toLowerCase()&&state.vars.primary.toLowerCase()===pal.primary.toLowerCase()&&state.vars.text.toLowerCase()===pal.text.toLowerCase(),`${label}: dedicated dark variables mismatch`,{pal,vars:state.vars});
  assert(state.vars.border.toLowerCase().replace(/\s+/g,' ').trim()===pal.border,`${label}: dark border token mismatch`,state.vars);
  assert(state.vars.primary.toLowerCase()!=='#2dd4bf',`${label}: old shared teal dark palette leaked`,state.vars);
  assert(state.input.color===hexRgb(pal.text),`${label}: dark form field text mismatch`,state.input);
 }else{
  assert(!String(state.zkTheme).endsWith('-dark')&&state.input.background!==rgb(15,23,34),`${label}: dark colour leaked into resolved light mode`,state);
 }
}
async function openFixture(page,fixture,mode,hour=12,personal=null){
 mockedMode=mode;
 await setStorage(page,{'zk_design_system':fixture.design,'zk_theme':fixture.theme,'zk_personal_color_mode':personal,'zk_public_theme_mode':mode,'zkid_settings_v2':null,'zkid_settings_migrated_v2':null,'zkid_lang':'fa'});
 await page.goto(`${base}/form?test-hour=${hour}&design=${encodeURIComponent(fixture.design)}&theme=${fixture.theme}&mode=${mode}`,{waitUntil:'domcontentloaded',timeout:30000});
 const expected=personal||(mode==='dark'||(mode==='auto'&&(hour>=23||hour<7))?'dark':'light');
 await waitForMode(page,expected);return {expected,state:await readFormState(page)};
}

const index=fs.readFileSync('index.html','utf8'),prerender=fs.readFileSync('scripts/prerender.mjs','utf8'),app=fs.readFileSync('src/App.tsx','utf8'),support=fs.readFileSync('src/app/appSupport.tsx','utf8'),designUi=fs.readFileSync('src/admin/AdminPanel.tsx','utf8'),themeSource=fs.readFileSync('src/theme.ts','utf8');
assert(index.includes('__zkApplyPublicMode')&&index.includes('zk_personal_color_mode')&&index.includes('zk_public_theme_mode'),'Early precedence bootstrap is missing');
assert(prerender.includes("if(mode==='light'||mode==='dark'||mode==='auto')window.__zkApplyPublicMode?.(mode)"),'SSG does not safely apply its server-provided global mode before first paint');
assert(app.includes('resolveColorMode(personalColorMode,publicThemeMode'),'App does not resolve personal choice before global policy');
assert(app.includes("TH[`${activeDesign}-dark`]"),'Public dark mode does not resolve the selected design own dark palette');
assert(support.includes("...TH.wellness,...publicDarkPatch('wellness')")&&support.includes("...TH.kidlearn,...publicDarkPatch('kidlearn')")&&support.includes("...TH.blend,...publicDarkPatch('blend')")&&support.includes("...TH.classic,...publicDarkPatch('classic')"),'A design is missing its dedicated dark palette');
const palettesSource=fs.readFileSync('src/theme/warmPalettes.ts','utf8');
for(const [hex,label] of [['#0F1A19','unified dark canvas (all designs)'],['#182422','dark card surface'],['#ECE9F2','wellness dark ink'],['#F0EAE2','kidlearn dark ink'],['#C6A8EF','wellness dark title'],['#F0BFA1','kidlearn dark title']]) assert(palettesSource.includes(hex),`missing ${label} (${hex})`);
assert(![app,support,designUi,themeSource].join('\n').toLowerCase().includes(retiredDesign),'Retired design remains in active source or UI');

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
  if(blockAppScript&&(/\/src\/main\.tsx(?:\?|$)/.test(url)||/\/assets\/index-[^/]+\.js(?:\?|$)/.test(url)))return request.abort();
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(url.includes('/functions/v1/admin-api')){
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   let body={};try{body=JSON.parse(request.postData()||'{}')}catch{}
   if(body.action==='save_settings'){
    adminSettingsWrites++;
    adminSavePayload=body.settings||null;
    mockedMode=adminSavePayload?.publicThemeMode||mockedMode;
    return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({saved:true,blockedFields:[]})});
   }
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({ok:true,submissions:[],questions:[],reviews:[],devices:[],logs:[],total:0,page:1,limit:50})});
  }
  if(url.includes('/functions/v1/public-settings')){
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   if(request.method()!=='GET')settingsWrites++;
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({settings:{publicThemeMode:mockedMode}})});
  }
  if(url.includes('/functions/v1/assistant-public')){
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(url.includes('status=1')?{enabled:false,revision:0,updated_at:''}:{knowledge:[],settings:{enabled:false}})});
  }
  request.continue();
 });
 await page.goto(`${base}/?test-hour=12&setup=1`,{waitUntil:'domcontentloaded',timeout:30000});await sleep(250);

 // Every active design keeps dimensions/radii while consuming one restored dark colour layer.
 for(const fixture of fixtures){
  const light=await openFixture(page,fixture,'light');assertMode(light.state,'light',`light ${fixture.design}/${fixture.theme}`);
  const dark=await openFixture(page,fixture,'dark');assertMode(dark.state,'dark',`dark ${fixture.design}/${fixture.theme}`);
  assert(JSON.stringify(geometry(light.state))===JSON.stringify(geometry(dark.state)),`Geometry changed between modes for ${fixture.design}/${fixture.theme}`,{light:geometry(light.state),dark:geometry(dark.state)});
  if(fixture.legacy){const stored=await page.evaluate(()=>localStorage.getItem('zk_design_system'));assert(stored===retiredDesign,'Runtime compatibility mutated the stored legacy value',{stored});}
 }
 assert(settingsWrites===0,'Runtime compatibility attempted to mutate production settings',{settingsWrites});

 // Global automatic boundaries survive SPA navigation and refresh when no personal choice exists.
 for(const [hour,expected] of [[0,'dark'],[6,'dark'],[7,'light'],[22,'light'],[23,'dark']]){
  const opened=await openFixture(page,fixtures[0],'auto',hour);assert(opened.expected===expected,`Bad auto fixture at ${hour}`);assertMode(opened.state,expected,`auto initial ${hour}`);
  await page.evaluate(()=>{history.pushState(null,'','/faq'+location.search);window.dispatchEvent(new PopStateEvent('popstate'))});
  await page.waitForFunction(mode=>location.pathname==='/faq'&&document.documentElement.dataset.publicTheme===mode,{timeout:10000},expected);
  const navigated=await page.evaluate(()=>({path:location.pathname,mode:document.documentElement.dataset.publicTheme}));
  assert(navigated.path==='/faq'&&navigated.mode===expected,`Auto mode changed during navigation at ${hour}`,navigated);
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,expected);
  const refreshed=await page.evaluate(()=>({path:location.pathname,mode:document.documentElement.dataset.publicTheme,source:document.documentElement.dataset.colorModeSource}));
  assert(refreshed.path==='/faq'&&refreshed.mode===expected&&refreshed.source==='global',`Auto mode changed after refresh at ${hour}`,refreshed);
 }

 // A newer saved server policy refreshes the cache for browsers without a personal choice.
 mockedMode='dark';await setStorage(page,{'zk_personal_color_mode':null,'zk_public_theme_mode':'light','zkid_settings_v2':null});
 await page.goto(`${base}/form?test-hour=12&remote-refresh=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'dark');assertMode(await readFormState(page),'dark','remote refresh');

 // Personal dark/light always wins over the opposite global policy, including refresh/navigation.
 for(const [personal,global] of [['dark','light'],['light','dark']]){
  const opened=await openFixture(page,fixtures[0],global,12,personal);assertMode(opened.state,personal,`personal ${personal} over ${global}`,'personal');
  await page.evaluate(()=>{history.pushState(null,'','/faq'+location.search);window.dispatchEvent(new PopStateEvent('popstate'))});
  await page.waitForFunction(mode=>document.documentElement.dataset.publicTheme===mode,{},personal);
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,personal);
  const persisted=await page.evaluate(()=>({mode:document.documentElement.dataset.publicTheme,stored:localStorage.getItem('zk_personal_color_mode')}));
  assert(persisted.mode===personal&&persisted.stored===personal,`Personal ${personal} did not persist`,persisted);
 }

 // The inline bootstrap applies both global policy and personal precedence before React loads.
 await setStorage(page,{'zk_personal_color_mode':null,'zk_public_theme_mode':'dark'});blockAppScript=true;
 await page.goto(`${base}/?test-hour=12&bootstrap-only=1`,{waitUntil:'domcontentloaded',timeout:30000});
 let early=await page.evaluate(()=>({mode:document.documentElement.dataset.publicTheme,source:document.documentElement.dataset.colorModeSource,rootBackground:document.documentElement.style.backgroundColor,bodyPublic:document.body.classList.contains('public-root')}));
 assert(early.mode==='dark'&&early.source==='global'&&early.rootBackground===rgb(15,23,34)&&early.bodyPublic,'Global dark mode was not resolved before the app bundle',early);
 await setStorage(page,{'zk_personal_color_mode':'light','zk_public_theme_mode':'dark'});
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 early=await page.evaluate(()=>({mode:document.documentElement.dataset.publicTheme,source:document.documentElement.dataset.colorModeSource}));
 assert(early.mode==='light'&&early.source==='personal','Personal light mode did not win in the early bootstrap',early);blockAppScript=false;

 // The real admin header toggle persists locally, controls admin, then controls public pages.
 await page.goto(`${base}/?test-hour=12&restore=1`,{waitUntil:'domcontentloaded',timeout:30000});await sleep(250);
 mockedMode='light';
 await setStorage(page,{'zk_personal_color_mode':'light','zk_theme':'classic','zk_public_theme_mode':'light','zk_admin_authed':'true','zk_admin_session_token':'test-session','zk_admin_login_at':String(Date.now())});
 await page.evaluate(()=>localStorage.setItem('zk_admin_login_at',String(Date.now())));
 await page.goto(`${base}/admin/app?test-hour=12`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('.zkth-toggle',{timeout:20000});
 await page.waitForFunction(()=>!document.querySelector('.zk-launch'),{timeout:20000});
 await page.click('.zkth-toggle');
 await page.waitForFunction(()=>localStorage.getItem('zk_personal_color_mode')==='dark'&&document.documentElement.dataset.theme==='dark'&&document.documentElement.dataset.zkTheme==='admin-dark');
 let admin=await page.evaluate(()=>({publicTheme:document.documentElement.dataset.publicTheme||'',stored:localStorage.getItem('zk_personal_color_mode'),theme:document.documentElement.dataset.theme,zkTheme:document.documentElement.dataset.zkTheme}));
 assert(!admin.publicTheme&&admin.stored==='dark'&&admin.theme==='dark'&&admin.zkTheme==='admin-dark','Admin header toggle did not persist personal dark',admin);
 await page.goto(`${base}/form?test-hour=12&from-admin=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'dark');assertMode(await readFormState(page),'dark','admin choice on public page','personal');

 mockedMode='dark';
 await page.goto(`${base}/admin/app?test-hour=12&toggle-light=1`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.zkth-toggle');await page.waitForFunction(()=>!document.querySelector('.zk-launch'),{timeout:20000});await page.click('.zkth-toggle');
 await page.waitForFunction(()=>localStorage.getItem('zk_personal_color_mode')==='light'&&document.documentElement.dataset.theme==='light');
 await page.goto(`${base}/form?test-hour=12&from-admin=2`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'light');assertMode(await readFormState(page),'light','admin light over global dark','personal');

 // The design-page selector has the required three global policies and saves only through the explicit settings action.
 await page.goto(`${base}/admin/app?global-save-test=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('.admin-main',{timeout:20000});await page.waitForFunction(()=>!document.querySelector('.zk-launch'),{timeout:20000});
 const openedSettings=await page.evaluate(()=>{const item=[...document.querySelectorAll('.zkad-nav-main')].find(node=>(node.textContent||'').trim()==='تنظیمات');if(!item)return false;item.click();return true});
 assert(openedSettings,'Settings navigation was not available');await sleep(150);
 const openedDesign=await page.evaluate(()=>{const item=[...document.querySelectorAll('.zkad-subitem')].find(node=>(node.textContent||'').trim()==='مدیریت دیزاین');if(!item)return false;item.click();return true});
 assert(openedDesign,'Design navigation was not available');
 await page.waitForFunction(()=>[...document.querySelectorAll('select')].some(select=>[...select.options].some(option=>option.value==='auto')),{timeout:20000});
 const globalOptions=await page.evaluate(()=>{
  const select=[...document.querySelectorAll('select')].find(item=>['dark','light','auto'].every(value=>[...item.options].some(option=>option.value===value)));
  if(!select)return null;
  const options=[...select.options].map(option=>({value:option.value,text:(option.textContent||'').trim()})).filter(option=>['dark','light','auto'].includes(option.value));
  select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}));
  return options;
 });
 assert(JSON.stringify(globalOptions)===JSON.stringify([{value:'dark',text:'همیشه دارک'},{value:'light',text:'همیشه وایت'},{value:'auto',text:'سفارشی بر اساس ساعت — دارک از ۲۳ تا ۰۷'}]),'Global design selector options do not match the required contract',globalOptions);
 let beforeSave=await page.evaluate(()=>localStorage.getItem('zk_personal_color_mode'));
 assert(beforeSave==='light'&&adminSettingsWrites===0,'Changing the global selector altered personal preference or saved before confirmation',{beforeSave,adminSettingsWrites});
 await page.click('button[aria-label="منوی سریع"]');
 const clickedSave=await page.evaluate(()=>{const button=[...document.querySelectorAll('button')].find(item=>(item.textContent||'').trim()==='ذخیره تنظیمات');if(!button)return false;button.click();return true});
 assert(clickedSave,'Explicit global settings save action was not available');
 await page.waitForFunction(()=>document.body.textContent?.includes('ذخیره شد'),{timeout:15000});
 assert(adminSettingsWrites===1&&adminSavePayload?.publicThemeMode==='dark','Saved settings did not contain the selected global dark policy',{adminSettingsWrites,mode:adminSavePayload?.publicThemeMode});
 const afterSave=await page.evaluate(()=>localStorage.getItem('zk_personal_color_mode'));
 assert(afterSave==='light','Saving global policy mutated the personal preference',{afterSave});
 await page.goto(`${base}/form?test-hour=12&saved-global-with-personal=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'light');assertMode(await readFormState(page),'light','saved global dark with personal light','personal');
 await setStorage(page,{'zk_personal_color_mode':null});
 await page.goto(`${base}/form?test-hour=12&saved-global-without-personal=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitForMode(page,'dark');assertMode(await readFormState(page),'dark','saved global dark without personal choice','global');

 console.log('Personal persistence and precedence, global light/dark/auto save, dedicated per-design dark palettes, navigation, refresh, early bootstrap, admin toggle, and runtime-only legacy mapping passed.');
}finally{await browser.close()}
