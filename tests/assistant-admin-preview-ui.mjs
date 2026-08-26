import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {AxePuppeteer} from '@axe-core/puppeteer';

const baseUrl=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const knowledge=[{
  id:'11111111-1111-4111-8111-111111111111',
  question:'چطور درخواست مشاوره ثبت کنم؟',
  answer:'وارد بخش مشاوره شوید، فرم را تکمیل کنید و کد پیگیری را نگه دارید.',
  aliases:['مشاوره میخوام'],
  keywords:['مشاوره','فرم'],
  category:'راهنمای سایت',
  link_url:'/consultation',
  link_label:'ثبت مشاوره',
  source_url:'',
  priority:10,
  status:'published',
  is_active:true,
  created_by:'test',
}];
let previewCalls=0;
let browserCalledMistral=false;
let previewHadAuth=false;
const runtimeErrors=[];

const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  page.on('pageerror',error=>runtimeErrors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(`console: ${message.text()}`)});
  await page.setRequestInterception(true);
  page.on('request',async request=>{
    const url=request.url();
    const json=(body,status=200)=>request.respond({
      status,
      contentType:'application/json',
      headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},
      body:JSON.stringify(body),
    });
    try{
      if(request.method()==='OPTIONS'&&url.includes('/functions/v1/'))return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},body:''});
      if(url.includes('api.mistral.ai')){browserCalledMistral=true;return request.abort()}
      if(url.includes('/functions/v1/admin-session'))return json({valid:true,ownerPhone:'***',devices:[]});
      if(url.includes('/functions/v1/admin-api')){
        const body=JSON.parse(request.postData()||'{}');
        if(body.action==='list_settings')return json({settings:{version:2,courseTabs:[],faqItems:[],education:{items:[]}}});
        if(body.action==='list_submissions')return json({submissions:[],total:0,page:1,limit:100});
        if(body.action==='list_questions')return json({questions:[],total:0,page:1,limit:100});
        if(body.action==='list_reviews')return json({reviews:[],total:0,page:1,limit:100});
        return json({ok:true});
      }
      if(url.includes('/functions/v1/assistant-admin')){
        const body=JSON.parse(request.postData()||'{}');
        if(body.action==='list')return json({
          knowledge,
          settings:{enabled:true,welcome_message:'سلام',fallback_message:'پاسخی پیدا نشد',disclaimer:'راهنمای عمومی'},
          unanswered:[],
          feedback:[],
        });
        if(body.action==='generate_preview'){
          previewCalls++;
          previewHadAuth=String(request.headers().authorization||'').startsWith('Bearer ');
          assert.equal(body.question,'برای ثبت مشاوره باید چه کار کنم؟');
          return json({
            ok:true,
            answer:'برای ثبت درخواست، وارد بخش مشاوره شوید، فرم را کامل کنید و کد پیگیری را نگه دارید.',
            model:'mistral-small-latest',
            sources:[{id:knowledge[0].id,question:knowledge[0].question,category:knowledge[0].category,link_url:'/consultation',score:.91}],
            provider_called:true,
            remaining:19,
          });
        }
        return json({error:'Action not mocked'},400);
      }
      if(url.includes('/functions/v1/assistant-public'))return json({knowledge,settings:{enabled:false}});
      if(url.includes('/functions/v1/public-settings'))return json({settings:{version:2,courseTabs:[],faqItems:[]}});
      if(url.includes('/functions/v1/public-reviews'))return json({reviews:[]});
      if(url.includes('/functions/v1/public-questions'))return json({questions:[]});
      if(url.includes('/functions/v1/log-error'))return json({ok:true});
      if(url.includes('/rest/v1/'))return json([]);
      return request.continue();
    }catch(error){
      runtimeErrors.push(`interception: ${String(error)}`);
      try{await request.abort()}catch{}
    }
  });

  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem('zk_admin_session_token','assistant-preview-browser-test-token');
    localStorage.setItem('zk_admin_authed','true');
    localStorage.setItem('zk_admin_device_id','assistant-preview-browser-device');
  });

  await page.goto(`${baseUrl}/admin/app`,{waitUntil:'domcontentloaded',timeout:30_000});
  await page.waitForFunction(()=>document.body.innerText.includes('دستیار'),{timeout:20_000});
  await page.evaluate(()=>{
    const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim()==='دستیار');
    if(!(button instanceof HTMLButtonElement))throw new Error('Assistant admin navigation button not found');
    button.click();
  });
  try{
    await page.waitForSelector('[data-testid="assistant-mistral-preview"]',{timeout:20_000});
  }catch(error){
    console.error('assistant preview did not open:',await page.evaluate(()=>({url:location.href,body:document.body.innerText.slice(0,2400)})));
    console.error('runtime errors:',runtimeErrors);
    throw error;
  }

  const initial=await page.evaluate(()=>({
    notice:document.querySelector('[data-testid="assistant-mistral-preview"]')?.textContent||'',
    disabled:(document.querySelector('[data-testid="assistant-generate-preview"]'))?.disabled,
  }));
  assert.match(initial.notice,/فقط برای مدیر است/);
  assert.match(initial.notice,/اطلاعات شخصی یا پزشکی خصوصی وارد نکنید/);
  assert.equal(initial.disabled,true,'generate button must remain disabled for an empty question');

  await page.type('[data-testid="assistant-preview-question"]','برای ثبت مشاوره باید چه کار کنم؟');
  await page.click('[data-testid="assistant-generate-preview"]');
  await page.waitForSelector('[data-testid="assistant-preview-result"]',{timeout:15_000});
  const resultText=await page.$eval('[data-testid="assistant-preview-result"]',node=>node.textContent||'');
  assert.match(resultText,/برای ثبت درخواست/);
  assert.match(resultText,/mistral-small-latest/);
  assert.match(resultText,/دانش استفاده‌شده/);
  assert.match(resultText,/19/);
  assert.equal(previewCalls,1,'preview endpoint should be called exactly once');
  assert.equal(previewHadAuth,true,'preview request must include the admin session bearer token');
  assert.equal(browserCalledMistral,false,'browser must never call Mistral directly');

  const axe=await new AxePuppeteer(page).include('[data-testid="assistant-mistral-preview"]').analyze();
  const serious=axe.violations.filter(item=>['serious','critical'].includes(item.impact||''));
  if(serious.length)console.error('assistant preview axe details:',JSON.stringify(serious.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),null,2));
  assert.equal(serious.length,0,`assistant preview accessibility violations: ${serious.map(item=>item.id).join(', ')}`);
  assert.deepEqual(runtimeErrors,[],'assistant preview produced browser runtime errors');
  console.log('Admin-only Mistral preview UI and accessibility passed.');
}finally{
  await browser.close();
}
