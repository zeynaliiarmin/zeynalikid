import puppeteer from 'puppeteer';
const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
for(const route of ['/consultation','/child-info']){
 const context=await browser.createBrowserContext();const page=await context.newPage();await page.setBypassServiceWorker(true);await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('[data-testid="privacy-consent"]',{timeout:15000});
 const button=await page.$$('button');let clicked=false;for(const item of button){const text=await item.evaluate(node=>node.textContent||'');if(text.includes('ثبت درخواست مشاوره')||text.includes('ثبت اطلاعات فرزند و ادامه')){await item.evaluate(node=>node.click());clicked=true;break}}
 if(!clicked)throw new Error(`${route}: continue button not found`);await page.waitForFunction(()=>document.querySelector('[data-testid="privacy-consent"]')?.getAttribute('aria-invalid')==='true',{timeout:5000});
 const redState=await page.$eval('[data-testid="privacy-consent"]',node=>({invalid:node.getAttribute('aria-invalid'),border:getComputedStyle(node).borderTopWidth,text:(node.textContent||'').replace(/\s+/g,' ').trim()}));if(redState.invalid!=='true'||redState.border!=='2px'||!redState.text.includes('برای ادامه'))throw new Error(`${route}: consent error not visible`);
 await page.$eval('[data-testid="privacy-consent"] input[type="checkbox"]',node=>node.click());const cleared=await page.$eval('[data-testid="privacy-consent"]',node=>node.getAttribute('aria-invalid'));if(cleared!=='false')throw new Error(`${route}: consent error did not clear`);await context.close();
}
await browser.close();console.log('Consent validation and mobile text layout passed.');
