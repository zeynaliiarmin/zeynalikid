import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin} from '../_shared/cors.ts';
import {validateAdminSession,extractSessionToken} from '../_shared/adminAuth.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
import {normalizeAssistantText} from '../_shared/assistantMatch.ts';
import {generateGroundedAssistant,relatedKnowledge,sanitizeAssistantQuestion,type AssistantSource} from '../_shared/generativeAssistant.ts';

const BRAND='زینالیکید';
const ADMIN_TABS=new Set(['dashboard','data','userQuestions','assistant','reviews','consultants','courses','featured','tagged','products','services','trustbox','trust','shipping','content','images','highlights','licenses','contacts','settings','design','security','analytics','errors','trash']);
const text=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);
const list=(value:unknown,maxItems=30)=>Array.isArray(value)?value.map(item=>text(item,100)).filter(Boolean).slice(0,maxItems):String(value||'').split(/[,،|\n]/).map(item=>item.trim()).filter(Boolean).slice(0,maxItems);
const safeLink=(value:unknown)=>{const link=text(value,500);return !link||(/^\/(?!admin(?:\/|$))/i.test(link))?link:''};
const safeTab=(value:unknown)=>{const tab=text(value,50);return ADMIN_TABS.has(tab)?tab:'dashboard'};
const publicItem=(source:any)=>({question:text(source?.question,500),answer:text(source?.answer,6000),aliases:list(source?.aliases),keywords:list(source?.keywords),category:text(source?.category||'عمومی',80),link_url:safeLink(source?.link_url),link_label:text(source?.link_label,100),source_url:safeLink(source?.source_url),status:source?.status==='published'?'published':'draft',is_active:source?.is_active!==false,priority:Math.max(-100,Math.min(100,Number(source?.priority)||0)),created_by:text(source?.created_by||'admin-panel',40)});
const adminItem=(source:any)=>({question:text(source?.question,500),answer:text(source?.answer,6000),aliases:list(source?.aliases),keywords:list(source?.keywords),category:text(source?.category||'مدیریت',80),status:source?.status==='published'?'published':'draft',is_active:source?.is_active!==false,priority:Math.max(-100,Math.min(100,Number(source?.priority)||0)),created_by:text(source?.created_by||'admin-panel',40),target_tab:safeTab(source?.target_tab),target_focus:text(source?.target_focus,120),action_label:text(source?.action_label||'رفتن به بخش مرتبط',100)});
const adminSources=(matches:ReturnType<typeof relatedKnowledge>):AssistantSource[]=>matches.map(({item,score})=>{const row=item as any;return {id:String(row.id||''),question:String(row.question||''),answer:String(row.answer||''),category:String(row.category||'مدیریت'),link_url:'',link_label:'',target_tab:safeTab(row.target_tab),target_focus:text(row.target_focus,120),action_label:text(row.action_label||'رفتن به بخش مرتبط',100),score:Math.round(score*1000)/1000}});
const actionsFrom=(sources:AssistantSource[])=>{const best=sources[0]?.score||0,minimum=Math.max(.45,best*.6);return sources.filter(source=>source.score>=minimum&&ADMIN_TABS.has(source.target_tab)).map(source=>({label:source.action_label||'رفتن به بخش مرتبط',tab:source.target_tab,focus:source.target_focus})).filter((item,index,array)=>array.findIndex(other=>other.tab===item.tab&&other.focus===item.focus)===index).slice(0,3)};
const suggestionsFrom=(sources:AssistantSource[],question:string)=>{const defaults=['چطور رمز پنل را تغییر بدهم؟','تنظیمات فرم‌ها را کجا تغییر بدهم؟','چطور یک دوره اضافه یا ویرایش کنم؟','فرم‌ها و سفارش‌ها را از کجا مدیریت کنم؟'];const seen=new Set([normalizeAssistantText(question)]),result:string[]=[];for(const source of sources){const normalized=normalizeAssistantText(source.question);if(normalized&&!seen.has(normalized)){seen.add(normalized);result.push(source.question)}}for(const item of defaults){const normalized=normalizeAssistantText(item);if(!seen.has(normalized)){seen.add(normalized);result.push(item)}}return result.slice(0,4)};
const providerFailure:Record<string,{status:number;message:string}>={MISTRAL_NOT_CONFIGURED:{status:503,message:'سرویس مولد در سرور تنظیم نشده است.'},MISTRAL_RATE_LIMIT:{status:429,message:'سهمیه رایگان Mistral موقتاً در دسترس نیست.'},MISTRAL_AUTH:{status:503,message:'احراز هویت سرویس Mistral انجام نشد.'},MISTRAL_TIMEOUT:{status:504,message:'پاسخ Mistral بیش از حد طول کشید.'},MISTRAL_NETWORK:{status:502,message:'ارتباط سرور با Mistral برقرار نشد.'},MISTRAL_EMPTY:{status:502,message:'Mistral پاسخ قابل‌استفاده‌ای برنگرداند.'},MISTRAL_PROVIDER:{status:502,message:'سرویس Mistral موقتاً در دسترس نیست.'}};

