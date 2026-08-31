import fs from 'node:fs';
import puppeteer from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const brand='زینالیکید';
const viewports=[
 {width:280,height:320},{width:320,height:480},{width:390,height:844},{width:430,height:932},{width:1366,height:768},
];
const designs=[
 {design:'wellness',theme:'light'},
 {design:'wellness',theme:'wellness-dark'},
 {design:'kidlearn',theme:'light'},
 {design:'kidlearn',theme:'kidlearn-dark'},
 {design:'classic',theme:'light'},
 {design:'classic',theme:'classic-dark'},
 {design:'blend',theme:'light'},
 {design:'blend',theme:'blend-dark'},
];
const labels=['درخواست مشاوره','معرفی دوره‌ها','تجربه والدین','مجوزها و نمادها','مقالات آموزشی','ارتباط با ما و پشتیبانی'];
const paths=['/consultation','/courses','/experience','/licenses','/education','/contact'];
let mockedMode='light';
let blockSettingsFetch=false;

const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;
const normalize=value=>String(value||'').replaceAll(' ','').toLowerCase();
// پالت تاریک اختصاصی هر دیزاین (design-A-warm → src/theme/warmPalettes.ts)
const DARK_DESIGN={
 wellness:{bg:'#0F1A19',surface:'#121C1A',text:'#ECE9F2',muted:'#A6B8B2',accent:'#A855F7'},
 kidlearn:{bg:'#0F1A19',surface:'#121C1A',text:'#F0EAE2',muted:'#A6B8B2',accent:'#F87171'},
 blend:{bg:'#0F1A19',surface:'#121C1A',text:'#E6F2F1',muted:'#A6B8B2',accent:'#38BDF8'},
 classic:{bg:'#0F1A19',surface:'#121C1A',text:'#E3EDF7',muted:'#A6B8B2',accent:'#60A5FA'},
};
const brandDefaultDesign='wellness';
const hexRgb=hex=>{const h=String(hex).replace('#','');return rgb(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16));};

async function readLayout(page,{react}){
 return page.evaluate(isReact=>{
  const prefix=isReact?'.zk-nf':'.nf';
  const q=selector=>document.querySelector(selector);
  const pageEl=q(`${prefix}-page`),shell=q(`${prefix}-shell`),grid=q(isReact?'.zk-nf-shortcuts':'.quick');
  const cards=[...document.querySelectorAll(isReact?'.zk-nf-shortcut':'.nf-shortcut')];
  const primary=q(isReact?'.zk-nf-primary':'.primary'),brandEl=q(isReact?'.zk-nf-brand':'.brand');
  const pageRect=pageEl.getBoundingClientRect(),shellRect=shell.getBoundingClientRect();
  const style=getComputedStyle(pageEl),shellStyle=getComputedStyle(shell),primaryStyle=getComputedStyle(primary);
  return {
   htmlTheme:document.documentElement.dataset.theme||'',publicMode:document.documentElement.dataset.publicThemeMode||'',source:document.documentElement.dataset.colorModeSource||'',
   nfMode:isReact?pageEl.dataset.nfMode:document.documentElement.dataset.theme,
   nfTheme:isReact?pageEl.dataset.nfTheme:'static',colorScheme:style.colorScheme,
   pageWidth:pageRect.width,pageHeight:pageRect.height,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
   overflowPage:style.overflowY,overflowHtml:getComputedStyle(document.documentElement).overflowY,overflowBody:getComputedStyle(document.body).overflowY,
   shellWidth:shellRect.width,shellRadius:shellStyle.borderRadius,shellBg:shellStyle.backgroundColor,pageBg:style.backgroundImage||style.backgroundColor,
   columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
   labels:cards.map(card=>card.querySelector('strong')?.textContent),hrefs:cards.map(card=>card.getAttribute('href')),
   brand:brandEl.querySelector('span')?.textContent,primaryBg:primaryStyle.backgroundColor,primaryImage:primaryStyle.backgroundImage,primaryColor:primaryStyle.color,
   textColor:getComputedStyle(q(isReact?'.zk-nf-question':'.question')).color,mutedColor:getComputedStyle(q(isReact?'.zk-nf-copy p':'.copy p')).color,
   vars:isReact?{
    page:pageEl.style.getPropertyValue('--nf-page-bg').trim(),surface:pageEl.style.getPropertyValue('--nf-surface').trim(),
    text:pageEl.style.getPropertyValue('--nf-text').trim(),accent:pageEl.style.getPropertyValue('--nf-accent').trim(),
   }:null,
  };
 },react);
}

