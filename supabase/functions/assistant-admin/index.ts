import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin,corsHeaders} from '../_shared/cors.ts';
import {validateAdminSession,extractSessionToken} from '../_shared/adminAuth.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
import {findKnowledgeRule,normalizeAssistantText} from '../_shared/assistantMatch.ts';
import {generateGroundedAssistant,relatedKnowledge,sanitizeAssistantQuestion,type AssistantSource,type ScopedKnowledge} from '../_shared/generativeAssistant.ts';
import {cleanList,parseAssistantInstruction,safeAdminTab,safePublicPath,sanitizeKnowledgeActions,sanitizeMatchMode,sanitizeResponseMode} from '../_shared/assistantTraining.ts';
import {getAssistantTelegramStatus,repairAssistantTelegram} from '../_shared/assistantTelegramApi.ts';
import {buildAssistantKnowledgeBackup} from '../_shared/assistantKnowledgeExport.ts';
import {buildSiteContentKnowledge} from '../_shared/assistantSiteContent.ts';

const BRAND='زینالیکید';
const text=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);
const safeSource=(value:unknown)=>{const raw=text(value,500);if(!raw)return '';if(safePublicPath(raw))return safePublicPath(raw);try{const url=new URL(raw);return url.protocol==='https:'?url.toString():''}catch{return ''}};
const publicItem=(source:any)=>{
  const actions=sanitizeKnowledgeActions(source?.actions,source?.link_url,source?.link_label),first=actions[0];
  return {question:text(source?.question,500),answer:text(source?.answer,6000),aliases:cleanList(source?.aliases,30,500),keywords:cleanList(source?.keywords,30,100),category:text(source?.category||'عمومی',80),link_url:first?.path||'',link_label:first?.label||'',source_url:safeSource(source?.source_url),actions,response_mode:sanitizeResponseMode(source?.response_mode),match_mode:sanitizeMatchMode(source?.match_mode),status:source?.status==='published'?'published':'draft',is_active:source?.is_active!==false,priority:Math.max(-100,Math.min(100,Number(source?.priority)||0)),created_by:text(source?.created_by||'admin-panel',40)};
};
const adminItem=(source:any)=>({question:text(source?.question,500),answer:text(source?.answer,6000),aliases:cleanList(source?.aliases,30,500),keywords:cleanList(source?.keywords,30,100),category:text(source?.category||'مدیریت',80),response_mode:sanitizeResponseMode(source?.response_mode),match_mode:sanitizeMatchMode(source?.match_mode),status:source?.status==='published'?'published':'draft',is_active:source?.is_active!==false,priority:Math.max(-100,Math.min(100,Number(source?.priority)||0)),created_by:text(source?.created_by||'admin-panel',40),target_tab:safeAdminTab(source?.target_tab),target_focus:text(source?.target_focus,120),action_label:text(source?.action_label||'رفتن به بخش مرتبط',100)});
const adminSources=(matches:ReturnType<typeof relatedKnowledge>):AssistantSource[]=>matches.map(({item,score})=>{const row=item as any;return {id:String(row.id||''),question:String(row.question||''),answer:String(row.answer||''),category:String(row.category||'مدیریت'),link_url:String(row.link_url||''),link_label:String(row.link_label||''),target_tab:String(row.target_tab||''),target_focus:text(row.target_focus,120),action_label:text(row.action_label||'',100),actions:[],response_mode:String(row.response_mode||'grounded'),match_mode:String(row.match_mode||'smart'),score:Math.round(score*1000)/1000}});
const actionsFrom=(sources:AssistantSource[])=>{const best=sources[0]?.score||0,minimum=Math.max(.45,best*.6);return sources.filter(source=>source.score>=minimum&&safeAdminTab(source.target_tab)===source.target_tab).map(source=>({label:source.action_label||'رفتن به بخش مرتبط',tab:source.target_tab,focus:source.target_focus})).filter((item,index,array)=>array.findIndex(other=>other.tab===item.tab&&other.focus===item.focus)===index).slice(0,3)};
const publicActionsFrom=(source:any)=>sanitizeKnowledgeActions(source?.actions,source?.link_url,source?.link_label);
const suggestionsFrom=(sources:AssistantSource[],question:string)=>{const defaults=['چطور رمز پنل را تغییر بدهم؟','تنظیمات فرم‌ها را کجا تغییر بدهم؟','چطور یک دوره اضافه یا ویرایش کنم؟','یک مشتری را با بخشی از نام یا شماره پیدا کن'];const seen=new Set([normalizeAssistantText(question)]),result:string[]=[];for(const source of sources){const normalized=normalizeAssistantText(source.question);if(normalized&&!seen.has(normalized)){seen.add(normalized);result.push(source.question)}}for(const item of defaults){const normalized=normalizeAssistantText(item);if(!seen.has(normalized)){seen.add(normalized);result.push(item)}}return result.slice(0,4)};
const audit=async(db:any,auth:any,action:string,targetType:string,targetId='',metadata:Record<string,unknown>={})=>{try{await db.from('admin_audit_logs').insert({actor_phone:auth.session.ownerPhone,session_id:String(auth.session.sessionId),action,target_type:targetType,target_id:targetId||null,metadata,success:true})}catch{}};

