import {readFile} from 'node:fs/promises';
import {parseServerReferral} from '../api/referral/validation.js';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
const active=(count)=>Array.from({length:count},(_,index)=>({id:`c${index+1}`,active:true}));
const consultants=[{referralCode:'mo'},{referralCode:'moh',active:true}];
const tabs=[
 {id:'height',shortCode:'t',active:true,courses:active(3)},
 {id:'appetite',shortCode:'b',active:true,courses:active(2)},
 {id:'mind',shortCode:'m',active:true,courses:active(3)},
];
const expect=(raw,canonical)=>{const parsed=parseServerReferral(raw,consultants,tabs);if(parsed?.canonical!==canonical)throw new Error(`${raw}: expected ${canonical}, got ${JSON.stringify(parsed)}`)};
expect('moh','moh');expect('moht','moht');expect('moht2','moht2');expect('mohb','mohb');expect('mohb1','mohb1');expect('moh-b1','mohb1');
if(parseServerReferral('mohb3',consultants,tabs)!==null)throw new Error('Out-of-range course index was accepted.');
const extendedTabs=[...tabs,{id:'new-dynamic-tab',shortCode:'x2',active:true,courses:active(4)}];
const dynamic=parseServerReferral('mohx23',consultants,extendedTabs);if(dynamic?.tabCode!=='x2'||dynamic?.courseIndex!==3)throw new Error(`Dynamic alphanumeric tab failed: ${JSON.stringify(dynamic)}`);
const withNewCourse=tabs.map(tab=>tab.shortCode==='b'?{...tab,courses:active(3)}:tab);
if(parseServerReferral('mohb3',consultants,withNewCourse)?.courseIndex!==3)throw new Error('Newly added course was not accepted dynamically.');
const withInactive=tabs.map(tab=>tab.shortCode==='b'?{...tab,courses:[...active(2),{id:'hidden',active:false}]}:tab);
if(parseServerReferral('mohb3',consultants,withInactive)!==null)throw new Error('Inactive course was accepted.');
if(parseServerReferral('mohz1',consultants,tabs)!==null)throw new Error('Unknown tab was accepted.');

const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({settings:{consultants,courseTabs:tabs,designSystem:{sections:{public:{design:'wellness',theme:'light'}}}}}),{status:200,headers:{'Content-Type':'application/json'}});
const {default:handler}=await import(`../api/referral/[code].js?test=${Date.now()}`);
const invoke=async(code)=>{const result={statusCode:0,headers:{},body:''};const response={set statusCode(value){result.statusCode=value},get statusCode(){return result.statusCode},setHeader:(key,value)=>{result.headers[key]=value},end:(body='')=>{result.body=String(body)}};await handler({query:{code}},response);return result};
const validResponse=await invoke('moht2');if(validResponse.statusCode!==307||validResponse.headers.Location!=='/?ref=moht2')throw new Error(`Handler compact referral failed: ${JSON.stringify(validResponse)}`);
const invalidResponse=await invoke('mohz1');if(invalidResponse.statusCode!==404||!invalidResponse.body.includes('class="nf-art"')||!invalidResponse.body.includes('دسترسی سریع')||!invalidResponse.body.includes('min-height:100dvh'))throw new Error('Handler unified 404 failed.');
globalThis.fetch=originalFetch;

const static404=await readFile(new URL('../public/404.html',import.meta.url),'utf8');
if(static404.includes('<script')||static404.includes('zk_design_system')||static404.includes('/functions/v1/public-settings'))throw new Error('Static 404 should not run theme/network bootstrap code.');
if((static404.match(/class="nf-shortcut /g)||[]).length!==6)throw new Error('Static 404 must expose exactly six concise shortcuts.');
if(!static404.includes('<p><span>صفحه‌ای که دنبالش بودی، پیدا نشد.</span><br><span>مسیر درست را از بین گزینه‌های زیر پیدا کن!</span></p>')||!static404.includes('<strong>ارتباط با ما و پشتیبانی</strong>'))throw new Error('Static 404 exact Persian copy is incomplete.');
for(const path of ['/consultation','/courses','/experience','/licenses','/education','/contact'])if(!static404.includes(`href="${path}"`))throw new Error(`Static 404 shortcut missing: ${path}`);
if(/\p{Extended_Pictographic}/u.test(static404))throw new Error('Static 404 must not contain emoji.');
if(/@keyframes|animation\s*:/.test(static404))throw new Error('Static 404 must not contain motion.');
if(/overflow\s*:\s*hidden|position\s*:\s*fixed|max-height\s*:\s*100dvh/.test(static404))throw new Error('Static 404 must not lock the viewport or vertical scroll.');
for(const token of ['min-height:100dvh','min-height:92dvh','overflow-y:auto','border-radius:38px','border-radius:9999px','-webkit-tap-highlight-color:transparent','background:#edf6f5','linear-gradient(90deg,#1769c2 0%,#356b62 100%)','color:#B83A3A','color:#17202b','id="neu-4-shadow"','id="donut-shadow"','id="donut-hole-mask"'])if(!static404.includes(token))throw new Error(`Static 404 contract missing: ${token}`);
const rendered404=renderNotFoundPage({brand:'Test'});
if(!rendered404.includes('<span>Test</span>')||!rendered404.includes('<span class="exclaim">عه !</span><span class="question">اینجا کجاست؟</span>')||!rendered404.includes('fill="#F8FAFC"'))throw new Error('Unified 404 renderer is incomplete.');
const handlerSource=await readFile(new URL('../api/referral/[code].js',import.meta.url),'utf8');
if(!handlerSource.includes('renderNotFoundPage')||!handlerSource.includes('parseServerReferral'))throw new Error('Server 404/referral handler lost its shared routing contract.');
console.log('Dynamic server referral routing and rich 404 passed.');
