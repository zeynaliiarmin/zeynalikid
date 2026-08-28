import puppeteer from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const brand='زینالیکید';
const viewports=[
 {width:280,height:320},{width:280,height:480},{width:320,height:320},{width:320,height:480},{width:390,height:430},
 {width:390,height:568},{width:390,height:844},{width:430,height:932},{width:568,height:320},{width:1366,height:768},
];
const themes=[
 {design:'wellness',theme:'light',id:'wellness',accent:'#7A12D4',warm:'#F34747',text:'#0F131A',surface:'#FFFFFF',page:'#FFFFFF'},
 {design:'kidlearn',theme:'light',id:'kidlearn',accent:'#EF4444',warm:'#EF4444',text:'#1F2937',surface:'#FFFFFF',page:'#FFFFFF'},
 {design:'navystack',theme:'light',id:'navystack',accent:'#00D4FF',warm:'#EF4444',text:'#E2E8F0',surface:'#111638',page:'#0A0E27'},
 {design:'navystack',theme:'dark',id:'navystack-dark',accent:'#2DD4BF',warm:'#F87171',text:'#E2E8F0',surface:'#1E293B',page:'#0F1722'},
 {design:'classic',theme:'light',id:'light',accent:'#2564a8',warm:'#dc2626',text:'#162435',surface:'#fff',page:'#eaf1f7'},
 {design:'classic',theme:'cream',id:'cream',accent:'#9c5820',warm:'#dc2626',text:'#3a1e0a',surface:'#fffaf3',page:'linear-gradient(155deg,#fdf6ee,#f4e4d0)'},
 {design:'classic',theme:'ocean',id:'ocean',accent:'#00c9ff',warm:'#f87171',text:'#e8f4f8',surface:'#0f2535',page:'linear-gradient(135deg,#0f2027,#1a3a4a,#0f2027)'},
 {design:'classic',theme:'dark',id:'dark',accent:'#818cf8',warm:'#f87171',text:'#f1f5f9',surface:'#111827',page:'#0d0d0d'},
 {design:'classic',theme:'motherly-trust',id:'motherly-trust',accent:'#1769c2',warm:'#b83a3a',text:'#17202b',surface:'#fff',page:'#f8fbfa'},
 {design:'classic',theme:'blend',id:'blend',accent:'#1769c2',warm:'#b83a3a',text:'#17202b',surface:'#fff',page:'#f7fafb'},
 {design:'blend',theme:'blend',id:'blend',accent:'#1769c2',warm:'#b83a3a',text:'#17202b',surface:'#fff',page:'#f7fafb'},
];
const darkThemeIds=new Set(['ocean','dark','navystack','navystack-dark']);
const forcedDarkTheme=themes.find(theme=>theme.id==='dark');
if(!forcedDarkTheme)throw new Error('Dark 404 theme fixture is missing');
const panelThemes=themes.filter(theme=>theme.id!=='navystack-dark');
const forcedDarkDesigns=themes.filter(theme=>['wellness','kidlearn','navystack','motherly-trust'].includes(theme.id)||theme.design==='blend');
let mockedSettings={publicThemeMode:'light'};
const labels=['درخواست مشاوره','معرفی دوره‌ها','تجربه والدین','مجوزها و نمادها','مقالات آموزشی','ارتباط با ما و پشتیبانی'];
const paths=['/consultation','/courses','/experience','/licenses','/education','/contact'];
const line1='صفحه‌ای که دنبالش بودی، پیدا نشد.';
const line2='مسیر درست را از بین گزینه‌های زیر پیدا کن!';
const transparentTap=new Set(['rgba(0, 0, 0, 0)','transparent']);
const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;
const hexRgb=value=>{const hex=value.toLowerCase()==='#fff'?'#ffffff':value.toLowerCase();const match=/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/.exec(hex);return match?rgb(parseInt(match[1],16),parseInt(match[2],16),parseInt(match[3],16)):value};

