import {parseServerReferral} from './validation.js';
import {renderNotFoundPage} from './notFoundPage.js';
const BRAND="زینالیکید";
const SITE_URL='https://zeynalikid.vercel.app';
const SUPABASE_URL=String(process.env.VITE_SUPABASE_URL||'https://kkdrvexwzuuumjezipnd.supabase.co').replace(/\/$/,'');
let cache={expiresAt:0,consultants:[],tabs:[]};

function notFound(response){
 response.statusCode=404;
 response.setHeader('Content-Type','text/html; charset=utf-8');
 response.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 response.setHeader('X-Robots-Tag','noindex, nofollow');
 response.end(renderNotFoundPage({brand:BRAND}));
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
