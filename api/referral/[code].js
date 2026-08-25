import {parseServerReferral} from './validation.js';
const BRAND="زینالیکید";
const SITE_URL='https://zeynalikid.vercel.app';
const SUPABASE_URL=String(process.env.VITE_SUPABASE_URL||'https://kkdrvexwzuuumjezipnd.supabase.co').replace(/\/$/,'');
let cache={expiresAt:0,consultants:[],tabs:[]};

const escapeHtml=(value)=>String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
function notFound(response){
 response.statusCode=404;
 response.setHeader('Content-Type','text/html; charset=utf-8');
 response.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 response.setHeader('X-Robots-Tag','noindex, nofollow');
 response.end(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>صفحه پیدا نشد | ${escapeHtml(BRAND)}</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 10% 10%,#dff7f2 0,transparent 34rem),radial-gradient(circle at 90% 80%,#e8efff 0,transparent 32rem),#f7fbfa;color:#173b3d;font-family:Tahoma,Arial,sans-serif}.card{width:min(100%,620px);padding:clamp(22px,6vw,36px);text-align:center;background:rgba(255,255,255,.94);border:1px solid #cce6e2;border-radius:28px;box-shadow:0 24px 70px rgba(15,118,110,.14)}.number{font-size:clamp(64px,18vw,104px);font-weight:900;line-height:.95;letter-spacing:-5px;background:linear-gradient(135deg,#0b5d56,#2563a8);-webkit-background-clip:text;background-clip:text;color:transparent}.mark{width:56px;height:56px;display:grid;place-items:center;margin:-5px auto 12px;border-radius:50%;background:#e7f7f4;color:#0b5d56;font-size:28px;font-weight:900}h1{font-size:clamp(20px,5vw,26px);margin:8px 0;color:#173b3d}p{margin:0 auto 20px;max-width:440px;line-height:2;color:#607477;font-size:13.5px}.quick-title{text-align:right;font-size:15px;margin:20px 0 10px}.quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.quick a,.home{min-height:48px;display:flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:14px;text-decoration:none;font-weight:700;font-size:13px;transition:transform .18s ease,box-shadow .18s ease}.quick a{border:1px solid #bddfd9;color:#0b5d56;background:#effaf8}.quick a:hover{transform:translateY(-2px);box-shadow:0 8px 20px #0f766e19}.home{margin-top:15px;background:linear-gradient(135deg,#0b5d56,#0f766e);color:#fff;box-shadow:0 10px 24px #0f766e38}.quick a:focus-visible,.home:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}@media(max-width:420px){.quick{grid-template-columns:1fr}.card{border-radius:22px}.number{letter-spacing:-3px}}@media(prefers-reduced-motion:reduce){.quick a{transition:none}}</style></head><body><main class="card"><div class="number" aria-hidden="true">404</div><div class="mark" aria-hidden="true">!</div><h1>صفحه موردنظر پیدا نشد</h1><p>ممکن است آدرس اشتباه باشد، لینک ارجاع تغییر کرده باشد یا صفحه به مسیر دیگری منتقل شده باشد.</p><h2 class="quick-title">دسترسی سریع</h2><nav class="quick" aria-label="دسترسی سریع"><a href="/consultation">ثبت درخواست مشاوره</a><a href="/courses">معرفی دوره‌ها</a><a href="/experience">تجربه والدین</a><a href="/licenses">مجوزها</a><a href="/contact">ارتباط با ما</a></nav><a class="home" href="/">بازگشت به صفحه اصلی</a></main></body></html>`);
}

async function referralSettings(){
 if(cache.expiresAt>Date.now())return cache;
 const response=await fetch(`${SUPABASE_URL}/functions/v1/public-settings`,{headers:{Origin:SITE_URL},signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error(`public-settings ${response.status}`);
 const payload=await response.json();const settings=payload?.settings||{};
 cache={expiresAt:Date.now()+15_000,consultants:Array.isArray(settings.consultants)?settings.consultants:[],tabs:Array.isArray(settings.courseTabs)?settings.courseTabs:[]};
 return cache;
}

export default async function handler(request,response){
 const raw=String(request.query?.code||'').trim();const normalized=raw.toLowerCase();
 if(!/^[a-z0-9]([a-z0-9_-]{0,126}[a-z0-9])?$/.test(normalized))return notFound(response);
 try{
  const settings=await referralSettings();const parsed=parseServerReferral(normalized,settings.consultants,settings.tabs);
  if(!parsed)return notFound(response);
  response.statusCode=307;
  response.setHeader('Location',`/?ref=${encodeURIComponent(parsed.canonical)}`);
  response.setHeader('Cache-Control','private, no-store');
  response.setHeader('X-Robots-Tag','noindex, follow');
  response.end();
 }catch(error){
  console.error('Referral validation unavailable',String(error?.message||error));response.statusCode=503;
  response.setHeader('Content-Type','text/plain; charset=utf-8');response.setHeader('Cache-Control','no-store');
  response.end('سرویس موقتاً در دسترس نیست؛ لطفاً دوباره تلاش کنید.');
 }
}
