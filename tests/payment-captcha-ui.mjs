import puppeteer from 'puppeteer';
const base=process.env.TEST_BASE_URL||'http://localhost:4173';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||undefined;
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const context=await browser.createBrowserContext();const page=await context.newPage();await page.setBypassServiceWorker(true);
let checkoutRequests=0;page.on('request',request=>{if(request.url().includes('/checkout-session'))checkoutRequests++});
const selected={id:'captcha-ui-test',title:'دوره تست رابط امنیتی',price:'1000',active:true};
await page.evaluateOnNewDocument(course=>localStorage.setItem('zkid_course_draft',JSON.stringify({selected:course,dest:'iran',shippingMethod:'post',childInfo:{age:'8',gender:'male'},tonguePhotos:[],form:{country:'ایران',city:'تهران',address:'local security test',postalCode:'1234567890',receiver:'test',phoneCc:'+98',phone:'09123456789',whatsappCc:'+98',whatsapp:''},payment:{bankId:'',receipt:'',receiptText:'',receiptMethod:null},optionalSendDate:'',errors:{},editedHistory:[]})),selected);
await page.goto(base+'/course-payment',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('[data-testid="payment-captcha-gate"]',{timeout:15000});await new Promise(resolve=>setTimeout(resolve,1000));
const before=await page.evaluate(()=>({gate:!!document.querySelector('[data-testid="payment-captcha-gate"]'),destinations:!!document.querySelector('[data-testid="payment-destinations"]'),hasCard:/\b\d{16}\b/.test(document.body.innerText.replace(/\s/g,''))}));
if(!before.gate||before.destinations||before.hasCard||checkoutRequests!==0)throw new Error(`CAPTCHA gate failed: ${JSON.stringify({before,checkoutRequests})}`);
for(const button of await page.$$('button')){if((await button.evaluate(node=>node.textContent||'')).includes('ثبت‌نام اولیه')){await button.click();break}}
await page.waitForFunction(()=>document.body.innerText.includes('ابتدا بررسی امنیتی را تکمیل کنید.'),{timeout:5000});
if(checkoutRequests!==0)throw new Error('Checkout session was requested before CAPTCHA verification.');
await context.close();await browser.close();console.log('Payment CAPTCHA browser gate passed.');
