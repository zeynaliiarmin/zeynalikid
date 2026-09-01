import assert from 'node:assert/strict';import puppeteer from 'puppeteer';
// پل زندهٔ دستیار: لینک دقیق ?open=<id> باید همان آیتم را باز/برجسته کند و پارامتر را پاک کند.
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const settings={settings:{version:2,faqItems:[{id:'faq9',question:'سؤال پل آزمایشی؟',answer:'پاسخ پل آزمایشی برای باز شدن خودکار.'},{id:'faq8',question:'سؤال دوم؟',answer:'پاسخ دوم.'}],faqItemsEn:[],licenses:[{id:'licZ',title:'مجوز آزمایشی',description:'آزمایش فوکوس'}]}};
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.setRequestInterception(true);
  page.on('request',r=>{const u=r.url();if(r.method()==='OPTIONS'&&u.includes('/functions/v1/'))return r.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});if(u.includes('/functions/v1/public-settings'))return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(settings)});if(u.includes('/functions/v1/assistant-public'))return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(new URL(u).searchParams.get('status')==='1'?{enabled:true,revision:1,updated_at:''}:{settings:{enabled:false},knowledge:[]})});r.continue()});
  await page.goto(base+'/faq?open=faq9',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-faq-id="faq9"] button[aria-expanded="true"]',{timeout:15000});
  assert.match(await page.$eval('[data-faq-id="faq9"] button',n=>n.textContent||''),/سؤال پل آزمایشی/);
  await page.waitForFunction(()=>document.body.innerText.includes('پاسخ پل آزمایشی'),{timeout:8000});
  await page.waitForFunction(()=>!new URLSearchParams(location.search).has('open'),{timeout:8000});
  assert.equal(new URL(page.url()).searchParams.has('open'),false,'deep-link param is cleaned after opening');
  await page.goto(base+'/faq',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.zk-faq-item');
  assert.equal(await page.$('[data-faq-id="faq9"] button[aria-expanded="true"]'),null,'plain visit opens nothing');
  for(const path of ['/licenses?open=licZ','/education?open=no-such-id','/experience?open=no-such-id']){
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('header',{timeout:15000});
    const err=await page.evaluate(()=>window.__zkBridgeTestError||null);assert.equal(err,null,`${path} must not crash`);
  }
  console.log('Assistant live-bridge deep links passed (faq auto-open, clean url, resilient pages).');
}finally{await browser.close()}