const customerIntent=(value:string)=>{const n=normalizeAssistantText(value);return /(مشتری|کاربر|مراجع|ثبت نام|فرم|شماره|تلفن|کد پیگیری).{0,35}(پیدا|جستجو|بگرد|مشابه|لیست)|(پیدا|جستجو|بگرد|مشابه|لیست).{0,35}(مشتری|کاربر|مراجع|ثبت نام|فرم|شماره|تلفن|کد پیگیری)/.test(n)};
const searchTokens=(value:string)=>{const stop=new Set(['مشتری','کاربر','مراجع','ثبت','نام','فرم','شماره','تلفن','کد','پیگیری','پیدا','کن','کنم','جستجو','بگرد','مشابه','لیست','هرچی','هر','چه','با','که','رو','را','من','برای','اطلاعات']);return normalizeAssistantText(value).split(' ').filter(token=>token.length>1&&!stop.has(token)).slice(0,8)};
const maskPhone=(value:unknown)=>{const digits=String(value||'').replace(/\D/g,'');return digits.length<7?'':`${digits.slice(0,4)}***${digits.slice(-3)}`};
const maskName=(value:unknown)=>String(value||'').trim().split(/\s+/).filter(Boolean).map(part=>part.length<2?'*':`${part[0]}***${part.at(-1)}`).join(' ').slice(0,100);
async function searchCustomers(db:any,question:string,auth:any,origin:string){
  const tokens=searchTokens(question);if(!tokens.length)return jsonResponse({ok:true,answer:'برای جست‌وجو بخشی از نام، شماره تماس، کد پیگیری، نام دوره یا موضوع مشاوره را هم بنویسید.',model:'internal-private-search',sources:[],actions:[],suggestions:['مشتری را با بخشی از شماره تماس پیدا کن','ثبت‌های مربوط به یک نام را لیست کن'],customer_results:[],provider_called:false},200,origin);
  const {data,error}=await db.from('submissions').select('id,full_phone,payload,tracking_code,submission_type,order_status,consultation_status,course_id,created_at,deleted_at').is('deleted_at',null).order('created_at',{ascending:false}).limit(2000);if(error)throw error;
  const matches=(data||[]).filter((row:any)=>{const payload=row.payload&&typeof row.payload==='object'?row.payload:{};const hay=normalizeAssistantText([row.full_phone,row.tracking_code,row.submission_type,row.course_id,payload.pName,payload.pPhone,payload.fullPhone,payload.trackingCode,payload.type,payload.category,(payload.topics||[]).join(' '),payload.course?.title,payload.course?.titleEn,payload.childInfo?.name,payload.shipping?.city].join(' '));return tokens.every(token=>hay.includes(token))}).slice(0,20);
  const results=matches.map((row:any)=>{const p=row.payload||{};return {id:String(row.id),name:maskName(p.pName||p.childInfo?.name||'بدون نام'),phone:maskPhone(row.full_phone||p.fullPhone||p.pPhone),type:String(row.submission_type||p.type||((p.course||row.course_id)?'course':'consultation')),course:text(p.course?.title||p.course?.titleEn||row.course_id||'',120),topics:Array.isArray(p.topics)?p.topics.map((x:unknown)=>text(x,80)).slice(0,3):[],status:text(row.order_status||row.consultation_status||p.orderStatus||p.consultationStatus||'',80),date:String(row.created_at||p.date||'').slice(0,10)}});
  await audit(db,auth,'assistant_customer_search','submissions','',{result_count:results.length,token_count:tokens.length});
  return jsonResponse({ok:true,answer:results.length?`${results.length} نتیجه منطبق پیدا شد. شماره‌ها و نام‌ها در چت ماسک شده‌اند؛ برای جزئیات کامل پرونده را داخل پنل باز کنید.`:'نتیجه منطبقی پیدا نشد. بخشی دیگر از نام، شماره، کد پیگیری، دوره یا موضوع را امتحان کنید.',model:'internal-private-search',sources:[],actions:[],suggestions:['جست‌وجو با بخشی از شماره تماس','جست‌وجو با نام دوره یا موضوع مشاوره'],customer_results:results,provider_called:false},200,origin);
}

