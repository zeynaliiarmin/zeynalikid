// ثبت خطاهای فرانت‌اند — سبک، بی‌صدا، بدون دادهٔ حساس
// سناریو: وقتی کاربری به باگ می‌خورد، نوع خطا + صفحه + مرورگر + stacktrace
// به سرور ارسال می‌شود تا در پنل مدیریت قابل بررسی باشد (بدون شکایت کاربر).
//
// اصول:
//   • fire-and-forget و کاملاً بی‌صدا (هرگز تجربهٔ کاربر را مختل نمی‌کند)
//   • فیلتر دادهٔ حساس (شماره موبایل/کارت/شبا/ایمیل/توکن) قبل از ارسال
//   • صف کوچک و ارسال دسته‌ای؛ خطاهای هم‌زمان دیگر دور ریخته نمی‌شوند
//   • در صورت نبود Supabase، هیچ کاری نمی‌کند

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

const PII_PATTERNS: [RegExp, string][] = [
  [/(\+98|0098|0)9\d{9}/g, '[PHONE]'],
  [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]'],
  [/IR\d{22,26}/g, '[IBAN]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[TOKEN]'],
];

function sanitize(s: string, max: number): string {
  let out = String(s || '');
  for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, max);
}

type ErrorEventPayload={kind:string;message:string;stack:string;page:string;user_agent:string;lang:string};
const queue:ErrorEventPayload[]=[];let timer:number|null=null;let lastSent=0;const MIN_INTERVAL_MS=10000;

const schedule=()=>{if(timer!==null)return;const delay=Math.max(2000,MIN_INTERVAL_MS-(Date.now()-lastSent));timer=window.setTimeout(()=>{timer=null;void flushErrors()},delay)};
async function flushErrors(force=false):Promise<void>{
 if(!queue.length||!SUPABASE_URL||!SUPABASE_ANON_KEY)return;
 if(!force&&Date.now()-lastSent<MIN_INTERVAL_MS){schedule();return}
 const events=queue.splice(0,10);lastSent=Date.now();
 try{const response=await fetch(`${SUPABASE_URL}/functions/v1/log-error`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'apikey':SUPABASE_ANON_KEY},body:JSON.stringify({events}),keepalive:true});if(!response.ok)throw new Error('log rejected')}
 catch{queue.unshift(...events);if(queue.length>20)queue.length=20}
 if(queue.length)schedule();
}

export function reportError(kind:string,message:string,stack?:string):void{
 try{
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY)return;
  const event={kind:String(kind||'error').slice(0,30),message:sanitize(message,2000),stack:sanitize(stack||'',4000),page:(typeof location!=='undefined'?location.pathname:'').slice(0,500),user_agent:(typeof navigator!=='undefined'?navigator.userAgent:'').slice(0,500),lang:(()=>{try{return localStorage.getItem('zkid_lang')||''}catch{return''}})().slice(0,8)};
  const fingerprint=`${event.kind}|${event.message}|${event.page}`;
  if(!queue.some(item=>`${item.kind}|${item.message}|${item.page}`===fingerprint))queue.push(event);
  if(queue.length>20)queue.shift();schedule();
 }catch{}
}

export function initErrorLogging(): void {
  try {
    // ─── رفع خطای «Failed to fetch dynamically imported module» ───
    // بعد از هر دیپلوی، هش نام چانک‌های lazy تغییر می‌کند؛ مرورگری که نسخهٔ قدیمی را
    // در حافظه دارد، چانک قدیمی را درخواست می‌کند که دیگر روی سرور نیست → این خطا.
    // راه‌حل استاندارد: یک‌بار reload تا HTML/چانک‌های تازه بارگذاری شوند.
    let chunkReloaded = false;
    const reloadOnce = () => {
      if (chunkReloaded) return;
      chunkReloaded = true;
      try { window.setTimeout(() => { try { location.reload(); } catch { /* بی‌صدا */ } }, 400); } catch { /* بی‌صدا */ }
    };
    const isChunkError = (m?: string) => /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|dynamically imported module|reading 'default'|cannot read properties of undefined/i.test(String(m || ''));

    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.message)) { reloadOnce(); return; }
      reportError('error', e.message || '', e.error?.stack || '');
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason;
      const msg = String(r?.message || r || '');
      if (isChunkError(msg)) { reloadOnce(); return; }
      reportError('unhandledrejection', msg, r?.stack || '');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection',onRejection);
    window.addEventListener('pagehide',()=>{void flushErrors(true)});
    try {
      window.addEventListener('vite:preloadError', ((ev: any) => { try { ev?.preventDefault?.(); } catch {} reloadOnce(); }) as EventListener);
    } catch { /* نادیده بگیر */ }
  } catch {
    /* کاملاً بی‌صدا */
  }
}
