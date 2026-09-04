import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {handleOptions,jsonResponse,getOrigin} from '../_shared/cors.ts';
import {centralRateLimit} from '../_shared/rateLimit.ts';
import {generateGroundedAssistant,isPublicAdminQuestion,isPublicPrivateDataQuestion,relatedKnowledge,sanitizeAssistantQuestion,type AssistantSource,type ScopedKnowledge} from '../_shared/generativeAssistant.ts';
import {findKnowledgeRule,normalizeAssistantText} from '../_shared/assistantMatch.ts';
import {safePublicPath,sanitizeKnowledgeActions} from '../_shared/assistantTraining.ts';
import {trackAssistantQuestion} from '../_shared/assistantInsights.ts';
import {buildSiteContentKnowledge} from '../_shared/assistantSiteContent.ts';
import {whoGrowthAnswer} from '../_shared/whoGrowth.ts';
import {needsOwnerReviewForAnswer,type UnansweredDetectionReason} from '../_shared/assistantCuration.ts';

const BRAND='زینالیکید';
const OWNER_LABEL='جناب زینالی';
const safe=(value:unknown,max=500)=>sanitizeAssistantQuestion(value).slice(0,max);
const reply=(body:unknown,status:number,origin:string)=>{const response=jsonResponse(body,status,origin);response.headers.set('Cache-Control','no-store, max-age=0');return response};
const defaultFallback=`در این مورد اطلاعاتی ندارم. من میتونم درباره رشد و تغذیه فرزندتون، دوره‌ها، ثبت مشاوره و بخش‌های عمومی ${BRAND} کمکتون کنم.`;
const defaultSuggestionsEn=[{question:'How can I request a consultation?',label:'Request consultation',path:'/consultation'},{question:'Which courses are available?',label:'View courses',path:'/courses'},{question:'How can I track my request?',label:'Track request',path:'/track'},{question:'How can I contact support?',label:'Contact support',path:'/contact'}];
const defaultSuggestions=[{question:'چطور درخواست مشاوره ثبت کنم؟',label:'ثبت مشاوره',path:'/consultation'},{question:'چطور درخواست خودم را پیگیری کنم؟',label:'پیگیری درخواست',path:'/track'},{question:'دوره‌ها را از کجا ببینم؟',label:'مشاهده دوره‌ها',path:'/courses'},{question:'چطور با شما تماس بگیرم؟',label:'راه‌های ارتباطی',path:'/contact'}];