function assertGeometry(state,viewport,kind){
 const where=`${kind} ${viewport.width}x${viewport.height}`;
 if(Math.abs(state.pageWidth-viewport.width)>1||state.pageHeight<viewport.height-1)throw new Error(`${where}: page does not cover viewport ${JSON.stringify(state)}`);
 if(state.scrollWidth>viewport.width+1)throw new Error(`${where}: horizontal overflow ${JSON.stringify(state)}`);
 if(state.overflowPage!=='auto'||state.overflowHtml!=='auto'||state.overflowBody!=='auto')throw new Error(`${where}: natural scrolling was lost ${JSON.stringify(state)}`);
 if(state.shellWidth>416.5||state.shellWidth>viewport.width-19||state.shellRadius!=='38px')throw new Error(`${where}: shell geometry changed ${JSON.stringify(state)}`);
 if(state.columns!==2||JSON.stringify(state.labels)!==JSON.stringify(labels)||JSON.stringify(state.hrefs)!==JSON.stringify(paths))throw new Error(`${where}: shortcuts changed ${JSON.stringify(state)}`);
 if(state.brand!==brand)throw new Error(`${where}: wrong brand ${state.brand}`);
}

function assertMode(state,mode,kind,design=brandDefaultDesign){
 if(state.htmlTheme!==mode||state.nfMode!==mode||state.colorScheme!==mode)throw new Error(`${kind}: unresolved ${mode} mode ${JSON.stringify(state)}`);
 if(mode==='dark'){
  const p=DARK_DESIGN[design];
  if(!p)throw new Error(`${kind}: no dedicated dark palette expectation for design ${design}`);
  if(state.shellBg!==hexRgb(p.surface)||state.textColor!==hexRgb(p.text)||state.mutedColor!==hexRgb(p.muted))throw new Error(`${kind}: ${design} dedicated dark surfaces mismatch ${JSON.stringify(state)}`);
  if(state.primaryColor!==hexRgb('#12101C'))throw new Error(`${kind}: dark primary label is not the readable dark ink ${JSON.stringify(state)}`);
  const vars=state.vars||{};
  if(Object.keys(vars).length&&(normalize(vars.page)!==normalize(p.bg)||normalize(vars.text)!==normalize(p.text)||normalize(vars.accent)!==normalize(p.accent)))throw new Error(`${kind}: dark design variables mismatch ${JSON.stringify({want:p,got:vars})}`);
 }else if(state.shellBg===hexRgb('#1D1627')||state.textColor===hexRgb('#F2EAFC')||state.textColor===hexRgb('#FBE9E4')){
  throw new Error(`${kind}: a dark surface leaked into light mode ${JSON.stringify(state)}`);
 }
}

async function setStorage(page,values){
 await page.evaluate(data=>{
  for(const [key,value] of Object.entries(data)){if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,String(value))}
  sessionStorage.removeItem('zk_public_settings_cache_v1');
 },values);
}