type KnowledgeScope='public'|'admin';
type KnowledgeSelection=KnowledgeScope|'both';
const selectionFrom=(_value:unknown):KnowledgeSelection=>'public';
const selectedScopes=(selection:KnowledgeSelection):KnowledgeScope[]=>selection==='both'?['public','admin']:[selection];
const tableFor=(scope:KnowledgeScope)=>scope==='admin'?'assistant_admin_knowledge':'assistant_knowledge';
const itemFor=(scope:KnowledgeScope,source:any)=>scope==='admin'?adminItem(source):publicItem(source);
async function matchingKnowledgeId(db:any,scope:KnowledgeScope,question:string){
  const {data,error}=await db.from(tableFor(scope)).select('id,question').limit(5000);if(error)throw error;const needle=normalizeAssistantText(question);return String((data||[]).find((row:any)=>normalizeAssistantText(row.question)===needle)?.id||'');
}
async function saveKnowledgeScope(db:any,scope:KnowledgeScope,source:any,requestedId='',matchQuestion=''){
  const item:any=itemFor(scope,source);if(item.question.length<2||item.answer.length<2)throw new Error('ASSISTANT_REQUIRED_FIELDS');
  const tableName=tableFor(scope),table:any=db.from(tableName),id=text(requestedId,50)||(matchQuestion?await matchingKnowledgeId(db,scope,matchQuestion):''),query=id?table.update(item).eq('id',id).select().single():table.insert(item).select().single(),{data,error}=await query;if(error)throw error;return {item:data,scope,id:String(data?.id||''),tableName,created:!id};
}