const suggestionsFrom=(settings:any,sources:AssistantSource[],question:string)=>{
  const english=(question.match(/[A-Za-z]/g)||[]).length>(question.match(/[آ-ی]/g)||[]).length*3,configured=english?defaultSuggestionsEn:(Array.isArray(settings?.suggested_questions)&&settings.suggested_questions.length?settings.suggested_questions:defaultSuggestions),result:any[]=[],seen=new Set([normalizeAssistantText(question)]);
  for(const source of english?[]:sources){const normalized=normalizeAssistantText(source.question);if(!normalized||seen.has(normalized))continue;seen.add(normalized);result.push({question:source.question,label:source.question,path:''})}
  for(const item of configured){const q=String(item?.question||'').slice(0,500),normalized=normalizeAssistantText(q);if(!q||seen.has(normalized))continue;seen.add(normalized);result.push({question:q,label:String(item?.label||q).slice(0,100),path:safePublicPath(item?.path)})}
  return result.slice(0,4);
};
const actionsFrom=(sources:AssistantSource[],language:'fa'|'en')=>{
  const result:any[]=[],seen=new Set<string>(),best=sources[0]?.score||0,minimum=Math.max(.45,best*.6),englishLabels:Record<string,string>={'/consultation':'Request consultation','/courses':'View courses','/track':'Track request','/products':'View products','/education':'View education','/faq':'View FAQ','/contact':'Contact support','/about':'About us','/privacy':'Privacy','/experience':'Parent experiences','/licenses':'Licenses','/growth':'Growth guide'};
  for(const source of sources){if(source.score<minimum)continue;const configured=sanitizeKnowledgeActions(source.actions,source.link_url,source.link_label);for(const action of configured){const path=safePublicPath(action.path);if(!path||seen.has(path))continue;seen.add(path);result.push({label:language==='en'?(englishLabels[new URL(path,'https://x').pathname]||'Open related section'):action.label,path});if(result.length>=3)return result}}
  return result;
};
const sourceRows=(matches:ReturnType<typeof relatedKnowledge>):AssistantSource[]=>matches.map(({item,score})=>{const row:any=item;return {id:String(row.id||''),question:String(row.question||''),answer:String(row.answer||''),category:String(row.category||'عمومی'),link_url:String(row.link_url||''),link_label:String(row.link_label||''),target_tab:'',target_focus:'',action_label:'',actions:sanitizeKnowledgeActions(row.actions,row.link_url,row.link_label),response_mode:String(row.response_mode||'grounded'),match_mode:String(row.match_mode||'smart'),score:Math.round(score*1000)/1000}});
const supportPhoneFrom=(row:any)=>{const contacts=row?.settings?.contacts||{};return String(contacts.phone||contacts.whatsapp||'').trim().slice(0,80)};
const responseLanguage=(value:string,ui:unknown):'fa'|'en'=>{const fa=(value.match(/[آ-ی]/g)||[]).length,latin=(value.match(/[A-Za-z]/g)||[]).length;if(fa>=3&&fa>=latin*.25)return 'fa';if(latin>=4&&fa<3)return 'en';return ui==='en'?'en':'fa'};
const englishRetrievalQuestion=(value:string)=>{const q=value.toLowerCase();let seed='';if(/consult|advice|appointment/.test(q))seed='چطور درخواست مشاوره ثبت کنم؟';else if(/course|program|height|growth/.test(q))seed='دوره‌ها را از کجا ببینم؟';else if(/track|status|follow up/.test(q))seed='چطور درخواست خودم را پیگیری کنم؟';else if(/product|shop/.test(q))seed='محصولات را از کجا ببینم؟';else if(/contact|support|phone/.test(q))seed='چطور با شما تماس بگیرم؟';return seed?`${seed}\nEnglish user question: ${value}`:value};
const growthSuggestions=[{question:'برای تقویت رشد قد فرزندم چیکار کنم؟',label:'تقویت رشد قد',path:'/courses'},{question:'چطور روند رشد فرزندم رو بررسی کنم؟',label:'بررسی روند رشد',path:'/growth'},{question:'چطور درخواست مشاوره بدم؟',label:'درخواست مشاوره',path:'/consultation'}];
const generalSuggestions=[{question:'میخوام ثبت دوره کنم',label:'ثبت دوره',path:'/courses'},{question:'میخوام درخواست مشاوره بدم',label:'درخواست مشاوره',path:'/consultation'}];
const fixedResponse=(answer:string,suggestions:any[],actions:any[]=[],model='internal-context-policy')=>({ok:true,answer,model,sources:[],actions,suggestions,provider_called:false,blocked_admin:false,blocked_private:false});
const exactConsultant=(question:string,row:any)=>{const list=Array.isArray(row?.settings?.consultants)?row.settings.consultants:[];return list.find((item:any)=>item?.active!==false&&String(item?.name||'').length>2&&normalizeAssistantText(question).includes(normalizeAssistantText(item.name)))};
const consultantAnswer=(item:any)=>[String(item?.name||''),String(item?.title||''),String(item?.desc||'')].filter(Boolean).join('؛ ').slice(0,1200);
async function rememberUnanswered(db:any,question:string,page:string,reason:UnansweredDetectionReason='no_match'){
  const normalized=normalizeAssistantText(question);if(normalized.length<3)return;
  try{
    const {data}=await db.from('assistant_unanswered').select('id,occurrences').eq('question_normalized',normalized).maybeSingle();
    const update={occurrences:Number(data?.occurrences||0)+1,last_seen_at:new Date().toISOString(),status:'pending',page_path:page||null,detection_reason:reason,archived_at:null};
    if(data)await db.from('assistant_unanswered').update(update).eq('id',data.id);
    else await db.from('assistant_unanswered').insert({question:question.slice(0,500),question_normalized:normalized,page_path:page||null,detection_reason:reason});
  }catch{/* Recording a review item must never block the public answer. */}
}