async function openReact404(page,{mode,design='wellness',theme='light',hour=12,path='/client-side-404',personal=null}){
 mockedMode=mode;blockSettingsFetch=false;
 await page.goto(`${base}/?test-hour=${hour}`,{waitUntil:'domcontentloaded',timeout:30000});
 await setStorage(page,{'zk_design_system':design,'zk_theme':theme,'zk_personal_color_mode':personal,'zkid_settings_v2':null,'zk_public_theme_mode':mode});
 await page.reload({waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(next=>{history.pushState(null,'',next);window.dispatchEvent(new PopStateEvent('popstate'))},`${path}?test-hour=${hour}`);
 const resolved=personal||(mode==='dark'||(mode==='auto'&&(hour>=23||hour<7))?'dark':'light');
 await page.waitForSelector('.zk-nf-shell',{timeout:20000});
 await page.waitForFunction(expected=>document.querySelector('.zk-nf-page')?.dataset.nfMode===expected,{timeout:20000},resolved);
 return resolved;
}

const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const page=await browser.newPage();
 await page.setBypassServiceWorker(true);await page.setCacheEnabled(false);
 await page.evaluateOnNewDocument(()=>{
  const NativeDate=Date;const params=new URLSearchParams(location.search);const hour=Number(params.get('test-hour')||12);const fixed=new NativeDate(2026,7,28,hour,0,0,0).getTime();
  class TestDate extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
  Object.defineProperty(window,'Date',{value:TestDate});
 });
 await page.setRequestInterception(true);
 page.on('request',request=>{
  if(request.url().includes('/functions/v1/public-settings')){
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers,body:''});
   if(blockSettingsFetch)return request.respond({status:503,headers,contentType:'application/json',body:'{}'});
   return request.respond({status:200,headers,contentType:'application/json',body:JSON.stringify({settings:{publicThemeMode:mockedMode}})});
  }
  return request.continue();
 });

 // Static/server fallback: light, dark, remote refresh, and time-based automatic mode.
 for(const mode of ['light','dark']){
  mockedMode=mode;blockSettingsFetch=false;
  for(const viewport of viewports){
   await page.setViewport({...viewport,deviceScaleFactor:1});
   await page.goto(`${base}/404.html?test-hour=12&mode=${mode}&v=${viewport.width}`,{waitUntil:'domcontentloaded',timeout:30000});
   await setStorage(page,{'zk_personal_color_mode':null,'zk_public_theme_mode':mode});await page.reload({waitUntil:'networkidle0',timeout:30000});
   await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,{timeout:10000},mode);
   const state=await readLayout(page,{react:false});assertGeometry(state,viewport,`static ${mode}`);assertMode(state,mode,`static ${mode}`);
  }
 }
 mockedMode='dark';blockSettingsFetch=false;await setStorage(page,{'zk_personal_color_mode':null,'zk_public_theme_mode':'light'});
 await page.goto(`${base}/404.html?remote-mode=dark&test-hour=12`,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>document.documentElement.dataset.publicThemeMode==='dark'&&document.documentElement.dataset.theme==='dark');
 mockedMode='auto';blockSettingsFetch=true;await setStorage(page,{'zk_personal_color_mode':null,'zk_public_theme_mode':'auto'});
 for(const [hour,expected] of [[12,'light'],[23,'dark']]){
  await page.goto(`${base}/404.html?test-hour=${hour}&auto=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,{},expected);assertMode(await readLayout(page,{react:false}),expected,`static auto ${hour}`);
 }
 blockSettingsFetch=false;

 // Static 404 also gives a persistent personal choice precedence over the opposite global policy.
 for(const [personal,global] of [['dark','light'],['light','dark']]){
  mockedMode=global;blockSettingsFetch=false;await setStorage(page,{'zk_personal_color_mode':personal,'zk_public_theme_mode':global});
  await page.goto(`${base}/404.html?test-hour=12&personal=${personal}`,{waitUntil:'networkidle0'});
  const state=await readLayout(page,{react:false});assertMode(state,personal,`static personal ${personal}`);
  if(state.source!=='personal')throw new Error(`Static personal precedence source mismatch: ${JSON.stringify(state)}`);
 }
 await setStorage(page,{'zk_personal_color_mode':null});

 const gen404Script=fs.readFileSync('scripts/generate-404.mjs','utf8'),paletteSource=fs.readFileSync('src/theme/warmPalettes.ts','utf8'),staticHtml=fs.readFileSync('public/404.html','utf8');
for(const [design,p] of Object.entries(DARK_DESIGN)){
 for(const [name,hex] of Object.entries({canvas:p.bg,text:p.text,muted:p.muted,accent:p.accent})){
  if(!gen404Script.includes(hex)||!paletteSource.toLowerCase().includes(hex.toLowerCase()))throw new Error(`static 404 ${design} ${name} palette drifted from src/theme/warmPalettes.ts (${hex})`);
  if(design===brandDefaultDesign&&!normalize(staticHtml).includes(normalize(hex)))throw new Error(`static 404 html lacks the ${design} dark ${name} colour (${hex})`);
 }
}

// React 404: forced dark takes the dedicated dark palette of the selected design; forced light never inherits legacy dark palettes.
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 for(const fixture of designs){
  let resolved=await openReact404(page,{mode:'dark',...fixture,path:`/react-dark-${fixture.design}-${fixture.theme}`});
  let state=await readLayout(page,{react:true});assertGeometry(state,{width:390,height:844},`React dark ${fixture.design}/${fixture.theme}`);assertMode(state,resolved,`React dark ${fixture.design}/${fixture.theme}`,fixture.design);

  resolved=await openReact404(page,{mode:'light',...fixture,path:`/react-light-${fixture.design}-${fixture.theme}`});
  state=await readLayout(page,{react:true});assertGeometry(state,{width:390,height:844},`React light ${fixture.design}/${fixture.theme}`);assertMode(state,resolved,`React light ${fixture.design}/${fixture.theme}`,fixture.design);
 }

 // Automatic mode resolves on initial load, client navigation, and refresh at both time boundaries.
 for(const [hour,expected] of [[7,'light'],[22,'light'],[23,'dark'],[0,'dark'],[6,'dark']]){
  const resolved=await openReact404(page,{mode:'auto',hour,path:`/react-auto-${hour}`});
  if(resolved!==expected)throw new Error(`Auto fixture setup mismatch at ${hour}`);
  assertMode(await readLayout(page,{react:true}),expected,`React auto ${hour}`);
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.zk-nf-shell');
  await page.waitForFunction(mode=>document.querySelector('.zk-nf-page')?.dataset.nfMode===mode,{},expected);
  assertMode(await readLayout(page,{react:true}),expected,`React auto refresh ${hour}`);
 }

 console.log('Static and React 404 routes preserve geometry and follow personal precedence, global light/dark/auto, and the dedicated dark palette of each design (light and dark).');
}finally{await browser.close()}