async function testKnowledge(db:any,scope:KnowledgeScope,question:string){
  const table=scope==='admin'?'assistant_admin_knowledge':'assistant_knowledge';
  const fields=scope==='admin'?'id,question,answer,aliases,keywords,category,priority,target_tab,target_focus,action_label,response_mode,match_mode':'id,question,answer,aliases,keywords,category,priority,link_url,link_label,actions,response_mode,match_mode';
  const {data,error}=await db.from(table).select(fields).eq('status','published').eq('is_active',true).order('priority',{ascending:false}).limit(500);if(error)throw error;
  const [{data:siteCfg},{data:siteReviews}]=await Promise.all([db.from('settings').select('settings').eq('key','app_settings').maybeSingle(),db.from('reviews').select('id,reviewer_name,rating,comment,course_id,course_ids').eq('status','approved').limit(40)]);
  const knowledge=[...(data||[]),...buildSiteContentKnowledge(siteCfg?.settings||{},siteReviews||[])] as ScopedKnowledge[],fixed=findKnowledgeRule(question,knowledge);
  if(fixed){const row:any=fixed.item;return {ok:true,answer:String(row.answer||''),model:row.response_mode==='refusal'?'internal-refusal-rule':'internal-exact-rule',sources:adminSources([{item:row,score:fixed.score}] as any),actions:scope==='admin'?actionsFrom(adminSources([{item:row,score:fixed.score}] as any)):publicActionsFrom(row),provider_called:false,needs_training:false,confidence:fixed.score}}
  try{const result=await generateGroundedAssistant({question,knowledge,mode:scope==='admin'?'admin':'public',brand:BRAND,db}),confidence=Number(result.sources[0]?.score||0);return {ok:true,answer:result.answer||'برای این سؤال دانش منتشرشده‌ای پیدا نشد.',model:result.model,sources:result.sources,actions:scope==='admin'?actionsFrom(result.sources):result.sources.flatMap(source=>publicActionsFrom(source)).filter((item,index,array)=>array.findIndex(other=>other.path===item.path)===index).slice(0,3),provider_called:result.providerCalled,needs_training:confidence<.6,confidence}}
  catch{const matches=relatedKnowledge(question,knowledge,3),row:any=matches[0]?.item,confidence=Number(matches[0]?.score||0);return {ok:true,answer:String(row?.answer||'برای این سؤال دانش منتشرشده‌ای پیدا نشد.'),model:'internal-fallback',sources:adminSources(matches),actions:scope==='admin'?actionsFrom(adminSources(matches)):publicActionsFrom(row),provider_called:false,needs_training:confidence<.6,confidence}}
}