function assertThemeState(state,theme,source){
 const mode=darkThemeIds.has(theme.id)?'dark':'light';
 if(state.themeId!==theme.id||state.mode!==mode||state.colorScheme!==mode||state.accent.toLowerCase()!==theme.accent.toLowerCase()||state.warm.toLowerCase()!==theme.warm.toLowerCase()||state.text.toLowerCase()!==theme.text.toLowerCase()||state.surface.toLowerCase()!==theme.surface.toLowerCase()||state.pageToken.replaceAll(' ','').toLowerCase()!==theme.page.replaceAll(' ','').toLowerCase()||state.cardBackground!==hexRgb(theme.surface)||state.questionColor!==hexRgb(theme.text)||state.exclaimColor!==hexRgb(theme.warm)||state.segmentColors[0]!==hexRgb(theme.accent))throw new Error(`${source} theme token mismatch for ${theme.design}/${theme.theme}: ${JSON.stringify(state)}`);
}

function assertGeometry(state,kind,viewport){
 const where=`${kind} ${viewport.width}x${viewport.height}`;
 if(Math.abs(state.pageWidth-viewport.width)>1||state.pageHeight<viewport.height-1)throw new Error(`${where} does not cover the dynamic viewport: ${JSON.stringify(state)}`);
 if(state.pageOverflowY!=='auto'||state.htmlOverflowY!=='auto'||state.bodyOverflowY!=='auto')throw new Error(`${where} does not preserve natural vertical scrolling: ${JSON.stringify(state)}`);
 if(state.scrollWidth>viewport.width+1||state.scrollX!==0)throw new Error(`${where} scrolls horizontally: ${JSON.stringify(state)}`);
 if(!state.sectionsContained||state.clipped||!state.globalChromeHidden)throw new Error(`${where} clips content or exposes global chrome: ${JSON.stringify(state)}`);
 if(state.cardWidth>416.5||state.cardWidth>viewport.width-19||state.cardRadius!=='38px'||!state.cardCentered)throw new Error(`${where} central card geometry mismatch: ${JSON.stringify(state)}`);
 if(state.columns!==2||state.count!==6||JSON.stringify(state.labels)!==JSON.stringify(labels)||!state.physicalOrder)throw new Error(`${where} two-column order mismatch: ${JSON.stringify(state)}`);
 if(state.exclaim!=='عه !'||state.question!=='اینجا کجاست؟'||state.line1!==line1||state.line2!==line2||!state.hasBreak)throw new Error(`${where} title/copy mismatch: ${JSON.stringify(state)}`);
 if(state.brand!==brand||!state.homeRight)throw new Error(`${where} header mismatch: ${JSON.stringify(state)}`);
 if(state.number!=='44'||!state.svgComplete)throw new Error(`${where} artwork mismatch: ${JSON.stringify(state)}`);
 if(state.motion||state.emoji)throw new Error(`${where} must be entirely static and emoji-free: ${JSON.stringify(state)}`);
 if(!transparentTap.has(state.tapHighlight)||state.outline!=='none'||state.userSelect!=='none')throw new Error(`${where} mobile tap/select reset mismatch: ${JSON.stringify(state)}`);
 if(!state.controlsAreLinks||!state.pills||!state.roundIcons||state.primaryGradient==='none')throw new Error(`${where} control styling mismatch: ${JSON.stringify(state)}`);
 if(viewport.width===280&&viewport.height===320&&(!state.canScrollVertically||state.scrolledY<=0))throw new Error(`${where} must remain scrollable when content needs more room: ${JSON.stringify(state)}`);
}