serve(async req=>{
 const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return jsonResponse({error:'Origin not allowed'},403,origin);if(req.method!=='POST')return jsonResponse({error:'Method not allowed'},405,origin);
 const body=await req.json().catch(()=>({}));const token=extractSessionToken(req,body),auth=await validateAdminSession(token);if(!auth.ok)return jsonResponse({error:'دسترسی غیرمجاز'},401,origin);const action=String(body.action||'');
 const general=await centralRateLimit(req,`assistant-admin-${action}`,{maxRequests:90,windowMs:60_000,blockMs:60_000},auth.session.sessionId);if(!general.ok)return jsonResponse({error:'درخواست بیش از حد مجاز است'},429,origin);const db=getSupabaseAdmin();
 try{
  if(action==='list'){
   const [{data:knowledge,error},{data:adminKnowledge},{data:settings},{data:unanswered}]=await Promise.all([
    db.from('assistant_knowledge').select('*').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(1000),
    db.from('assistant_admin_knowledge').select('*').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(1000),
    db.from('assistant_settings').select('*').eq('key','default').maybeSingle(),
    db.from('assistant_unanswered').select('*').order('status').order('occurrences',{ascending:false}).order('last_seen_at',{ascending:false}).limit(300),
   ]);if(error)throw error;return jsonResponse({knowledge:knowledge||[],adminKnowledge:adminKnowledge||[],settings:settings||{},unanswered:unanswered||[]},200,origin);
  }
  if(action==='generate_admin'||action==='generate_preview'){
   const question=sanitizeAssistantQuestion(body.question);if(normalizeAssistantText(question).length<3)return jsonResponse({error:'سؤال مدیریتی معتبر نیست'},400,origin);
   const [{data:knowledge,error},limit]=await Promise.all([
    db.from('assistant_admin_knowledge').select('id,question,answer,aliases,keywords,category,priority,target_tab,target_focus,action_label').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).limit(500),
    centralRateLimit(req,'assistant-admin-mistral-2m',{maxRequests:10,windowMs:120_000},auth.session.sessionId),
   ]);if(error)throw error;if(!limit.ok)return jsonResponse({error:'حداکثر ۱۰ سؤال در هر دو دقیقه مجاز است؛ کمی بعد دوباره تلاش کنید.'},429,origin);
   const matches=relatedKnowledge(question,knowledge||[],6),fallbackSources=adminSources(matches);
   let result;let providerError='';
   try{result=await generateGroundedAssistant({question,knowledge:knowledge||[],mode:'admin',brand:BRAND})}
   catch(error){providerError=String((error as Error)?.message||'MISTRAL_PROVIDER');result={answer:String(matches[0]?.item?.answer||''),model:'internal-fallback',sources:fallbackSources,providerCalled:false}}
   const answer=result.answer||'در راهنمای مدیریتی تأییدشده، اطلاعات کافی برای این سؤال ندارم. می‌توانید درباره تنظیمات، فرم‌ها، دوره‌ها، محتوا، امنیت یا سایر بخش‌های پنل سؤال کنید.';
   await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:'assistant_admin_generate',target_type:'assistant_admin_knowledge',metadata:{provider:result.providerCalled?'mistral':'internal',model:result.model,source_count:result.sources.length,error_code:providerError.slice(0,80)},success:true});
   return jsonResponse({ok:true,answer,model:result.model,sources:result.sources,actions:actionsFrom(result.sources),suggestions:suggestionsFrom(result.sources,question),provider_called:result.providerCalled,remaining:limit.remaining,provider_notice:providerError?(providerFailure[providerError]?.message||'پاسخ داخلی نمایش داده شد.'):''},200,origin);
  }
  if(action==='save'){
   const scope=body.scope==='admin'?'admin':'public',item=scope==='admin'?adminItem(body.item):publicItem(body.item);if(item.question.length<2||item.answer.length<2)return jsonResponse({error:'سؤال و پاسخ الزامی است'},400,origin);const id=text(body.item?.id,50),table=scope==='admin'?'assistant_admin_knowledge':'assistant_knowledge';const query=id?db.from(table).update(item).eq('id',id).select().single():db.from(table).insert(item).select().single();const {data,error}=await query;if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:id?'assistant_update':'assistant_create',target_type:table,target_id:String(data?.id||''),metadata:{status:item.status,scope},success:true});return jsonResponse({item:data,scope},200,origin);
  }
  if(action==='delete'){
   const scope=body.scope==='admin'?'admin':'public',id=text(body.id,50),table=scope==='admin'?'assistant_admin_knowledge':'assistant_knowledge';if(!id||body.confirm!==true)return jsonResponse({error:'تأیید حذف لازم است'},400,origin);const {error}=await db.from(table).delete().eq('id',id);if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:'assistant_delete',target_type:table,target_id:id,metadata:{scope},success:true});return jsonResponse({ok:true},200,origin);
  }
  if(action==='settings'){
   const settings={enabled:body.settings?.enabled!==false,welcome_message:text(body.settings?.welcome_message,1000),fallback_message:text(body.settings?.fallback_message,1500),disclaimer:text(body.settings?.disclaimer,1200),admin_block_message:text(body.settings?.admin_block_message,1500),suggested_questions:Array.isArray(body.settings?.suggested_questions)?body.settings.suggested_questions.slice(0,10):[]};const {data,error}=await db.from('assistant_settings').update(settings).eq('key','default').select().single();if(error)throw error;return jsonResponse({settings:data},200,origin);
  }
  if(action==='unanswered_status'){const id=Number(body.id),status=['pending','resolved','ignored'].includes(body.status)?body.status:'pending';if(!Number.isSafeInteger(id))return jsonResponse({error:'شناسه معتبر نیست'},400,origin);const {error}=await db.from('assistant_unanswered').update({status}).eq('id',id);if(error)throw error;return jsonResponse({ok:true},200,origin)}
  if(action==='batch_import'){
   const incoming=Array.isArray(body.items)?body.items.slice(0,150):[],{data:existing}=await db.from('assistant_knowledge').select('question'),known=new Set((existing||[]).map((item:any)=>String(item.question||'').trim().toLowerCase())),rows=incoming.map(publicItem).filter(item=>item.question.length>1&&item.answer.length>1&&!known.has(item.question.toLowerCase()));if(!rows.length)return jsonResponse({ok:true,imported:0},200,origin);const {error}=await db.from('assistant_knowledge').insert(rows);if(error)throw error;await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action:'assistant_import',target_type:'assistant_knowledge',metadata:{count:rows.length},success:true});return jsonResponse({ok:true,imported:rows.length},200,origin);
  }
  return jsonResponse({error:'Action not allowed'},400,origin);
 }catch(error){console.error('assistant-admin:',String((error as Error)?.message||error));return jsonResponse({error:'عملیات دستیار انجام نشد'},500,origin)}
});
