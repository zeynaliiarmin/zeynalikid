const BRAND="زینالیکید";
const SITE_URL='https://zeynalikid.vercel.app';
const SUPABASE_URL=String(process.env.VITE_SUPABASE_URL||'https://kkdrvexwzuuumjezipnd.supabase.co').replace(/\/$/,'');
let cache={expiresAt:0,codes:[]};

const escapeHtml=(value)=>String(value).replace(/[&<>"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
function notFound(response){
 response.statusCode=404;
 response.setHeader('Content-Type','text/html; charset=utf-8');
 response.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 response.setHeader('X-Robots-Tag','noindex, nofollow');
 response.end(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>صفحه پیدا نشد | ${escapeHtml(BRAND)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fdf8f3;color:#1f2937;font-family:Tahoma,Arial,sans-serif}main{max-width:34rem;padding:2rem;text-align:center}a{display:inline-block;margin-top:1rem;padding:.8rem 1.4rem;border-radius:999px;background:#0f766e;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>صفحه پیدا نشد</h1><p>آدرس واردشده معتبر نیست یا دیگر در دسترس نیست.</p><a href="/">بازگشت به صفحه اصلی</a></main></body></html>`);
}
async function referralCodes(){
 if(cache.expiresAt>Date.now())return cache.codes;
 const response=await fetch(`${SUPABASE_URL}/functions/v1/public-settings`,{headers:{Origin:SITE_URL},signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error(`public-settings ${response.status}`);
 const payload=await response.json();
 const consultants=Array.isArray(payload?.settings?.consultants)?payload.settings.consultants:[];
 const codes=consultants.filter((item)=>item?.active!==false).map((item)=>String(item?.referralCode||'').trim().toLowerCase()).filter((value)=>/^[a-z0-9]([a-z0-9_-]{0,62}[a-z0-9])?$/.test(value)).sort((a,b)=>b.length-a.length);
 cache={expiresAt:Date.now()+60_000,codes};
 return codes;
}
export default async function handler(request,response){
 const raw=String(request.query?.code||'').trim();
 const normalized=raw.toLowerCase();
 if(!/^[a-z0-9]([a-z0-9_-]{0,126}[a-z0-9])?$/.test(normalized))return notFound(response);
 try{
  const codes=await referralCodes();
  const valid=codes.some((code)=>normalized===code||normalized.startsWith(`${code}-`));
  if(!valid)return notFound(response);
  response.statusCode=307;
  response.setHeader('Location',`/?ref=${encodeURIComponent(raw)}`);
  response.setHeader('Cache-Control','private, no-store');
  response.setHeader('X-Robots-Tag','noindex, follow');
  response.end();
 }catch(error){
  console.error('Referral validation unavailable',String(error?.message||error));
  response.statusCode=503;
  response.setHeader('Content-Type','text/plain; charset=utf-8');
  response.setHeader('Cache-Control','no-store');
  response.end('سرویس موقتاً در دسترس نیست؛ لطفاً دوباره تلاش کنید.');
 }
}