serve(async req=>{
  const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);if(!origin)return reply({error:'Origin not allowed'},403,origin);const db=getSupabaseAdmin();
  if(req.method==='GET'){
    const requestUrl=new URL(req.url),{data:settings,error:settingsError}=await db.from('assistant_settings').select('enabled,welcome_message,fallback_message,disclaimer,suggested_questions,frequent_question_threshold,revision,updated_at').eq('key','default').maybeSingle();
    if(settingsError)return reply({error:'Assistant unavailable'},503,origin);
    if(requestUrl.searchParams.get('status')==='1')return reply({enabled:settings?.enabled===true,revision:Number(settings?.revision||0),updated_at:settings?.updated_at||''},200,origin);
    if(settings?.enabled!==true)return reply({knowledge:[],settings:settings||{enabled:false,suggested_questions:defaultSuggestions}},200,origin);
    const {data:knowledge,error}=await db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,source_url,actions,response_mode,match_mode,priority,updated_at').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(500);
    if(error)return reply({error:'Assistant unavailable'},503,origin);return reply({knowledge:knowledge||[],settings},200,origin);
  }
  if(req.method!=='POST')return reply({error:'Method not allowed'},405,origin);const body=await req.json().catch(()=>({})),action=String(body.action||'');
  if(action==='generate'){
    const image=(Array.isArray(body.images)?body.images:[]).map(String).find((v:string)=>/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]{64,5500000}$/.test(v))||'';
    const question=image?safe(body.question,500)||'تصویر ارسالی کاربر را بررسی کن و اگر به دانش یا بخش‌های سایت مربوط است از همان مرجع پاسخ بده.':safe(body.question,500),language=responseLanguage(question,body.ui_language),clientId=String(body.client_id||'').trim();if(!image&&normalizeAssistantText(question).length<3||!/^[a-z0-9-]{16,80}$/i.test(clientId))return reply({error:'سؤال یا شناسه مرورگر معتبر نیست'},400,origin);
    const general=await centralRateLimit(req,'assistant-public-all',{maxRequests:30,windowMs:60_000,blockMs:60_000},clientId);if(!general.ok)return reply({error:'درخواست بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.'},429,origin);
    const [{data:settings},{data:knowledge,error},{data:appConfig},{data:reviewRows}]=await Promise.all([db.from('assistant_settings').select('enabled,welcome_message,fallback_message,disclaimer,suggested_questions,admin_block_message,frequent_question_threshold').eq('key','default').maybeSingle(),db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,actions,response_mode,match_mode,priority').eq('status','published').eq('is_active',true).order('priority',{ascending:false}).limit(500),db.from('settings').select('settings').eq('key','app_settings').maybeSingle(),db.from('reviews').select('id,reviewer_name,rating,comment,course_id,course_ids,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(40)]);
    if(error)return reply({error:'دستیار موقتاً در دسترس نیست'},503,origin);if(settings?.enabled!==true)return reply({error:'دستیار غیرفعال است'},503,origin);const siteSeen=new Set((knowledge||[]).map(row=>normalizeAssistantText(row.question).slice(0,180))),siteRows=buildSiteContentKnowledge(appConfig?.settings||{},reviewRows||[]).filter(row=>!siteSeen.has(normalizeAssistantText(row.question).slice(0,180))),rows=[...(knowledge||[]) as ScopedKnowledge[],...siteRows] as ScopedKnowledge[],supportPhone=supportPhoneFrom(appConfig),normalized=normalizeAssistantText(question),localizedFallback=language==='en'?`I do not have enough approved information about that. I can help with ${BRAND} services, courses, consultation and public website sections.`:String(settings?.fallback_message||defaultFallback);
    const deliver=(payload:any,status=200)=>{if(status===200&&payload?.ok===true&&!payload?.limit_code){const task=trackAssistantQuestion(db,{question,answer:payload.answer,model:payload.model,sources:payload.sources,threshold:settings?.frequent_question_threshold}).catch(error=>console.warn('assistant insight:',String((error as Error)?.message||error).slice(0,120)));const runtime=(globalThis as any).EdgeRuntime;if(runtime?.waitUntil)runtime.waitUntil(task)}return reply(payload,status,origin)};
    if(isPublicAdminQuestion(question)){const answer=language==='en'?'I cannot provide information about administrative settings or the management panel. I can help with public services, courses and consultation.':String(settings?.fallback_message||defaultFallback);return deliver({ok:true,answer,model:'internal-policy',sources:[],actions:[],suggestions:suggestionsFrom(settings,[],question),provider_called:false,blocked_admin:true,blocked_private:false},200)}
    if(isPublicPrivateDataQuestion(question)){const answer=language==='en'?'The public guide has no access to registrations, forms, phone numbers, enrolled courses or user records and cannot display them.':'دستیار عمومی هیچ دسترسی‌ای به اطلاعات ثبت‌نام، فرم‌ها، شماره تماس، دوره‌های ثبت‌شده یا پرونده کاربران ندارد و نمی‌تواند این اطلاعات را نمایش دهد.';return deliver({ok:true,answer,model:'internal-privacy-policy',sources:[],actions:[],suggestions:suggestionsFrom(settings,[],question),provider_called:false,blocked_admin:false,blocked_private:true},200)}
    const growthReply = image ? '' : whoGrowthAnswer(question, language);
    if (growthReply) return deliver(fixedResponse(growthReply, [], [{ path: '/consultation', label: language === 'en' ? 'Request a consultation' : 'درخواست مشاوره' }], 'internal-who-growth'), 200);
    if(/(سرطان|شیمی درمانی|پرتو درمانی|داروی سرطان|دوز دارو|نحوه مصرف دارو|قرص سرطان)/i.test(normalized))return deliver(fixedResponse('من درباره درمان سرطان یا نحوه مصرف این دارو اطلاعاتی ارائه نمیدم. لطفاً حتماً از پزشک متخصص فرزندتون بپرسین. حیطه راهنمایی من رشد و تغذیه کودک و نوجوانه.',growthSuggestions),200);
    const fixed=image?null:findKnowledgeRule(question,rows);
    if(fixed){const source=sourceRows([{item:fixed.item,score:fixed.score}] as any),model=fixed.item.response_mode==='refusal'?'internal-refusal-rule':'internal-exact-rule';return deliver({...fixedResponse(String(fixed.item.answer||localizedFallback),suggestionsFrom(settings,source,question),actionsFrom(source,language),model),sources:source},200)}
    const consultant=exactConsultant(question,appConfig);
    if(/(هوش مصنوعی|ربات|انسانی|آدم واقعی|چه مدلی|مدل تو|پلتفرم تو)/i.test(normalized))return deliver(fixedResponse(`بله، من یه دستیار هوش مصنوعی و دستیار ${OWNER_LABEL} هستم تا درباره رشد و تغذیه فرزندتون و بخش‌های عمومی ${BRAND} کمکتون کنم. درباره پلتفرم یا مدل فنی خودم اطلاعاتی ارائه نمیدم.`,generalSuggestions),200);
    if(consultant&&/(کیه|میشناسی|درباره|معرفی)/i.test(normalized)){const consultantText=consultantAnswer(consultant),answer=consultantText||'اطلاعات عمومی بیشتری درباره ایشون ثبت نشده.';if(!consultantText)await rememberUnanswered(db,question,safe(body.page_path,200),'generic_answer');return deliver(fixedResponse(answer,generalSuggestions,[{label:'مشاهده صفحه درباره ما',path:'/about'}]),200);}
    if(/(مشاوران|مشاورین|اعضای تیم|تیم شما).*(چه کسانی|کیا|کی ها|چند نفر|شامل)|چه کسانی.*(مشاور|تیم)/i.test(normalized)){await rememberUnanswered(db,question,safe(body.page_path,200),'generic_answer');return deliver(fixedResponse('این اطلاعات در دانش عمومی دستیار ثبت نشده است. اگر درباره رشد یا تغذیه فرزندتون سؤالی دارین، در خدمتم.',generalSuggestions),200);}
    if(/(هوا|آب و هوا|پیش بینی هوا|اخبار امروز)/i.test(normalized))return deliver(fixedResponse('من اطلاعات لحظه‌ای آب‌وهوا یا خبرها رو ندارم. لطفاً از برنامه آب‌وهوا یا خبرگزاری معتبر استفاده کنین.',growthSuggestions),200);
    if(/(نگران رشد|رشد نکرده|رشد نمیکنه|قد نمی ?کشه|کوتاه قد|وزن نمی ?گیره|رشدش کمه|از رشد.*نگران)/i.test(normalized)){const phone=String(supportPhone||'').replace(/[^+0-9۰-۹٠-٩]/g,''),actions=[...(phone?[{label:`تماس مستقیم ${supportPhone}`,path:`tel:${phone}`}]:[]),{label:'درخواست مشاوره',path:'/consultation'}];return deliver(fixedResponse(`نگرانی‌تون قابل درکه. برای بررسی دقیق‌تر از طریق دکمه‌های زیر با ما ارتباط بگیرین${supportPhone?` یا با شماره ${supportPhone} تماس بگیرین`:''}.`,growthSuggestions,actions),200)}
    if(/(دکتر|پزشک|آقای|خانم).{1,45}(میشناسی|کیه|میشناسید)/i.test(normalized)){await rememberUnanswered(db,question,safe(body.page_path,200),'generic_answer');return deliver(fixedResponse('ایشون رو نمیشناسم و اطلاعات تأییدشده‌ای درباره‌شون ندارم. اگر درباره رشد و تغذیه فرزندتون سؤالی دارین، در خدمتم.',growthSuggestions),200);}
    const groundedQuestion=language==='en'?englishRetrievalQuestion(question):question,matches=relatedKnowledge(groundedQuestion,rows,6);
    if(!matches.length&&!image){await rememberUnanswered(db,question,safe(body.page_path,200),'no_match');return deliver({ok:true,answer:localizedFallback,model:'internal-no-knowledge',sources:[],actions:[],suggestions:suggestionsFrom(settings,[],question),provider_called:false,blocked_admin:false,blocked_private:false,needs_training:true,confidence:0},200)}
    const minute=await centralRateLimit(req,'assistant-public-mistral-minute',{maxRequests:17,windowMs:60_000,blockMs:15_000},clientId);
    if(!minute.ok)return deliver({ok:true,answer:'برای اینکه نوبت بقیه هم رعایت بشه چند لحظه صبر کن و بعد دوباره بپرس.',model:'internal-rate-limit',sources:[],actions:[],suggestions:suggestionsFrom(settings,[],question),provider_called:false,blocked_admin:false,blocked_private:false,limit_code:'minute_limit',support_phone:''},200);
    let result;
    try{result=await generateGroundedAssistant({question:groundedQuestion,knowledge:rows,mode:'public',brand:BRAND,language,db,image:image||null})}
    catch(error){const code=String((error as Error)?.message||'');const sources=sourceRows(matches);result={answer:String(matches[0]?.item?.answer||localizedFallback),model:'internal-fallback',sources,providerCalled:false};console.warn('assistant-public provider fallback:',code)}
    const consultCta=language==='en'?' For more details you can send a consultation request.':' برای اطلاعات بیشتر می‌تونید درخواست مشاوره بدید.';
    let answer=result.answer||localizedFallback,actions=actionsFrom(result.sources,language);
    if(result.providerCalled){
      const sentences=answer.split(/(?<=[.!?؟])\s+/);
      const kept=sentences.filter(sentence=>!(/پزشک/.test(sentence)&&/(مشورت|نظر|بپرس|اطلاع|مراجعه)/.test(sentence)));
      const removed=sentences.length>kept.length;
      if(kept.length)answer=kept.join(' ').trim();
      if(!/(درخواست )?مشاوره/.test(answer)&&answer)answer+=(/[.!?؟]\s*$/.test(answer)?' ':'')+consultCta;
      const recommendsCourse=(result.sources||[]).some(source=>String(source.category||'').includes('دوره')||String(source.link_url||'').startsWith('/courses'));
      const healthish=/(رشد|قد|وزن|تغذیه|غذا|اشتها|خواب|تمرکز|حافظه|یبوست|مو|مکمل|دوره|growth|height|weight|nutri|food|appetite|sleep|focus|memory|constip|hair|supplement|course)/i.test(`${question} ${normalized}`);
      if(recommendsCourse||removed||healthish){const hasConsult=actions.some(item=>item.path==='/consultation');if(!hasConsult)actions=[...actions,{label:language==='en'?'Request a consultation':'ثبت درخواست مشاوره',path:'/consultation'}]}
      if(image&&/(از روی عکس|نمی‌تونم|نمی توانم|اطلاعاتی ندارم)/.test(answer)){if(!/(درخواست )?مشاوره/.test(answer))answer+=consultCta;if(!actions.some(item=>item.path==='/consultation'))actions=[...actions,{label:language==='en'?'Request a consultation':'ثبت درخواست مشاوره',path:'/consultation'}]}
    }
    const confidence=Number(result.sources?.[0]?.score||matches[0]?.score||0),review=!image?needsOwnerReviewForAnswer({answer,fallback:localizedFallback,model:result.model,confidence}):{needs_review:false,reason:'low_confidence' as UnansweredDetectionReason};
    // The review layer records only the user's wording and a reason. It never learns or rewrites an answer here.
    if(review.needs_review)await rememberUnanswered(db,question,safe(body.page_path,200),review.reason);
    return deliver({ok:true,answer,model:result.model,sources:result.sources,actions,suggestions:suggestionsFrom(settings,result.sources,question),provider_called:result.providerCalled,blocked_admin:false,blocked_private:false,needs_training:review.needs_review,confidence},200);
  }
  const rate=await centralRateLimit(req,`assistant-${action||'write'}`,{maxRequests:20,windowMs:60_000,blockMs:60_000});if(!rate.ok)return reply({error:'درخواست بیش از حد مجاز است'},429,origin);
  if(action==='unanswered'){const question=safe(body.question,500),normalized=normalizeAssistantText(question),page=safe(body.page_path,200);if(normalized.length<3)return reply({error:'سؤال معتبر نیست'},400,origin);await rememberUnanswered(db,question,page);return reply({ok:true},200,origin)}
  return reply({error:'Action not allowed'},400,origin);
});
