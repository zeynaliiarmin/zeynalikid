import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173',executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
// 1x1 blue PNG
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const page=await browser.newPage();await page.setBypassServiceWorker(true);await page.setViewport({width:390,height:844});const bodies=[];
 await page.setRequestInterception(true);page.on('request',request=>{const url=request.url();
  if(url.includes('/functions/v1/assistant-public')){const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers:cors,body:''});
   if(request.method()==='GET')return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(new URL(url).searchParams.get('status')==='1'?{enabled:true,revision:1,updated_at:''}:{settings:{enabled:true,welcome_message:'سلام آزمایشی',fallback_message:'اطلاعی ندارم',disclaimer:'راهنمای عمومی',suggested_questions:[]},knowledge:[]})});
   bodies.push(JSON.parse(request.postData()||'{}'));
   const last=bodies[bodies.length-1]||{};
   const withImage=Array.isArray(last.images)&&last.images.length>0;
   return request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({ok:true,answer:withImage?'از روی عکس نمی‌تونم قد فرزندتان را ارزیابی کنم؛ برای راهنمایی بهتر درخواست مشاوره بدهید.':'پاسک متنی عادی.',model:'mistral-small-latest',sources:[],actions:withImage?[{label:'ثبت درخواست مشاوره',path:'/consultation'}]:[],suggestions:[],provider_called:true,blocked_admin:false,blocked_private:false})});
  }
  return request.continue();});
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.zka-launch',{timeout:15000});
 await page.$eval('.zka-launch',node=>node.click());await page.waitForSelector('.zka-panel');
 // 1) attach button exists with label
 const attachBtn=await page.$('button.zka-attach');assert(attachBtn,'photo attach button missing');
 // 2) send stays disabled with empty text and no image
 const input='.zka-form input[type="text"]';
 assert.equal(await page.$eval('.zka-form button[type="submit"]',node=>node.disabled),true,'send enabled without content');
 // 3) pick image from "gallery" → chip preview appears
 const b64=png.toString('base64');const upload=async(name)=>page.evaluate((data,nm)=>{const bin=atob(data),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);const dt=new DataTransfer();dt.items.add(new File([arr],nm,{type:'image/png'}));const inp=document.querySelector('.zka-form input[type="file"]');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}))},b64,name);
 await upload('photo.png');
 await page.waitForSelector('.zka-chip img',{timeout:5000});
 // 4) with image only (no text) send becomes enabled — like WhatsApp caption flow
 assert.equal(await page.$eval('.zka-form button[type="submit"]',node=>node.disabled),false,'send still disabled with image attached');
 // 5) add a caption under the image and send
 await page.type(input,'قد پسرمن تو این عکس نرماله؟');
 await page.$eval('.zka-form',node=>node.requestSubmit());
 await page.waitForFunction(()=>document.body.innerText.includes('از روی عکس نمی'),{timeout:8000});
 assert.equal(bodies.length,1,'request not sent');
 const sent=bodies[0];
 assert(Array.isArray(sent.images)&&sent.images.length===1&&sent.images[0].startsWith('data:image/'),'image not in request body');
 assert(sent.question.includes('قد پسرمن'),'caption lost');
 // 6) refusal answer renders the consultation button
 const href=await page.$eval('.zka-panel .zka-actions a',node=>node.getAttribute('href'));assert.equal(href,'/consultation','consultation CTA missing after photo refusal');
 // 7) user bubble shows the attached thumbnail; chip cleared after send
 assert(await page.$eval('.zka-turn.user .zka-msgimg',node=>node.tagName==='IMG'),'thumbnail missing in sent message');
 assert.equal(await page.$('.zka-chip'),null,'attach chip not cleared after send');
 // 8) image alone without caption still works
 await upload('chart.png');
 await page.waitForSelector('.zka-chip img',{timeout:5000});
 await page.$eval('.zka-form',node=>node.requestSubmit());
 await page.waitForFunction(()=>document.body.innerText.includes('از روی عکس نمی'),{timeout:8000});
 assert(bodies[1]&&(bodies[1].question===''||bodies[1].question==='(تصویر)'||typeof bodies[1].question==='string')&&bodies[1].images.length===1,'image-only request malformed');
 assert(!(await page.$('.zka-chip')),'chip remains after second send');
 console.log('Assistant photo attach UI passed (caption flow, image-only, consultation CTA, thumbnail, cleanup).');
}catch(error){console.error(error);process.exitCode=1}finally{await browser.close()}
