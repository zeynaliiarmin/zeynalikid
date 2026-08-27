import puppeteer from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const viewports=[
 {width:280,height:320},
 {width:280,height:480},
 {width:320,height:320},
 {width:320,height:480},
 {width:390,height:430},
 {width:390,height:568},
 {width:390,height:844},
 {width:430,height:932},
 {width:568,height:320},
 {width:1366,height:768},
];
const labels=['درخواست مشاوره','معرفی دوره‌ها','تجربه والدین','مجوزها و نمادها','مقالات آموزشی','ارتباط و پشتیبانی'];
const paths=['/consultation','/courses','/experience','/licenses','/education','/contact'];
const line1='صفحه‌ای که دنبالش بودی، پیدا نشد.';
const line2='مسیر درست را از بین گزینه‌های زیر پیدا کن!';
const transparentTap=new Set(['rgba(0, 0, 0, 0)','transparent']);
const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;

function assertLayout(state,kind,viewport){
 const where=`${kind} ${viewport.width}x${viewport.height}`;
 if(state.pageHeight!==viewport.height||state.pageWidth!==viewport.width)throw new Error(`${where} is not exactly one viewport: ${JSON.stringify(state)}`);
 if(state.pageOverflow!=='hidden'||state.htmlOverflow!=='hidden'||state.bodyOverflow!=='hidden')throw new Error(`${where} is not scroll-locked: ${JSON.stringify(state)}`);
 if(state.scrollHeight>viewport.height+1||state.scrollWidth>viewport.width+1||state.scrollY!==0)throw new Error(`${where} can scroll: ${JSON.stringify(state)}`);
 if(!state.sectionsVisible||state.clipped||!state.globalChromeHidden)throw new Error(`${where} clips content or exposes global chrome: ${JSON.stringify(state)}`);
 if(state.columns!==2||state.count!==6||JSON.stringify(state.labels)!==JSON.stringify(labels))throw new Error(`${where} quick grid mismatch: ${JSON.stringify(state)}`);
 if(state.h1!=='عه! اینجا کجاست؟'||state.line1!==line1||state.line2!==line2||!state.hasBreak)throw new Error(`${where} copy mismatch: ${JSON.stringify(state)}`);
 if(state.brand!=='زینالیکید'||!state.homeLeft)throw new Error(`${where} header mismatch: ${JSON.stringify(state)}`);
 if(state.number!=='44'||state.segmentColors.join(',')!=='#0D9488,#FB923C,#FACC15,#EC4899'||!state.svgComplete)throw new Error(`${where} artwork mismatch: ${JSON.stringify(state)}`);
 if(state.motion||state.emoji)throw new Error(`${where} must be entirely static and emoji-free: ${JSON.stringify(state)}`);
 if(!transparentTap.has(state.tapHighlight)||state.outline!=='none'||state.userSelect!=='none')throw new Error(`${where} mobile tap/select reset mismatch: ${JSON.stringify(state)}`);
 if(state.primaryBackground!==rgb(13,148,136))throw new Error(`${where} primary CTA color mismatch: ${JSON.stringify(state)}`);
}

async function readLayout(page,{react}){
 return page.evaluate(isReact=>{
  const q=selector=>document.querySelector(selector);
  const prefix=isReact?'.zk-nf':'.nf';
  const pageEl=q(`${prefix}-page`),header=q(`${prefix}-top`),art=q(`${prefix}-art`),copy=q(isReact?'.zk-nf-copy':'.copy');
  const grid=q(isReact?'.zk-nf-shortcuts':'.quick'),primary=q(isReact?'.zk-nf-primary':'.primary');
  const home=q(isReact?'.zk-nf-home-icon':'.home-icon'),brand=q(isReact?'.zk-nf-brand':'.brand');
  const cards=[...document.querySelectorAll(isReact?'.zk-nf-shortcut':'.nf-shortcut')];
  const textNodes=cards.map(card=>card.querySelector('strong'));
  const rect=element=>element?.getBoundingClientRect();
  const visible=element=>{const r=rect(element);return !!r&&r.width>0&&r.height>0&&r.top>=-.5&&r.left>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5};
  const computedCards=cards.map(card=>getComputedStyle(card));
  const all=[...document.querySelectorAll(`${prefix}-page, ${prefix}-page *`)];
  const motion=all.some(element=>{const style=getComputedStyle(element);const durations=`${style.animationDuration},${style.transitionDuration}`.split(',').map(value=>parseFloat(value)||0);return style.animationName!=='none'||durations.some(value=>value>0)});
  const homeRect=rect(home),brandRect=rect(brand),pageRect=rect(pageEl);
  const svg=q(`${prefix}-art svg`);
  const segmentColors=[...svg.querySelectorAll('g[mask="url(#donut-hole-mask)"] > path')].map(node=>node.getAttribute('fill'));
  const paragraphs=[...copy.querySelectorAll('p > span')].map(node=>node.textContent);
  const pageStyle=getComputedStyle(pageEl),homeStyle=getComputedStyle(home);
  window.scrollTo(0,9999);
  return {
   pageHeight:Math.round(pageRect.height),pageWidth:Math.round(pageRect.width),pageOverflow:pageStyle.overflow,
   htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow,
   scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,scrollY:window.scrollY,
   sectionsVisible:[header,art,copy,grid,primary,...cards].every(visible),
   globalChromeHidden:!isReact||[...document.querySelectorAll('#root>svg,#root>header,#root>button')].every(node=>getComputedStyle(node).display==='none'),
   clipped:textNodes.some(node=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1),
   columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,count:cards.length,
   labels:textNodes.map(node=>node.textContent),h1:copy.querySelector('h1')?.textContent,line1:paragraphs[0],line2:paragraphs[1],hasBreak:!!copy.querySelector('p br'),
   brand:brand.querySelector('span')?.textContent,homeLeft:homeRect.right<brandRect.left,
   number:[...svg.querySelectorAll('text')].map(node=>node.textContent).join(''),segmentColors,
   svgComplete:!!svg.querySelector('#neu-4-shadow')&&!!svg.querySelector('#donut-shadow')&&!!svg.querySelector('#donut-hole-mask')&&svg.getAttribute('viewBox')==='0 0 400 170',
   motion,emoji:/\p{Extended_Pictographic}/u.test(pageEl.textContent||''),tapHighlight:homeStyle.webkitTapHighlightColor,
   outline:homeStyle.outlineStyle,userSelect:pageStyle.userSelect,primaryBackground:getComputedStyle(primary).backgroundColor,
   cardBackgrounds:computedCards.map(style=>style.backgroundColor),
  };
 },react);
}