serve(async req=>{
  const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return jsonResponse({error:'Origin not allowed'},403,origin);if(req.method!=='POST')return jsonResponse({error:'Method not allowed'},405,origin);
  const body=await req.json().catch(()=>({})),token=extractSessionToken(req,body),auth=await validateAdminSession(token);if(!auth.ok)return jsonResponse({error:'دسترسی غیرمجاز'},401,origin);const action=String(body.action||'');
  const general=await centralRateLimit(req,`assistant-admin-${action}`,{maxRequests:90,windowMs:60_000,blockMs:60_000},auth.session.sessionId);if(!general.ok)return jsonResponse({error:'درخواست بیش از حد مجاز است'},429,origin);const db=getSupabaseAdmin();
  try{
    if(action==='list'){
      const [{data:knowledge,error},{data:adminKnowledge},{data:settings},{data:unanswered}]=await Promise.all([db.from('assistant_knowledge').select('*').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(1000),db.from('assistant_admin_knowledge').select('*').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(1000),db.from('assistant_settings').select('*').eq('key','default').maybeSingle(),db.from('assistant_unanswered').select('*').order('status').order('occurrences',{ascending:false}).order('last_seen_at',{ascending:false}).limit(300)]);if(error)throw error;return jsonResponse({knowledge:knowledge||[],adminKnowledge:adminKnowledge||[],settings:settings||{},unanswered:unanswered||[]},200,origin);
    }
    if(action==='generate_admin'||action==='generate_preview')return jsonResponse({error:'دستیار پنل مدیریت حذف شده است؛ دانش‌ها یک مجموعه مشترک برای صفحات عمومی هستند'},410,origin);
    if(action==='test_knowledge'){
      const question=sanitizeAssistantQuestion(body.question),selection=selectionFrom(body.scope);if(normalizeAssistantText(question).length<2)return jsonResponse({error:'سؤال آزمایشی معتبر نیست'},400,origin);
      if(selection==='both'){
        const [publicResult,adminResult]=await Promise.all([testKnowledge(db,'public',question),testKnowledge(db,'admin',question)]);await audit(db,auth,'assistant_knowledge_test','assistant_knowledge','',{scope:'both',models:{public:publicResult.model,admin:adminResult.model}});return jsonResponse({ok:true,scope:'both',results:{public:publicResult,admin:adminResult},needs_training:publicResult.needs_training===true||adminResult.needs_training===true,provider_called:publicResult.provider_called||adminResult.provider_called},200,origin);
      }
      const result=await testKnowledge(db,selection,question);await audit(db,auth,'assistant_knowledge_test',tableFor(selection),'',{scope:selection,model:result.model});return jsonResponse({...result,scope:selection},200,origin);
    }
    if(action==='parse_instruction'){
      const limited=await centralRateLimit(req,'assistant-instruction-parser',{maxRequests:10,windowMs:60_000,blockMs:60_000},auth.session.sessionId);if(!limited.ok)return jsonResponse({error:'لطفاً کمی بعد دوباره تلاش کنید.'},429,origin);const selection=selectionFrom(body.scope),parsed=await parseAssistantInstruction({instruction:body.instruction,brand:BRAND,scopeHint:selection==='admin'?'admin':'public'});return jsonResponse({ok:true,draft:{...parsed,scope:selection}},200,origin);
    }
    if(action==='telegram_status')return jsonResponse({ok:true,status:await getAssistantTelegramStatus()},200,origin);
    if(action==='telegram_repair'){const status=await repairAssistantTelegram(BRAND);await audit(db,auth,'assistant_telegram_repair','assistant_telegram');return jsonResponse({ok:true,status},200,origin)}
    if(action==='export_knowledge'){
      const backup=await buildAssistantKnowledgeBackup(db,BRAND);await audit(db,auth,'assistant_knowledge_export','assistant_knowledge','',{counts:backup.counts});return new Response(backup.content,{status:200,headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="${backup.filename}"`,'X-Backup-Filename':backup.filename,'Access-Control-Expose-Headers':'Content-Disposition, X-Backup-Filename',...corsHeaders(origin)}});
    }
    if(action==='save'){
      const selection=selectionFrom(body.scope),source=body.item||{};if(text(source.question,500).length<2||text(source.answer,6000).length<2)return jsonResponse({error:'سؤال و پاسخ الزامی است'},400,origin);
      const matchQuestion=selection==='both'?text(source.original_question||source.question,500):'',results:any[]=[];
      for(const scope of selectedScopes(selection)){
        const requestedId=text(source?.[`${scope}_id`]||(source?.source_scope===scope?source?.id:''),50)||(selection!=='both'?text(source?.id,50):'');
        const saved=await saveKnowledgeScope(db,scope,source,requestedId,matchQuestion);results.push(saved);await audit(db,auth,saved.created?'assistant_create':'assistant_update',saved.tableName,saved.id,{status:saved.item?.status,scope,response_mode:saved.item?.response_mode,match_mode:saved.item?.match_mode,selection});
      }
      if(selection==='both')return jsonResponse({ok:true,scope:'both',items:Object.fromEntries(results.map(result=>[result.scope,result.item]))},200,origin);return jsonResponse({item:results[0].item,scope:selection},200,origin);
    }
    if(action==='delete'){
      const selection=selectionFrom(body.scope),id=text(body.id,50);if(body.confirm!==true||(!id&&!text(body.question,500)))return jsonResponse({error:'تأیید حذف لازم است'},400,origin);
      if(selection!=='both'){
        const table=tableFor(selection);const {error}=await db.from(table).delete().eq('id',id);if(error)throw error;await audit(db,auth,'assistant_delete',table,id,{scope:selection});return jsonResponse({ok:true,deleted:{[selection]:id?1:0}},200,origin);
      }
      let question=text(body.question,500);if(!question&&id){for(const scope of selectedScopes(selection)){const {data}=await db.from(tableFor(scope)).select('question').eq('id',id).maybeSingle();if(data?.question){question=String(data.question);break}}}
      const needle=normalizeAssistantText(question),deleted:Record<KnowledgeScope,number>={public:0,admin:0};
      for(const scope of selectedScopes(selection)){
        const table=tableFor(scope),explicitId=text(body?.[`${scope}_id`],50),{data,error:listError}=await db.from(table).select('id,question').limit(5000);if(listError)throw listError;const ids=(data||[]).filter((row:any)=>normalizeAssistantText(row.question)===needle||String(row.id)===explicitId||String(row.id)===id).map((row:any)=>String(row.id));if(ids.length){const {error}=await db.from(table).delete().in('id',ids);if(error)throw error;deleted[scope]=ids.length;await audit(db,auth,'assistant_delete',table,ids[0],{scope,selection:'both',count:ids.length})}
      }
      return jsonResponse({ok:true,deleted},200,origin);
    }
    if(action==='settings'){
      const suggestions=Array.isArray(body.settings?.suggested_questions)?body.settings.suggested_questions.slice(0,10).map((item:any)=>({question:text(item?.question,500),label:text(item?.label||item?.question,100),path:safePublicPath(item?.path)})).filter((item:any)=>item.question):[];const settings={enabled:body.settings?.enabled===true,welcome_message:text(body.settings?.welcome_message,1000),fallback_message:text(body.settings?.fallback_message,1500),disclaimer:text(body.settings?.disclaimer,1200),admin_block_message:text(body.settings?.admin_block_message,1500),suggested_questions:suggestions,frequent_question_threshold:Math.max(2,Math.min(100,Number(body.settings?.frequent_question_threshold)||3))},{data,error}=await db.from('assistant_settings').update(settings).eq('key','default').select().single();if(error)throw error;await audit(db,auth,'assistant_settings_update','assistant_settings','default',{enabled:settings.enabled,revision:Number(data?.revision||0)});return jsonResponse({settings:data},200,origin);
    }
    if(action==='unanswered_status'){const id=Number(body.id),status=['pending','resolved','ignored'].includes(body.status)?body.status:'pending';if(!Number.isSafeInteger(id))return jsonResponse({error:'شناسه معتبر نیست'},400,origin);const {error}=await db.from('assistant_unanswered').update({status}).eq('id',id);if(error)throw error;return jsonResponse({ok:true},200,origin)}
    if(action==='batch_import'){
      const incoming=Array.isArray(body.items)?body.items.slice(0,150):[],selection=selectionFrom(body.scope),imported:Record<KnowledgeScope,number>={public:0,admin:0};
      for(const scope of selectedScopes(selection)){
        const table=tableFor(scope),{data:existing,error:listError}=await db.from(table).select('question').limit(5000);if(listError)throw listError;const known=new Set((existing||[]).map((item:any)=>normalizeAssistantText(item.question))),rows=incoming.map((item:any)=>itemFor(scope,item)).filter((item:any)=>item.question.length>1&&item.answer.length>1&&!known.has(normalizeAssistantText(item.question)));if(rows.length){const {error}=await db.from(table).insert(rows);if(error)throw error;imported[scope]=rows.length;await audit(db,auth,'assistant_import',table,'',{scope,selection,count:rows.length})}
      }
      return jsonResponse({ok:true,scope:selection,imported:selection==='both'?imported:imported[selection],counts:imported},200,origin);
    }
    return jsonResponse({error:'Action not allowed'},400,origin);
  }catch(error){const code=String((error as Error)?.message||error);console.error('assistant-admin:',code);const friendly=code.startsWith('MISTRAL_')?'تحلیل هوشمند موقتاً در دسترس نیست؛ دوباره تلاش کنید.':code.startsWith('TELEGRAM_')?'اتصال تلگرام کامل نیست یا موقتاً پاسخ نمی‌دهد.':'عملیات دستیار انجام نشد';return jsonResponse({error:friendly},500,origin)}
});
