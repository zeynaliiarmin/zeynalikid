import puppeteer from 'puppeteer';
const base=process.env.TEST_BASE_URL||'http://localhost:4173';const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
for(const [mode,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1440,height:1000}]]){
 const page=await browser.newPage();await page.setBypassServiceWorker(true);await page.setViewport(viewport);await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});await new Promise(resolve=>setTimeout(resolve,1400));
 const result=await page.evaluate(mode=>{const rect=selector=>{const node=document.querySelector(selector);if(!node)return null;const value=node.getBoundingClientRect();return{x:value.x,y:value.y,width:value.width,height:value.height,right:value.right,bottom:value.bottom}};const quick=[...document.querySelectorAll('.zk-home-quick-item')].map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width}});const container=rect('.zk-home-container');const core=document.querySelector('.zk-home-core-grid');return{mode,v2:document.querySelector('.zk-home-page')?.classList.contains('zk-home-v2'),overflow:document.documentElement.scrollWidth-window.innerWidth,container,quick,core:core?{client:core.clientWidth,scroll:core.scrollWidth}:null,services:rect('.zk-home-services'),coreSection:rect('.zk-home-core'),parents:rect('.zk-home-parents'),testimonials:rect('.zk-home-testimonials'),sections:document.querySelectorAll('.zk-home-section').length,h1:document.querySelectorAll('h1').length}},mode);
 if(!result.v2||result.overflow>1||!result.container||result.sections<8||!result.h1)throw new Error(`${mode}: basic responsive shell failed ${JSON.stringify(result)}`);
 if(mode==='mobile'){
  const firstRow=result.quick.filter(item=>Math.abs(item.y-result.quick[0]?.y)<3);if(result.quick.length<4||firstRow.length!==2)throw new Error(`mobile: quick grid is not two columns ${JSON.stringify(result.quick)}`);
  if(!result.core||result.core.scroll<=result.core.client)throw new Error(`mobile: core areas are not swipeable ${JSON.stringify(result.core)}`);
 }else{
  if(result.container.width<1100||result.container.width>1242)throw new Error(`desktop: container width is not balanced ${result.container.width}`);
  if(!result.services||!result.coreSection||Math.abs(result.services.y-result.coreSection.y)>4||!(result.services.right<=result.coreSection.x+2||result.coreSection.right<=result.services.x+2))throw new Error(`desktop: services/core bento layout failed ${JSON.stringify([result.services,result.coreSection])}`);
  if(!result.parents||!result.testimonials||Math.abs(result.parents.y-result.testimonials.y)>4)throw new Error(`desktop: parent/testimonial layout failed`);
  const firstRow=result.quick.filter(item=>Math.abs(item.y-result.quick[0]?.y)<3);if(firstRow.length<4)throw new Error(`desktop: quick access did not expand ${JSON.stringify(result.quick)}`);
 }
 await page.close();
}
await browser.close();console.log('Experimental responsive Home V2 passed on mobile and desktop.');