async function assertActive(page,selector,expectedBackground){
 const handle=await page.$(selector),box=await handle?.boundingBox();
 if(!box)throw new Error(`Cannot test active state for ${selector}`);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 const state=await page.$eval(selector,node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,shadow:style.boxShadow,color:style.color,tap:style.webkitTapHighlightColor,outline:style.outlineStyle}});
 await page.mouse.move(1,1);await page.mouse.up();
 if(state.background!==expectedBackground||!state.shadow.includes('inset')||state.color===rgb(0,0,238)||!transparentTap.has(state.tap)||state.outline!=='none')throw new Error(`Unsafe active state for ${selector}: ${JSON.stringify(state)}`);
}

const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 await page.setBypassServiceWorker(true);
 await page.setCacheEnabled(false);

 for(const viewport of viewports){
  await page.setViewport({...viewport,deviceScaleFactor:1});
  await page.goto(`${base}/404.html?viewport=${viewport.width}x${viewport.height}`,{waitUntil:'domcontentloaded',timeout:30000});
  const state=await readLayout(page,{react:false});
  assertLayout(state,'static',viewport);
  const hrefs=await page.$$eval('.nf-shortcut',nodes=>nodes.map(node=>node.getAttribute('href')));
  if(JSON.stringify(hrefs)!==JSON.stringify(paths))throw new Error(`Static shortcut paths mismatch: ${JSON.stringify(hrefs)}`);
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.goto(`${base}/404.html?active=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await assertActive(page,'.home-icon',rgb(220,242,237));
 await assertActive(page,'.nf-shortcut',rgb(220,242,237));
 await assertActive(page,'.primary',rgb(15,118,110));

 for(const viewport of viewports){
  await page.setViewport({...viewport,deviceScaleFactor:1});
  await page.goto(`${base}/?react-viewport=${viewport.width}x${viewport.height}`,{waitUntil:'networkidle0',timeout:30000});
  await page.evaluate(()=>{history.pushState(null,'','/client-side-fixed-404');window.dispatchEvent(new PopStateEvent('popstate'))});
  await page.waitForSelector('.zk-nf-shell',{timeout:20000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('zk-nf-locked'));
  const state=await readLayout(page,{react:true});
  assertLayout(state,'React',viewport);
  const topLayer=await page.evaluate(()=>!!document.elementFromPoint(innerWidth/2,1)?.closest('.zk-nf-page'));
  if(!topLayer)throw new Error(`React 404 does not cover the global layout at ${viewport.width}x${viewport.height}`);
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.goto(`${base}/?react-active=1`,{waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(()=>{history.pushState(null,'','/client-side-active-404');window.dispatchEvent(new PopStateEvent('popstate'))});
 await page.waitForSelector('.zk-nf-shell',{timeout:20000});
 await assertActive(page,'.zk-nf-home-icon',rgb(220,242,237));
 await assertActive(page,'.zk-nf-shortcut',rgb(220,242,237));
 await assertActive(page,'.zk-nf-primary',rgb(15,118,110));

 await context.close();
 console.log('Fixed-viewport static and React 404 are motionless, tap-safe, responsive, and fully visible.');
}finally{
 await browser.close();
}
