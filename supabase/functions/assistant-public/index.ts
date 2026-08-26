import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin} from '../_shared/cors.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
import {generateGroundedAssistant,isPublicAdminQuestion,relatedKnowledge,sanitizeAssistantQuestion,type AssistantSource} from '../_shared/generativeAssistant.ts';
import {normalizeAssistantText} from '../_shared/assistantMatch.ts';

const BRAND='زینالیکید';
const PUBLIC_PATHS=new Set(['/','/consultation','/track','/courses','/products','/education','/faq','/contact','/about','/privacy','/experience','/licenses','/growth']);
const safe=(value:unknown,max=500)=>sanitizeAssistantQuestion(value).slice(0,max);
const reply=(body:unknown,status:number,origin:string,cache='no-store')=>{const response=jsonResponse(body,status,origin);response.headers.set('Cache-Control',cache);return response};
const defaultFallback=`در مورد سؤالی که پرسیدید اطلاعاتی ندارم. می‌توانم درباره ثبت مشاوره، پیگیری درخواست، دوره‌ها، محصولات و بخش‌های عمومی ${BRAND} راهنمایی‌تان کنم.`;
const defaultSuggestions=[
 {question:'چطور درخواست مشاوره ثبت کنم؟',label:'ثبت مشاوره',path:'/consultation'},
 {question:'چطور درخواست خودم را پیگیری کنم؟',label:'پیگیری درخواست',path:'/track'},
 {question:'دوره‌ها را از کجا ببینم؟',label:'مشاهده دوره‌ها',path:'/courses'},
 {question:'چطور با شما تماس بگیرم؟',label:'راه‌های ارتباطی',path:'/contact'},
];
const suggestionsFrom=(settings:any,sources:AssistantSource[],question:string)=>{
 const configured=Array.isArray(settings?.suggested_questions)?settings.suggested_questions:defaultSuggestions;
 const result:any[]=[];const seen=new Set([normalizeAssistantText(question)]);
 for(const source of sources){const normalized=normalizeAssistantText(source.question);if(!normalized||seen.has(normalized))continue;seen.add(normalized);result.push({question:source.question,label:source.question,path:''})}
 for(const item of configured){const q=String(item?.question||'').slice(0,500),normalized=normalizeAssistantText(q);if(!q||seen.has(normalized))continue;seen.add(normalized);result.push({question:q,label:String(item?.label||q).slice(0,100),path:safePublicPath(item?.path)})}
 return result.slice(0,4);
};
function safePublicPath(value:unknown){const raw=String(value||'').trim();if(!raw.startsWith('/')||raw.startsWith('/admin'))return '';try{const url=new URL(raw,'https://internal.local');return PUBLIC_PATHS.has(url.pathname)?url.pathname+url.search+url.hash:''}catch{return ''}}
function actionsFrom(sources:AssistantSource[]){const result:any[]=[];const seen=new Set<string>(),best=sources[0]?.score||0,minimum=Math.max(.45,best*.6);for(const source of sources){if(source.score<minimum)continue;const path=safePublicPath(source.link_url);if(!path||seen.has(path))continue;seen.add(path);result.push({label:source.link_label||'رفتن به بخش مرتبط',path})}return result.slice(0,3)}
function sourceRows(matches:ReturnType<typeof relatedKnowledge>):AssistantSource[]{return matches.map(({item,score})=>({id:String(item.id||''),question:String(item.question||''),answer:String(item.answer||''),category:String(item.category||'عمومی'),link_url:String(item.link_url||''),link_label:String(item.link_label||''),target_tab:'',target_focus:'',action_label:'',score:Math.round(score*1000)/1000}))}