async function readLayout(page,{react}){
 return page.evaluate(async isReact=>{
  const q=selector=>document.querySelector(selector),prefix=isReact?'.zk-nf':'.nf';
  const pageEl=q(`${prefix}-page`),shell=q(`${prefix}-shell`),header=q(`${prefix}-top`),art=q(`${prefix}-art`),copy=q(isReact?'.zk-nf-copy':'.copy');
  const grid=q(isReact?'.zk-nf-shortcuts':'.quick'),footer=q(isReact?'.zk-nf-footer':'.nf-footer'),primary=q(isReact?'.zk-nf-primary':'.primary');
  const home=q(isReact?'.zk-nf-home-icon':'.home-icon'),brandEl=q(isReact?'.zk-nf-brand':'.brand');
  const cards=[...document.querySelectorAll(isReact?'.zk-nf-shortcut':'.nf-shortcut')],icons=[...document.querySelectorAll(isReact?'.zk-nf-shortcut-icon':'.nf-shortcut-icon')],textNodes=cards.map(card=>card.querySelector('strong'));
  const rect=element=>element?.getBoundingClientRect();
  const within=(element,parent)=>{const r=rect(element),p=rect(parent);return !!r&&!!p&&r.width>0&&r.height>0&&r.top>=p.top-.5&&r.left>=p.left-.5&&r.right<=p.right+.5&&r.bottom<=p.bottom+.5};
  const all=[pageEl,...pageEl.querySelectorAll('*')];
  const motion=all.some(element=>{const style=getComputedStyle(element);const durations=`${style.animationDuration},${style.transitionDuration}`.split(',').map(value=>parseFloat(value)||0);return style.animationName!=='none'||durations.some(value=>value>0)});
  const homeRect=rect(home),brandRect=rect(brandEl),pageRect=rect(pageEl),shellRect=rect(shell),cardRects=cards.map(rect),svg=q(`${prefix}-art svg`);
  const segments=[...svg.querySelectorAll('g[mask="url(#donut-hole-mask)"] > path')];
  const paragraphs=[...copy.querySelectorAll('p > span')].map(node=>node.textContent),pageStyle=getComputedStyle(pageEl),shellStyle=getComputedStyle(shell),homeStyle=getComputedStyle(home);
  const exclaim=q(isReact?'.zk-nf-exclaim':'.exclaim'),question=q(isReact?'.zk-nf-question':'.question'),scrollHeight=document.documentElement.scrollHeight,scrollWidth=document.documentElement.scrollWidth,maxScroll=Math.max(0,scrollHeight-innerHeight);
  window.scrollTo(0,maxScroll);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const scrolledY=window.scrollY;window.scrollTo(0,0);
  return {
   pageHeight:Math.round(pageRect.height),pageWidth:Math.round(pageRect.width),pageOverflowY:pageStyle.overflowY,htmlOverflowY:getComputedStyle(document.documentElement).overflowY,bodyOverflowY:getComputedStyle(document.body).overflowY,
   scrollHeight,scrollWidth,scrollX:window.scrollX,canScrollVertically:maxScroll>1,scrolledY,sectionsContained:[header,art,copy,grid,footer,primary,...cards].every(element=>within(element,shell)),
   globalChromeHidden:!isReact||[...document.querySelectorAll('#root>svg,#root>header,#root>button')].every(node=>getComputedStyle(node).display==='none'),clipped:textNodes.some(node=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1),
   cardWidth:shellRect.width,cardRadius:shellStyle.borderRadius,cardBackground:shellStyle.backgroundColor,cardCentered:Math.abs((shellRect.left+shellRect.right)/2-innerWidth/2)<1,
   columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,count:cards.length,labels:textNodes.map(node=>node.textContent),physicalOrder:cardRects[0].left>cardRects[1].left&&cardRects[2].left>cardRects[3].left&&cardRects[4].left>cardRects[5].left,
   exclaim:exclaim.textContent,question:question.textContent,exclaimColor:getComputedStyle(exclaim).color,questionColor:getComputedStyle(question).color,line1:paragraphs[0],line2:paragraphs[1],hasBreak:!!copy.querySelector('p br'),
   brand:brandEl.querySelector('span')?.textContent,homeRight:homeRect.left>brandRect.left,number:[...svg.querySelectorAll('text')].map(node=>node.textContent).join(''),segmentColors:segments.map(node=>getComputedStyle(node).fill),
   svgComplete:!!svg.querySelector('#neu-4-shadow')&&!!svg.querySelector('#donut-shadow')&&!!svg.querySelector('#donut-hole-mask')&&svg.getAttribute('viewBox')==='0 0 400 170',motion,emoji:/\p{Extended_Pictographic}/u.test(pageEl.textContent||''),
   tapHighlight:homeStyle.webkitTapHighlightColor,outline:homeStyle.outlineStyle,userSelect:pageStyle.userSelect,controlsAreLinks:[home,primary,...cards].every(node=>node.tagName==='A'),pills:cards.every(node=>parseFloat(getComputedStyle(node).borderRadius)>1000),roundIcons:icons.every(node=>getComputedStyle(node).borderRadius==='50%'),primaryGradient:getComputedStyle(primary).backgroundImage,
   themeId:pageEl.dataset.nfTheme||'',mode:pageEl.dataset.nfMode||'',colorScheme:pageStyle.colorScheme,accent:pageEl.style.getPropertyValue('--nf-accent').trim(),warm:pageEl.style.getPropertyValue('--nf-warm').trim(),text:pageEl.style.getPropertyValue('--nf-text').trim(),surface:pageEl.style.getPropertyValue('--nf-surface').trim(),pageToken:pageEl.style.getPropertyValue('--nf-page-bg').trim(),gradientToken:pageEl.style.getPropertyValue('--nf-gradient').trim(),mutedColor:getComputedStyle(copy.querySelector('p')).color,controlBackground:getComputedStyle(cards[0]).backgroundColor,
  };
 },react);
}

