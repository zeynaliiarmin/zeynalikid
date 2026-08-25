import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin} from '../_shared/cors.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
import {normalizeAssistantText} from '../_shared/assistantMatch.ts';
const safe=(value:unknown,max=500)=>String(value||'').replace(/(\+98|0098|0)9\d{9}/g,'[PHONE]').replace(/\b\d{16}\b/g,'[CARD]').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'[EMAIL]').slice(0,max).trim();
const reply=(body:unknown,status:number,origin:string,cache='no-store')=>{const response=jsonResponse(body,status,origin);response.headers.set('Cache-Control',cache);return response};
serve(async req=>{const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return reply({error:'Origin not allowed'},403,origin);
 const db=getSupabaseAdmin();
 if(req.method==='GET'){
  const [{data:knowledge,error},{data:settings}]=await Promise.all([db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,source_url,priority,updated_at').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(500),db.from('assistant_settings').select('enabled,welcome_message,fallback_message,disclaimer,updated_at').eq('key','default').maybeSingle()]);
  if(error)return reply({error:'Assistant unavailable'},503,origin);return reply({knowledge:knowledge||[],settings:settings||{enabled:false}},200,origin,'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405,origin);
 const body=await req.json().catch(()=>({}));const action=String(body.action||'');const rate=await centralRateLimit(req,`assistant-${action||'write'}`,{maxRequests:20,windowMs:60_000,blockMs:60_000});if(!rate.ok)return reply({error:'درخواست بیش از حد مجاز است'},429,origin);
 if(action==='unanswered'){
  const question=safe(body.question,500),normalized=normalizeAssistantText(question),page=safe(body.page_path,200);if(normalized.length<3)return reply({error:'سؤال معتبر نیست'},400,origin);
  const {data:existing}=await db.from('assistant_unanswered').select('id,occurrences').eq('question_normalized',normalized).maybeSingle();
  const result=existing?await db.from('assistant_unanswered').update({occurrences:Number(existing.occurrences||0)+1,last_seen_at:new Date().toISOString(),status:'pending',page_path:page||null}).eq('id',existing.id):await db.from('assistant_unanswered').insert({question,question_normalized:normalized,page_path:page||null});
  if(result.error)return reply({error:'ثبت سؤال انجام نشد'},503,origin);return reply({ok:true},200,origin);
 }
 if(action==='feedback'){
  const id=String(body.knowledge_id||'');if(!/^[0-9a-f-]{36}$/i.test(id)||typeof body.helpful!=='boolean')return reply({error:'بازخورد معتبر نیست'},400,origin);
  const {error}=await db.from('assistant_feedback').insert({knowledge_id:id,helpful:body.helpful});if(error)return reply({error:'ثبت بازخورد انجام نشد'},503,origin);return reply({ok:true},200,origin);
 }
 return reply({error:'Action not allowed'},400,origin);
});