serve(async req=>{
 const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return reply({error:'Origin not allowed'},403,origin);
 const db=getSupabaseAdmin();
 if(req.method==='GET'){
  const [{data:knowledge,error},{data:settings}]=await Promise.all([
   db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,source_url,priority,updated_at').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(500),
   db.from('assistant_settings').select('enabled,welcome_message,fallback_message,disclaimer,suggested_questions,updated_at').eq('key','default').maybeSingle(),
  ]);
  if(error)return reply({error:'Assistant unavailable'},503,origin);
  return reply({knowledge:knowledge||[],settings:settings||{enabled:false,suggested_questions:defaultSuggestions}},200,origin,'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405,origin);
 const body=await req.json().catch(()=>({}));const action=String(body.action||'');
 if(action==='generate'){
  const question=safe(body.question,500),clientId=String(body.client_id||'').trim();
  if(normalizeAssistantText(question).length<3||!/^[a-z0-9-]{16,80}$/i.test(clientId))return reply({error:'سؤال یا شناسه مرورگر معتبر نیست'},400,origin);
  const [{data:settings},{data:knowledge,error},minute,daily]=await Promise.all([
   db.from('assistant_settings').select('enabled,welcome_message,fallback_message,disclaimer,suggested_questions,admin_block_message').eq('key','default').maybeSingle(),
   db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,priority').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).limit(500),
   centralRateLimit(req,'assistant-public-mistral-3m',{maxRequests:10,windowMs:180_000},clientId),
   centralRateLimit(req,'assistant-public-mistral-day',{maxRequests:10,windowMs:86_400_000},clientId),
  ]);
  if(error)return reply({error:'دستیار موقتاً در دسترس نیست'},503,origin);
  if(settings?.enabled===false)return reply({error:'دستیار غیرفعال است'},503,origin);
  if(!minute.ok||!daily.ok)return reply({error:'سقف سؤال‌های این مرورگر رسیده است؛ بعداً دوباره تلاش کنید.'},429,origin);
  if(isPublicAdminQuestion(question)){
   const answer=String(settings?.admin_block_message||defaultFallback);
   return reply({ok:true,answer,model:'internal-policy',sources:[],actions:[],suggestions:suggestionsFrom(settings,[],question),provider_called:false,blocked_admin:true,remaining_daily:daily.remaining},200,origin);
  }
  let result;
  try{result=await generateGroundedAssistant({question,knowledge:knowledge||[],mode:'public',brand:BRAND})}
  catch(error){
   const matches=relatedKnowledge(question,knowledge||[],6),sources=sourceRows(matches);
   result={answer:String(matches[0]?.item?.answer||settings?.fallback_message||defaultFallback),model:'internal-fallback',sources,providerCalled:false};
   console.warn('assistant-public provider fallback:',String((error as Error)?.message||error));
  }
  const answer=result.answer||String(settings?.fallback_message||defaultFallback);
  return reply({ok:true,answer,model:result.model,sources:result.sources,actions:actionsFrom(result.sources),suggestions:suggestionsFrom(settings,result.sources,question),provider_called:result.providerCalled,blocked_admin:false,remaining_daily:daily.remaining},200,origin);
 }
 const rate=await centralRateLimit(req,`assistant-${action||'write'}`,{maxRequests:20,windowMs:60_000,blockMs:60_000});if(!rate.ok)return reply({error:'درخواست بیش از حد مجاز است'},429,origin);
 if(action==='unanswered'){
  const question=safe(body.question,500),normalized=normalizeAssistantText(question),page=safe(body.page_path,200);if(normalized.length<3)return reply({error:'سؤال معتبر نیست'},400,origin);
  const {data:existing}=await db.from('assistant_unanswered').select('id,occurrences').eq('question_normalized',normalized).maybeSingle();
  const result=existing?await db.from('assistant_unanswered').update({occurrences:Number(existing.occurrences||0)+1,last_seen_at:new Date().toISOString(),status:'pending',page_path:page||null}).eq('id',existing.id):await db.from('assistant_unanswered').insert({question,question_normalized:normalized,page_path:page||null});
  if(result.error)return reply({error:'ثبت سؤال انجام نشد'},503,origin);return reply({ok:true},200,origin);
 }
 return reply({error:'Action not allowed'},400,origin);
});
