import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin} from '../_shared/cors.ts';
import {validateAdminSession,extractSessionToken} from '../_shared/adminAuth.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
const text=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);
const list=(value:unknown,maxItems=30)=>Array.isArray(value)?value.map(item=>text(item,100)).filter(Boolean).slice(0,maxItems):String(value||'').split(/[,،|\n]/).map(item=>item.trim()).filter(Boolean).slice(0,maxItems);
const safeLink=(value:unknown)=>{const link=text(value,500);return !link||link.startsWith('/')||/^https:\/\//i.test(link)?link:''};
const cleanItem=(source:any)=>({question:text(source?.question,500),answer:text(source?.answer,6000),aliases:list(source?.aliases),keywords:list(source?.keywords),category:text(source?.category||'عمومی',80),link_url:safeLink(source?.link_url),link_label:text(source?.link_label,100),source_url:safeLink(source?.source_url),status:source?.status==='published'?'published':'draft',is_active:source?.is_active!==false,priority:Math.max(-100,Math.min(100,Number(source?.priority)||0)),created_by:text(source?.created_by||'admin-panel',40)});
serve(async req=>{const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return jsonResponse({error:'Origin not allowed'},403,origin);if(req.method!=='POST')return jsonResponse({error:'Method not allowed'},405,origin);
 const body=await req.json().catch(()=>({}));const token=extractSessionToken(req,body),auth=await validateAdminSession(token);if(!auth.ok)return jsonResponse({error:'دسترسی غیرمجاز'},401,origin);const action=String(body.action||'');const rate=await centralRateLimit(req,`assistant-admin-${action}`,{maxRequests:90,windowMs:60_000,blockMs:60_000},auth.session.sessionId);if(!rate.ok)return jsonResponse({error:'درخواست بیش از حد مجاز است'},429,origin);const db=getSupabaseAdmin();
 try{
  if(action==='list'){
   const [{data:knowledge,error},{data:settings},{data:unanswered},{data:feedback}]=await Promise.all([db.from('assistant_knowledge').select('*').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(1000),db.from('assistant_settings').select('*').eq('key','default').maybeSingle(),db.from('assistant_unanswered').select('*').order('status').order('occurrences',{ascending:false}).order('last_seen_at',{ascending:false}).limit(300),db.from('assistant_feedback').select('knowledge_id,helpful').limit(5000)]);if(error)throw error;return jsonResponse({knowledge:knowledge||[],settings:settings||{},unanswered:unanswered||[],feedback:feedback||[]},200,origin);
  }
  if(action==='save'){
   const item=cleanItem(body.item);if(item.question.length<2||item.answer.length<2)return jsonResponse({error:'سؤال و پاسخ الزامی است'},400,origin);const id=text(body.item?.id,50);const query=id?db.from('assistant_knowledge').update(item).eq('id',id).select().single():db.from('assistant_knowledge').insert(item).select().single();const {data,error}=await query;if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:id?'assistant_update':'assistant_create',target_type:'assistant_knowledge',target_id:String(data?.id||''),metadata:{status:item.status},success:true});return jsonResponse({item:data},200,origin);
  }
  if(action==='delete'){
   const id=text(body.id,50);if(!id||body.confirm!==true)return jsonResponse({error:'تأیید حذف لازم است'},400,origin);const {error}=await db.from('assistant_knowledge').delete().eq('id',id);if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:'assistant_delete',target_type:'assistant_knowledge',target_id:id,metadata:{},success:true});return jsonResponse({ok:true},200,origin);
  }
  if(action==='settings'){
   const settings={enabled:body.settings?.enabled!==false,welcome_message:text(body.settings?.welcome_message,1000),fallback_message:text(body.settings?.fallback_message,1500),disclaimer:text(body.settings?.disclaimer,1200)};const {data,error}=await db.from('assistant_settings').update(settings).eq('key','default').select().single();if(error)throw error;return jsonResponse({settings:data},200,origin);
  }
  if(action==='unanswered_status'){
   const id=Number(body.id),status=['pending','resolved','ignored'].includes(body.status)?body.status:'pending';if(!Number.isSafeInteger(id))return jsonResponse({error:'شناسه معتبر نیست'},400,origin);const {error}=await db.from('assistant_unanswered').update({status}).eq('id',id);if(error)throw error;return jsonResponse({ok:true},200,origin);
  }
  if(action==='batch_import'){
   const incoming=Array.isArray(body.items)?body.items.slice(0,150):[];const {data:existing}=await db.from('assistant_knowledge').select('question');const known=new Set((existing||[]).map((item:any)=>String(item.question||'').trim().toLowerCase()));const rows=incoming.map(cleanItem).filter(item=>item.question.length>1&&item.answer.length>1&&!known.has(item.question.toLowerCase()));if(!rows.length)return jsonResponse({ok:true,imported:0},200,origin);const {error}=await db.from('assistant_knowledge').insert(rows);if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:'assistant_import',target_type:'assistant_knowledge',metadata:{count:rows.length},success:true});return jsonResponse({ok:true,imported:rows.length},200,origin);
  }
  return jsonResponse({error:'Action not allowed'},400,origin);
 }catch(error){console.error('assistant-admin:',String((error as Error)?.message||error));return jsonResponse({error:'عملیات دستیار انجام نشد'},500,origin)}
});
