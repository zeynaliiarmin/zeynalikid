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
const labels=['درخواست مشاوره','معرفی دوره‌ها','تجربه والدین','مجوزها و نمادها','مقالات آموزشی','ارتباط با ما و پشتیبانی'];
const paths=['/consultation','/courses','/experience','/licenses','/education','/contact'];
const line1='صفحه‌ای که دنبالش بودی، پیدا نشد.';
const line2='مسیر درست را از بین گزینه‌های زیر پیدا کن!';
const transparentTap=new Set(['rgba(0, 0, 0, 0)','transparent']);
const rgb=(r,g,b)=>`rgb(${r}, ${g}, ${b})`;

function assertLayout(state,kind,viewport){
 const where=`${kind} ${viewport.width}x${viewport.height}`;
 if(Math.abs(state.pageWidth-viewport.width)>1||state.pageHeight<viewport.height-1)throw new Error(`${where} does not cover the dynamic viewport: ${JSON.stringify(state)}`);
 if(state.pageOverflowY!=='auto'||state.htmlOverflowY!=='auto'||state.bodyOverflowY!=='auto')throw new Error(`${where} does not preserve natural vertical scrolling: ${JSON.stringify(state)}`);
 if(state.scrollWidth>viewport.width+1||state.scrollX!==0)throw new Error(`${where} scrolls horizontally: ${JSON.stringify(state)}`);
 if(!state.sectionsContained||state.clipped||!state.globalChromeHidden)throw new Error(`${where} clips content or exposes global chrome: ${JSON.stringify(state)}`);
 if(state.cardWidth>416.5||state.cardWidth>viewport.width-19||state.cardRadius!=='38px'||state.cardBackground!==rgb(255,255,255)||!state.cardCentered)throw new Error(`${where} central card mismatch: ${JSON.stringify(state)}`);
 if(!state.pageGradient.includes(rgb(243,232,255))||!state.pageGradient.includes(rgb(252,231,243)))throw new Error(`${where} page gradient mismatch: ${JSON.stringify(state)}`);
 if(state.columns!==2||state.count!==6||JSON.stringify(state.labels)!==JSON.stringify(labels)||!state.physicalOrder)throw new Error(`${where} two-column order mismatch: ${JSON.stringify(state)}`);
 if(state.exclaim!=='عه !'||state.question!=='اینجا کجاست؟'||state.exclaimColor!==rgb(238,119,110)||state.questionColor!==rgb(49,46,85)||state.line1!==line1||state.line2!==line2||!state.hasBreak)throw new Error(`${where} title/copy mismatch: ${JSON.stringify(state)}`);
 if(state.brand!=='زینالیکید'||!state.homeRight)throw new Error(`${where} header mismatch: ${JSON.stringify(state)}`);
 if(state.number!=='44'||state.segmentColors.join(',')!=='#0D9488,#FB923C,#FACC15,#EC4899'||!state.svgComplete)throw new Error(`${where} artwork mismatch: ${JSON.stringify(state)}`);
 if(state.motion||state.emoji)throw new Error(`${where} must be entirely static and emoji-free: ${JSON.stringify(state)}`);
 if(!transparentTap.has(state.tapHighlight)||state.outline!=='none'||state.userSelect!=='none')throw new Error(`${where} mobile tap/select reset mismatch: ${JSON.stringify(state)}`);
 if(!state.controlsAreLinks||!state.pills||!state.roundIcons||!state.primaryGradient.includes(rgb(107,33,168))||!state.primaryGradient.includes(rgb(219,39,119)))throw new Error(`${where} control styling mismatch: ${JSON.stringify(state)}`);
 if(viewport.width===280&&viewport.height===320&&(!state.canScrollVertically||state.scrolledY<=0))throw new Error(`${where} must remain vertically scrollable when content needs more room: ${JSON.stringify(state)}`);
}