async function assertActive(page,selector){
 const before=await page.$eval(selector,node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,gradient:style.backgroundImage,filter:style.filter}}),handle=await page.$(selector),box=await handle?.boundingBox();
 if(!box)throw new Error(`Cannot test active state for ${selector}`);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 const state=await page.$eval(selector,node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,gradient:style.backgroundImage,filter:style.filter,color:style.color,tap:style.webkitTapHighlightColor,outline:style.outlineStyle,transform:style.transform,transition:style.transitionDuration}});await page.mouse.move(1,1);await page.mouse.up();
 const changed=state.background!==before.background||state.gradient!==before.gradient||state.filter!==before.filter;
 if(!changed||state.color===rgb(0,0,238)||!transparentTap.has(state.tap)||state.outline!=='none'||state.transform!=='none'||state.filter!=='none'||parseFloat(state.transition)>0)throw new Error(`Unsafe active state for ${selector}: ${JSON.stringify({before,state})}`);
}

async function waitForReactTheme(page,expectedId){
 await page.waitForSelector('.zk-nf-shell',{timeout:20000});
 await page.waitForFunction(id=>document.querySelector('.zk-nf-page')?.dataset.nfTheme===id,{timeout:20000},expectedId);
}

async function setReactTheme(page,{design,theme,id},publicThemeMode='light'){
 mockedSettings={publicThemeMode};
 await page.goto(`${base}/?theme=${design}-${theme}`,{waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(values=>{localStorage.setItem('zk_design_system',values.design);localStorage.setItem('zk_theme',values.theme);sessionStorage.removeItem('zk_public_settings_cache_v1')}, {design,theme});
 await page.reload({waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(()=>{history.pushState(null,'','/client-side-theme-404');window.dispatchEvent(new PopStateEvent('popstate'))});
 await waitForReactTheme(page,publicThemeMode==='dark'?'dark':id);
}

async function setPanelTheme(page,{design,theme,id},publicThemeMode='light'){
 mockedSettings={publicThemeMode,designSystem:{sections:{public:{design,theme}}}};
 await page.goto(`${base}/?panel-theme=${design}-${theme}-${publicThemeMode}`,{waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(()=>{localStorage.removeItem('zk_design_system');localStorage.removeItem('zk_theme');localStorage.removeItem('zkid_settings_v2');sessionStorage.removeItem('zk_public_settings_cache_v1')});
 await page.reload({waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(()=>{history.pushState(null,'','/client-side-panel-theme-404');window.dispatchEvent(new PopStateEvent('popstate'))});
 await waitForReactTheme(page,publicThemeMode==='dark'?'dark':id);
}

const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const context=await browser.createBrowserContext(),page=await context.newPage();await page.setBypassServiceWorker(true);await page.setCacheEnabled(false);
 await page.evaluateOnNewDocument(()=>{const NativeDate=Date,fixed=new NativeDate('2026-08-28T12:00:00');class NoonDate extends NativeDate{constructor(...args){super(...(args.length?args:[fixed.getTime()]))}static now(){return fixed.getTime()}};Object.defineProperty(window,'Date',{value:NoonDate})});
 await page.setRequestInterception(true);page.on('request',request=>{if(request.url().includes('/functions/v1/public-settings')){const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};if(request.method()==='OPTIONS')return request.respond({status:204,headers,body:''});return request.respond({status:200,headers,contentType:'application/json',body:JSON.stringify({settings:mockedSettings})})}return request.continue()});

 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});await page.evaluate(()=>{localStorage.setItem('zk_design_system','navystack');localStorage.setItem('zk_theme','dark')});
 for(const viewport of viewports){await page.setViewport({...viewport,deviceScaleFactor:1});await page.goto(`${base}/404.html?viewport=${viewport.width}x${viewport.height}`,{waitUntil:'domcontentloaded',timeout:30000});const state=await readLayout(page,{react:false});assertGeometry(state,'static',viewport);if(state.cardBackground!==rgb(255,255,255)||state.exclaimColor!==rgb(184,58,58)||state.questionColor!==rgb(23,32,43)||state.segmentColors.join(',')!==[rgb(23,105,194),rgb(181,106,8),rgb(250,204,21),rgb(184,58,58)].join(','))throw new Error(`Static safe palette mismatch: ${JSON.stringify(state)}`);const hrefs=await page.$$eval('.nf-shortcut',nodes=>nodes.map(node=>node.getAttribute('href')));if(JSON.stringify(hrefs)!==JSON.stringify(paths))throw new Error(`Static shortcut paths mismatch: ${JSON.stringify(hrefs)}`)}

 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.goto(`${base}/404.html?active=1`,{waitUntil:'domcontentloaded'});await assertActive(page,'.home-icon');await assertActive(page,'.nf-shortcut');await assertActive(page,'.primary');

 await setReactTheme(page,themes[0]);
 for(const viewport of viewports){await page.setViewport({...viewport,deviceScaleFactor:1});await page.goto(`${base}/?react-viewport=${viewport.width}x${viewport.height}`,{waitUntil:'networkidle0',timeout:30000});await page.evaluate(()=>{history.pushState(null,'','/client-side-unified-404');window.dispatchEvent(new PopStateEvent('popstate'))});await page.waitForSelector('.zk-nf-shell',{timeout:20000});const state=await readLayout(page,{react:true});assertGeometry(state,'React',viewport);const hrefs=await page.$$eval('.zk-nf-shortcut',nodes=>nodes.map(node=>node.getAttribute('href')));if(JSON.stringify(hrefs)!==JSON.stringify(paths))throw new Error(`React shortcut paths mismatch: ${JSON.stringify(hrefs)}`)}

 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 for(const theme of themes){await setReactTheme(page,theme);const state=await readLayout(page,{react:true});assertGeometry(state,`React local ${theme.design}/${theme.theme}`,{width:390,height:844});assertThemeState(state,theme,'Local selection')}
 for(const theme of panelThemes){await setPanelTheme(page,theme);const state=await readLayout(page,{react:true});assertGeometry(state,`React panel ${theme.design}/${theme.theme}`,{width:390,height:844});assertThemeState(state,theme,'Panel selection')}
 for(const design of forcedDarkDesigns){await setPanelTheme(page,design,'dark');const state=await readLayout(page,{react:true});assertGeometry(state,`React forced dark ${design.design}`,{width:390,height:844});assertThemeState(state,forcedDarkTheme,'Forced dark selection')}

 await setReactTheme(page,themes[0]);await assertActive(page,'.zk-nf-home-icon');await assertActive(page,'.zk-nf-shortcut');await assertActive(page,'.zk-nf-primary');
 await context.close();console.log('Unified 404 follows local and panel-selected themes, including forced dark mode, with the correct script-free project fallback.');
}finally{await browser.close()}