async function readLayout(page,{react}){
 return page.evaluate(async isReact=>{
  const q=selector=>document.querySelector(selector);
  const prefix=isReact?'.zk-nf':'.nf';
  const pageEl=q(`${prefix}-page`),shell=q(`${prefix}-shell`),header=q(`${prefix}-top`),art=q(`${prefix}-art`),copy=q(isReact?'.zk-nf-copy':'.copy');
  const grid=q(isReact?'.zk-nf-shortcuts':'.quick'),footer=q(isReact?'.zk-nf-footer':'.nf-footer'),primary=q(isReact?'.zk-nf-primary':'.primary');
  const home=q(isReact?'.zk-nf-home-icon':'.home-icon'),brand=q(isReact?'.zk-nf-brand':'.brand');
  const cards=[...document.querySelectorAll(isReact?'.zk-nf-shortcut':'.nf-shortcut')];
  const icons=[...document.querySelectorAll(isReact?'.zk-nf-shortcut-icon':'.nf-shortcut-icon')];
  const textNodes=cards.map(card=>card.querySelector('strong'));
  const rect=element=>element?.getBoundingClientRect();
  const within=(element,parent)=>{const r=rect(element),p=rect(parent);return !!r&&!!p&&r.width>0&&r.height>0&&r.top>=p.top-.5&&r.left>=p.left-.5&&r.right<=p.right+.5&&r.bottom<=p.bottom+.5};
  const all=[pageEl,...pageEl.querySelectorAll('*')];
  const motion=all.some(element=>{const style=getComputedStyle(element);const durations=`${style.animationDuration},${style.transitionDuration}`.split(',').map(value=>parseFloat(value)||0);return style.animationName!=='none'||durations.some(value=>value>0)});
  const homeRect=rect(home),brandRect=rect(brand),pageRect=rect(pageEl),shellRect=rect(shell);
  const cardRects=cards.map(rect);
  const svg=q(`${prefix}-art svg`);
  const segmentColors=[...svg.querySelectorAll('g[mask="url(#donut-hole-mask)"] > path')].map(node=>node.getAttribute('fill'));
  const paragraphs=[...copy.querySelectorAll('p > span')].map(node=>node.textContent);
  const pageStyle=getComputedStyle(pageEl),shellStyle=getComputedStyle(shell),homeStyle=getComputedStyle(home);
  const exclaim=q(isReact?'.zk-nf-exclaim':'.exclaim'),question=q(isReact?'.zk-nf-question':'.question');
  const scrollHeight=document.documentElement.scrollHeight,scrollWidth=document.documentElement.scrollWidth;
  const maxScroll=Math.max(0,scrollHeight-innerHeight);
  window.scrollTo(0,maxScroll);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const scrolledY=window.scrollY;
  window.scrollTo(0,0);
  return {
   pageHeight:Math.round(pageRect.height),pageWidth:Math.round(pageRect.width),pageOverflowY:pageStyle.overflowY,
   htmlOverflowY:getComputedStyle(document.documentElement).overflowY,bodyOverflowY:getComputedStyle(document.body).overflowY,
   scrollHeight,scrollWidth,scrollX:window.scrollX,canScrollVertically:maxScroll>1,scrolledY,
   sectionsContained:[header,art,copy,grid,footer,primary,...cards].every(element=>within(element,shell)),
   globalChromeHidden:!isReact||[...document.querySelectorAll('#root>svg,#root>header,#root>button')].every(node=>getComputedStyle(node).display==='none'),
   clipped:textNodes.some(node=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1),
   cardWidth:shellRect.width,cardRadius:shellStyle.borderRadius,cardBackground:shellStyle.backgroundColor,
   cardCentered:Math.abs((shellRect.left+shellRect.right)/2-innerWidth/2)<1,
   pageGradient:pageStyle.backgroundImage,
   columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,count:cards.length,
   labels:textNodes.map(node=>node.textContent),
   physicalOrder:cardRects[0].left>cardRects[1].left&&cardRects[2].left>cardRects[3].left&&cardRects[4].left>cardRects[5].left,
   exclaim:exclaim.textContent,question:question.textContent,exclaimColor:getComputedStyle(exclaim).color,questionColor:getComputedStyle(question).color,
   line1:paragraphs[0],line2:paragraphs[1],hasBreak:!!copy.querySelector('p br'),
   brand:brand.querySelector('span')?.textContent,homeRight:homeRect.left>brandRect.left,
   number:[...svg.querySelectorAll('text')].map(node=>node.textContent).join(''),segmentColors,
   svgComplete:!!svg.querySelector('#neu-4-shadow')&&!!svg.querySelector('#donut-shadow')&&!!svg.querySelector('#donut-hole-mask')&&svg.getAttribute('viewBox')==='0 0 400 170',
   motion,emoji:/\p{Extended_Pictographic}/u.test(pageEl.textContent||''),tapHighlight:homeStyle.webkitTapHighlightColor,
   outline:homeStyle.outlineStyle,userSelect:pageStyle.userSelect,
   controlsAreLinks:[home,primary,...cards].every(node=>node.tagName==='A'),
   pills:cards.every(node=>parseFloat(getComputedStyle(node).borderRadius)>1000),
   roundIcons:icons.every(node=>getComputedStyle(node).borderRadius==='50%'),
   primaryGradient:getComputedStyle(primary).backgroundImage,
  };
 },react);
}

async function assertActive(page,selector,{background,gradientIncludes}){
 const before=await page.$eval(selector,node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,gradient:style.backgroundImage}});
 const handle=await page.$(selector),box=await handle?.boundingBox();
 if(!box)throw new Error(`Cannot test active state for ${selector}`);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 const state=await page.$eval(selector,node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,gradient:style.backgroundImage,color:style.color,tap:style.webkitTapHighlightColor,outline:style.outlineStyle,transform:style.transform,transition:style.transitionDuration}});
 await page.mouse.move(1,1);await page.mouse.up();
 const changed=state.background!==before.background||state.gradient!==before.gradient;
 if(!changed||(background&&state.background!==background)||(gradientIncludes&&!state.gradient.includes(gradientIncludes))||state.color===rgb(0,0,238)||!transparentTap.has(state.tap)||state.outline!=='none'||state.transform!=='none'||parseFloat(state.transition)>0)throw new Error(`Unsafe active state for ${selector}: ${JSON.stringify({before,state})}`);
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
 await assertActive(page,'.home-icon',{background:rgb(248,250,252)});
 await assertActive(page,'.nf-shortcut',{background:rgb(248,250,252)});
 await assertActive(page,'.primary',{gradientIncludes:rgb(88,28,135)});

 for(const viewport of viewports){
  await page.setViewport({...viewport,deviceScaleFactor:1});
  await page.goto(`${base}/?react-viewport=${viewport.width}x${viewport.height}`,{waitUntil:'networkidle0',timeout:30000});
  await page.evaluate(()=>{history.pushState(null,'','/client-side-unified-404');window.dispatchEvent(new PopStateEvent('popstate'))});
  await page.waitForSelector('.zk-nf-shell',{timeout:20000});
  const state=await readLayout(page,{react:true});
  assertLayout(state,'React',viewport);
  const hrefs=await page.$$eval('.zk-nf-shortcut',nodes=>nodes.map(node=>node.getAttribute('href')));
  if(JSON.stringify(hrefs)!==JSON.stringify(paths))throw new Error(`React shortcut paths mismatch: ${JSON.stringify(hrefs)}`);
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.goto(`${base}/?react-active=1`,{waitUntil:'networkidle0',timeout:30000});
 await page.evaluate(()=>{history.pushState(null,'','/client-side-active-404');window.dispatchEvent(new PopStateEvent('popstate'))});
 await page.waitForSelector('.zk-nf-shell',{timeout:20000});
 await assertActive(page,'.zk-nf-home-icon',{background:rgb(248,250,252)});
 await assertActive(page,'.zk-nf-shortcut',{background:rgb(248,250,252)});
 await assertActive(page,'.zk-nf-primary',{gradientIncludes:rgb(88,28,135)});

 await context.close();
 console.log('Unified static and React 404 are motionless, naturally scrollable, tap-safe, and visually ordered.');
}finally{
 await browser.close();
}
