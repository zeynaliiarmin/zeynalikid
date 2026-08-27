import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {findKnowledgeRule,normalizeAssistantText} from '../_shared/assistantMatch.ts';
import {generateGroundedAssistant,relatedKnowledge,type ScopedKnowledge} from '../_shared/generativeAssistant.ts';
import {parseAssistantInstruction,safeAdminTab,safePublicPath,sanitizeKnowledgeActions,sanitizeMatchMode,sanitizeResponseMode} from '../_shared/assistantTraining.ts';
import {assistantTelegramOwner,assistantTelegramWebhookSecret,getAssistantTelegramStatus,telegramAnswerCallback,telegramEditMessage,telegramSendMessage,type TelegramButton,type TelegramReplyMarkup} from '../_shared/assistantTelegramApi.ts';

const BRAND='زینالیکید';
const SITE_URL='https://zeynalikid.vercel.app';
const tables={public:'assistant_knowledge',admin:'assistant_admin_knowledge'} as const;
type Scope=keyof typeof tables;
type Draft=Record<string,any>&{scope?:Scope;question?:string;answer?:string;aliases?:string[];keywords?:string[];category?:string;response_mode?:string;match_mode?:string;actions?:Array<{label:string;path:string}>};
const short=(id:unknown)=>String(id||'').slice(0,8);
const clean=(value:unknown,max=6000)=>String(value||'').trim().slice(0,max);
const keyboard=(rows:TelegramButton[][]):TelegramReplyMarkup=>({inline_keyboard:rows});
const homeKeyboard=keyboard([
  [{text:'✨ آموزش با یک جمله',callback_data:'menu:quick'}],
  [{text:'➕ آموزش مرحله‌ای',callback_data:'menu:add'},{text:'📚 مدیریت دانش‌ها',callback_data:'menu:list'}],
  [{text:'🔥 سؤال‌های پرتکرار',callback_data:'fq:home'}],
  [{text:'🧪 آزمایش پاسخ',callback_data:'menu:test'},{text:'❓ سؤال‌های بی‌پاسخ',callback_data:'menu:unanswered'}],
  [{text:'🟢 فعال‌کردن سایت',callback_data:'site:enable'},{text:'🔴 خاموش‌کردن سایت',callback_data:'site:disable'}],
  [{text:'🔌 وضعیت اتصال',callback_data:'menu:status'},{text:'❌ لغو عملیات',callback_data:'menu:cancel'}],
]);
const backHome=[{text:'↩️ منوی اصلی',callback_data:'menu:home'}];
const scopeKeyboard=(prefix:string)=>keyboard([[{text:'👥 دانش کاربران سایت',callback_data:`${prefix}:public`},{text:'🔐 راهنمای پنل مدیریت',callback_data:`${prefix}:admin`}],backHome]);
const modeKeyboard=keyboard([
  [{text:'🧠 پاسخ طبیعی با هوش مصنوعی',callback_data:'mode:grounded'}],
  [{text:'📌 همین پاسخ دقیقاً گفته شود',callback_data:'mode:exact'}],
  [{text:'⛔ بگو اطلاعاتی ندارم',callback_data:'mode:refusal'}],[{text:'↩️ مرحله قبل',callback_data:'menu:add'},{text:'❌ لغو',callback_data:'menu:cancel'}],
]);
const publicActionKeyboard=keyboard([
  [{text:'بدون دکمه',callback_data:'action:done'}],
  [{text:'مشاوره',callback_data:'action:consultation'},{text:'دوره‌ها',callback_data:'action:courses'}],
  [{text:'پیگیری',callback_data:'action:track'},{text:'تماس',callback_data:'action:contact'}],
  [{text:'صفحه دیگر',callback_data:'action:custom'}],[{text:'↩️ مرحله قبل',callback_data:'flow:answer'},{text:'❌ لغو',callback_data:'menu:cancel'}],
]);
const adminTargetKeyboard=keyboard([
  [{text:'داشبورد',callback_data:'target:dashboard'},{text:'فرم‌ها',callback_data:'target:data'}],
  [{text:'دوره‌ها',callback_data:'target:courses'},{text:'محتوا',callback_data:'target:content'}],
  [{text:'تنظیمات',callback_data:'target:settings'},{text:'امنیت',callback_data:'target:security'}],
  [{text:'مدیریت دستیار',callback_data:'target:assistant'}],[{text:'↩️ مرحله قبل',callback_data:'flow:answer'},{text:'❌ لغو',callback_data:'menu:cancel'}],
]);
const actionPresets:Record<string,{label:string;path:string}>={consultation:{label:'ثبت درخواست مشاوره',path:'/consultation'},courses:{label:'مشاهده دوره‌ها',path:'/courses'},track:{label:'پیگیری درخواست',path:'/track'},contact:{label:'راه‌های ارتباطی',path:'/contact'}};
const targetLabels:Record<string,string>={dashboard:'رفتن به داشبورد',data:'رفتن به فرم‌ها و سفارشات',courses:'رفتن به دوره‌ها',content:'رفتن به محتوا',settings:'رفتن به تنظیمات',security:'رفتن به امنیت',assistant:'رفتن به مدیریت دستیار'};

async function getState(db:any,chatId:string){const {data}=await db.from('assistant_bot_states').select('step,draft,updated_at').eq('chat_id',chatId).maybeSingle();if(data&&Date.now()-new Date(data.updated_at).getTime()>30*60_000){await clearState(db,chatId);return null}return data}
const setState=(db:any,chatId:string,step:string,draft:Draft)=>db.from('assistant_bot_states').upsert({chat_id:chatId,step,draft,updated_at:new Date().toISOString()});
const clearState=(db:any,chatId:string)=>db.from('assistant_bot_states').delete().eq('chat_id',chatId);
const send=(chatId:string,text:string,markup?:TelegramReplyMarkup)=>telegramSendMessage(chatId,text,markup);
const render=(chatId:string,text:string,markup?:TelegramReplyMarkup,messageId?:number)=>messageId?telegramEditMessage(chatId,messageId,text,markup):send(chatId,text,markup);
const publishedAndActive=(row:any)=>row?.status==='published'&&row?.is_active===true;
async function setSiteEnabled(db:any,chatId:string,enabled:boolean,messageId?:number){const {error}=await db.from('assistant_settings').update({enabled}).eq('key','default').select('enabled').single();if(error)throw error;await render(chatId,enabled?'✅ دستیار عمومی سایت فعال شد.':'🔴 دستیار عمومی سایت خاموش شد؛ ربات خصوصی مدیریت همچنان فعال است.',homeKeyboard,messageId)}
async function home(db:any,chatId:string,intro=true,messageId?:number){await clearState(db,chatId);const {data}=await db.from('assistant_settings').select('enabled').eq('key','default').maybeSingle();await render(chatId,`${intro?`سلام؛ ربات خصوصی مدیریت دستیار ${BRAND} آماده است.\n\n`:''}وضعیت دستیار سایت: ${data?.enabled===true?'🟢 فعال':'🔴 غیرفعال'}\nیکی از گزینه‌های ساده زیر را انتخاب کنید:`,homeKeyboard,messageId)}

async function resolveId(db:any,prefix:string){const value=String(prefix||'').trim().toLowerCase();if(!/^[0-9a-f-]{4,36}$/.test(value))return null;const found:any[]=[];for(const [scope,table] of Object.entries(tables)){const {data}=await db.from(table).select('id').limit(1000);for(const item of data||[])if(String(item.id).toLowerCase().startsWith(value))found.push({id:item.id,table,scope:scope as Scope})}return found.length===1?found[0]:null}
async function rowByPrefix(db:any,prefix:string){const found=await resolveId(db,prefix);if(!found)return null;const {data}=await db.from(found.table).select('*').eq('id',found.id).maybeSingle();return data?{...found,row:data}:null}
const modeLabel=(mode:string)=>mode==='exact'?'پاسخ ثابت':mode==='refusal'?'پاسخ «اطلاعی ندارم»':'پاسخ طبیعی هوشمند';
const matchLabel=(mode:string)=>mode==='exact'?'فقط همان جمله':mode==='contains'?'شامل عبارت':'جمله‌های مشابه';
function previewText(draft:Draft){
  const actions=sanitizeKnowledgeActions(draft.actions),target=draft.scope==='admin'?`${safeAdminTab(draft.target_tab)} — ${clean(draft.action_label||targetLabels[safeAdminTab(draft.target_tab)]||'رفتن به بخش مرتبط',100)}`:(actions.length?actions.map(item=>`${item.label} ← ${item.path}`).join('\n'):'بدون دکمه');
  return `پیش‌نمایش دانش ${draft.scope==='admin'?'مدیریتی':'عمومی'}\n\nوقتی کاربر گفت:\n${[draft.question,...(draft.aliases||[])].filter(Boolean).map(item=>`• ${item}`).join('\n')}\n\nربات بگوید:\n${draft.answer||'-'}\n\nرفتار: ${modeLabel(draft.response_mode||'grounded')} · ${matchLabel(draft.match_mode||'smart')}\nدکمه/مقصد:\n${target}`;
}
const previewKeyboard=keyboard([[{text:'✅ ذخیره و انتشار',callback_data:'save:published'},{text:'📝 ذخیره پیش‌نویس',callback_data:'save:draft'}],[{text:'✏️ ویرایش سؤال‌ها',callback_data:'edit:draft:question'},{text:'✏️ ویرایش پاسخ',callback_data:'edit:draft:answer'}],[{text:'↩️ مرحله قبل',callback_data:'flow:back'},{text:'❌ لغو',callback_data:'menu:cancel'}]]);
async function showPreview(db:any,chatId:string,draft:Draft,messageId?:number){await setState(db,chatId,'preview',draft);await render(chatId,previewText(draft),previewKeyboard,messageId)}
async function saveDraft(db:any,chatId:string,status:'draft'|'published',messageId?:number){
  const state=await getState(db,chatId),draft:Draft=state?.draft||{};if(!draft.scope||clean(draft.question,500).length<2||clean(draft.answer,6000).length<2){await render(chatId,'پیش‌نویس کامل نیست. آموزش را دوباره شروع کنید.',keyboard([backHome]),messageId);return}
  const table=tables[draft.scope],common={question:clean(draft.question,500),answer:clean(draft.answer,6000),aliases:(draft.aliases||[]).map((x:any)=>clean(x,500)).filter(Boolean).slice(0,30),keywords:(draft.keywords||[]).map((x:any)=>clean(x,100)).filter(Boolean).slice(0,30),category:clean(draft.category|| (draft.scope==='admin'?'مدیریت':'عمومی'),80),response_mode:sanitizeResponseMode(draft.response_mode),match_mode:sanitizeMatchMode(draft.match_mode),status,is_active:true,priority:Math.max(-100,Math.min(100,Number(draft.priority)||0)),created_by:'telegram-owner'};
  const row=draft.scope==='admin'?{...common,target_tab:safeAdminTab(draft.target_tab),target_focus:clean(draft.target_focus,120),action_label:clean(draft.action_label||targetLabels[safeAdminTab(draft.target_tab)]||'رفتن به بخش مرتبط',100)}:(()=>{const actions=sanitizeKnowledgeActions(draft.actions),first=actions[0];return {...common,actions,link_url:first?.path||'',link_label:first?.label||''}})();
  const query=draft.edit_id?db.from(table).update(row).eq('id',draft.edit_id).select('id').single():db.from(table).insert(row).select('id').single(),{data,error}=await query;if(error){console.error('telegram save knowledge',error.code,error.message);await render(chatId,error.code==='23505'?'دانشی با همین سؤال وجود دارد؛ از فهرست دانش‌ها آن را ویرایش کنید.':'ذخیره انجام نشد؛ دوباره تلاش کنید.',keyboard([backHome]),messageId);return}
  if(draft.scope==='public'){
    const knowledgeId=String(data.id);
    if(draft.cluster_id)await db.from('assistant_question_clusters').update({knowledge_id:knowledgeId,answer_origin:'trained',canonical_answer:common.answer}).eq('id',draft.cluster_id);
    await db.from('assistant_question_clusters').update({canonical_answer:common.answer}).eq('knowledge_id',knowledgeId);
  }
  await clearState(db,chatId);await render(chatId,`${status==='published'?'✅ دانش ذخیره و همان لحظه منتشر شد.':'📝 دانش به‌صورت پیش‌نویس ذخیره شد.'}\nشناسه: ${short(data.id)}`,homeKeyboard,messageId);
}

async function showActionPicker(db:any,chatId:string,draft:Draft,messageId?:number){await setState(db,chatId,'action_choice',draft);const count=(draft.actions||[]).length;await render(chatId,`${count?`${count} دکمه اضافه شده. `:''}یک دکمه انتخاب کنید یا «بدون دکمه/پایان» را بزنید. حداکثر ۳ دکمه:`,publicActionKeyboard,messageId)}
async function appendAction(db:any,chatId:string,draft:Draft,action:{label:string;path:string},messageId?:number){const actions=sanitizeKnowledgeActions([...(draft.actions||[]),action]);const next={...draft,actions};if(actions.length>=3)return showPreview(db,chatId,next,messageId);await setState(db,chatId,'action_more',next);await render(chatId,`دکمه «${action.label}» اضافه شد.`,keyboard([[{text:'➕ افزودن دکمه دیگر',callback_data:'action:more'},{text:'✅ پایان',callback_data:'action:done'}],[{text:'↩️ مرحله قبل',callback_data:'flow:answer'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId)}

async function listKnowledge(db:any,chatId:string,scope:Scope,page=0,messageId?:number){
  const size=6,{data,error}=await db.from(tables[scope]).select('id,question,status,is_active,response_mode,updated_at').order('updated_at',{ascending:false}).range(page*size,page*size+size);if(error)throw error;
  const all=data||[],rows=all.slice(0,size);if(!rows.length){await render(chatId,'در این بخش دانشی وجود ندارد.',keyboard([[{text:'↩️ انتخاب نوع دانش',callback_data:'menu:list'}],backHome]),messageId);return}
  const text=`📚 دانش‌های ${scope==='public'?'عمومی':'مدیریتی'} — صفحه ${page+1}\n\n${rows.map((item:any,index:number)=>`${index+1}) ${publishedAndActive(item)?'🟢':'📝'} ${clean(item.question,180)}\n${modeLabel(item.response_mode)} · ${short(item.id)}`).join('\n\n')}`;
  const rowsKeyboard:TelegramButton[][]=rows.map((item:any,index:number)=>[{text:`${index+1}. مشاهده و مدیریت`,callback_data:`item:show:${short(item.id)}`}]);const nav:TelegramButton[]=[];if(page>0)nav.push({text:'قبلی',callback_data:`list:${scope}:${page-1}`});if(all.length>size)nav.push({text:'بعدی',callback_data:`list:${scope}:${page+1}`});
  await render(chatId,text,keyboard([...rowsKeyboard,...(nav.length?[nav]:[]),[{text:'↩️ انتخاب نوع دانش',callback_data:'menu:list'},{text:'🏠 منوی اصلی',callback_data:'menu:home'}]]),messageId);
}
async function showItem(db:any,chatId:string,prefix:string,messageId?:number){const found=await rowByPrefix(db,prefix);if(!found){await render(chatId,'دانش موردنظر پیدا نشد.',keyboard([backHome]),messageId);return}const row=found.row,draft={...row,scope:found.scope,edit_id:row.id};await render(chatId,previewText(draft),keyboard([[{text:'ویرایش سؤال',callback_data:`item:editq:${short(row.id)}`},{text:'ویرایش پاسخ',callback_data:`item:edita:${short(row.id)}`}],[{text:publishedAndActive(row)?'پیش‌نویس کن':'منتشر و فعال کن',callback_data:`item:toggle:${short(row.id)}`},{text:'حذف',callback_data:`item:delete:${short(row.id)}`}],[{text:'↩️ بازگشت به فهرست',callback_data:`list:${found.scope}:0`},{text:'🏠 منوی اصلی',callback_data:'menu:home'}]]),messageId)}
async function testAnswer(db:any,chatId:string,scope:Scope,question:string){
  const table=tables[scope],fields=scope==='public'?'id,question,answer,aliases,keywords,category,priority,link_url,link_label,actions,response_mode,match_mode':'id,question,answer,aliases,keywords,category,priority,target_tab,target_focus,action_label,response_mode,match_mode',{data,error}=await db.from(table).select(fields).eq('status','published').eq('is_active',true).order('priority',{ascending:false}).limit(500);if(error)throw error;
  const knowledge=(data||[]) as ScopedKnowledge[],fixed=findKnowledgeRule(question,knowledge),matches=relatedKnowledge(question,knowledge,6);let answer='',model='',source:any=null,confidence=0;
  if(fixed){answer=String(fixed.item.answer||'');model=fixed.item.response_mode==='refusal'?'پاسخ عدم اطلاع':'پاسخ ثابت';source=fixed.item;confidence=Number(fixed.score||1)}
  else if(!matches.length){const {data:settings}=await db.from('assistant_settings').select('fallback_message').eq('key','default').maybeSingle();answer=scope==='public'?String(settings?.fallback_message||'اطلاعاتی برای این سؤال ندارم.'):'در دانش مدیریتی اطلاعاتی برای این سؤال ندارم.';model='بدون دانش مرتبط'}
  else{confidence=Number(matches[0]?.score||0);try{const result=await generateGroundedAssistant({question,knowledge,mode:scope==='admin'?'admin':'public',brand:BRAND});answer=result.answer;model=result.providerCalled?'هوش مصنوعی متصل':'پاسخ داخلی';source=result.sources[0]}catch{answer=String(matches[0].item.answer||'');model='پاسخ داخلی جایگزین';source=matches[0].item}}
  const needsTraining=confidence<.6,buttons:TelegramButton[]=[];
  if(scope==='public'){for(const item of sanitizeKnowledgeActions(source?.actions,source?.link_url,source?.link_label))buttons.push({text:item.label,url:new URL(item.path,SITE_URL).toString()})}
  else{const tab=String(source?.target_tab||'');if(tab&&safeAdminTab(tab)===tab){const url=new URL('/admin/app',SITE_URL);url.searchParams.set('tab',tab);const focus=clean(source?.target_focus,120);if(focus)url.searchParams.set('focus',focus);buttons.push({text:clean(source?.action_label||targetLabels[tab]||'رفتن به بخش مرتبط',100),url:url.toString()})}}
  if(needsTraining)await setState(db,chatId,'test_result',{scope,question:clean(question,500),answer:clean(answer,6000),actions:[]});else await clearState(db,chatId);
  const advice=needsTraining?'🟠 دانش مستقیم و مطمئنی پیدا نشد؛ بهتر است این سؤال را آموزش دهید.':'🟢 دانش مستقیم و قابل‌اتکا پیدا شد.';
  await send(chatId,`🧪 نتیجه آزمایش (${model})\n\n${answer||'پاسخی تولید نشد.'}\n\n${advice}`,keyboard([...(buttons.length?[buttons]:[]),...(needsTraining?[[{text:'➕ آموزش همین سؤال',callback_data:'test:teach'}] as TelegramButton[]]:[]),backHome]));
}
async function showUnanswered(db:any,chatId:string,messageId?:number){const {data}=await db.from('assistant_unanswered').select('id,question,occurrences').eq('status','pending').order('occurrences',{ascending:false}).limit(10);await render(chatId,(data||[]).length?`❓ سؤال‌های بی‌پاسخ:\n\n${(data||[]).map((item:any)=>`#${item.id} · ${item.occurrences} بار\n${item.question}`).join('\n\n')}`:'✅ سؤال بی‌پاسخی وجود ندارد.',keyboard([backHome]),messageId)}
async function showStatus(db:any,chatId:string,messageId?:number){const [{data:settings},status]=await Promise.all([db.from('assistant_settings').select('enabled').eq('key','default').maybeSingle(),getAssistantTelegramStatus()]);const webhook:any=status.webhook||{};await render(chatId,`وضعیت دستیار سایت: ${settings?.enabled===true?'🟢 فعال':'🔴 غیرفعال'}\nاتصال ربات تلگرام: ${status.connected?'🟢 متصل':'🔴 ناقص'}\nنام ربات: ${status.bot?.username?`@${status.bot.username}`:'نامشخص'}\nپیام‌های در انتظار: ${webhook.pending_updates||0}${webhook.last_error_message?`\nآخرین خطا: ${webhook.last_error_message}`:''}`,keyboard([backHome]),messageId)}

const frequentHomeKeyboard=keyboard([
  [{text:'✅ پرتکرارهای دارای پاسخ آموزشی',callback_data:'fq:list:trained:0'}],
  [{text:'🤖 پرتکرارهای بدون پاسخ آموزشی مستقیم',callback_data:'fq:list:auto:0'}],
  backHome,
]);
async function frequentHome(chatId:string,messageId?:number){await render(chatId,'🔥 سؤال‌های پرتکرار\n\nیکی از دو فهرست زیر را انتخاب کنید. این دو شاخه جدا نگه داشته می‌شوند:',frequentHomeKeyboard,messageId)}
async function listFrequent(db:any,chatId:string,kind:'trained'|'auto',page=0,messageId?:number){
  const size=6,from=page*size,{data:settings}=await db.from('assistant_settings').select('frequent_question_threshold').eq('key','default').maybeSingle(),threshold=Math.max(2,Math.min(100,Number(settings?.frequent_question_threshold)||3));let query=db.from('assistant_question_clusters').select('id,representative_question,occurrence_count,knowledge_id,last_seen_at').gte('occurrence_count',threshold).order('occurrence_count',{ascending:false}).order('last_seen_at',{ascending:false});query=kind==='trained'?query.not('knowledge_id','is',null):query.is('knowledge_id',null);const {data,error}=await query.range(from,from+size);if(error)throw error;
  const all=data||[],items=all.slice(0,size),title=kind==='trained'?'دارای پاسخ آموزشی ثبت‌شده':'بدون پاسخ آموزشی مستقیم';if(!items.length){await render(chatId,`در فهرست «${title}» هنوز موردی وجود ندارد.`,keyboard([[{text:'↩️ دو فهرست پرتکرار',callback_data:'fq:home'}],backHome]),messageId);return}
  const text=`🔥 پرتکرارهای ${title} — صفحه ${page+1}\n\n${items.map((item:any,index:number)=>`${index+1}) ${item.occurrence_count} بار\n${clean(item.representative_question,220)}`).join('\n\n')}`;
  const itemButtons:TelegramButton[][]=items.map((item:any,index:number)=>[{text:`${index+1}. مشاهده پاسخ`,callback_data:`fq:view:${item.id}`}]),nav:TelegramButton[]=[];if(page>0)nav.push({text:'قبلی',callback_data:`fq:list:${kind}:${page-1}`});if(all.length>size)nav.push({text:'بعدی',callback_data:`fq:list:${kind}:${page+1}`});await render(chatId,text,keyboard([...itemButtons,...(nav.length?[nav]:[]),[{text:'↩️ دو فهرست پرتکرار',callback_data:'fq:home'},{text:'🏠 منوی اصلی',callback_data:'menu:home'}]]),messageId);
}
async function showFrequent(db:any,chatId:string,id:string,messageId?:number){
  const {data:cluster,error}=await db.from('assistant_question_clusters').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!cluster){await render(chatId,'این سؤال پرتکرار پیدا نشد.',keyboard([[{text:'↩️ سؤال‌های پرتکرار',callback_data:'fq:home'}]]),messageId);return}
  let trained=Boolean(cluster.knowledge_id),answer=clean(trained?cluster.canonical_answer:cluster.last_answer,3000);if(trained&&!answer){const {data}=await db.from('assistant_knowledge').select('answer').eq('id',cluster.knowledge_id).maybeSingle();answer=clean(data?.answer,3000)}
  const samples=Array.isArray(cluster.sample_questions)?cluster.sample_questions.map((item:any)=>clean(item,500)).filter(Boolean).slice(0,5):[],kind=trained?'پاسخ اصلی آموزش‌داده‌شده مدیر':'آخرین پاسخ خودکار دستیار';
  await render(chatId,`🔥 سؤال پرتکرار · ${cluster.occurrence_count} بار\n\nسؤال کاربران:\n${samples.length?samples.map((item:string)=>`• ${item}`).join('\n'):clean(cluster.representative_question,1000)}\n\n${kind}:\n${answer||'پاسخی ثبت نشده است.'}`,keyboard([[{text:trained?'✏️ ویرایش پاسخ آموزشی':'➕ آموزش پاسخ جدید',callback_data:`fq:edit:${cluster.id}`}],[{text:'↩️ بازگشت به فهرست',callback_data:`fq:list:${trained?'trained':'auto'}:0`},{text:'🏠 منوی اصلی',callback_data:'menu:home'}]]),messageId);
}
async function editFrequent(db:any,chatId:string,id:string,messageId?:number){
  const {data:cluster,error}=await db.from('assistant_question_clusters').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!cluster){await render(chatId,'این سؤال پرتکرار پیدا نشد.',keyboard([[{text:'↩️ سؤال‌های پرتکرار',callback_data:'fq:home'}]]),messageId);return}
  if(cluster.knowledge_id){const {data:row}=await db.from('assistant_knowledge').select('*').eq('id',cluster.knowledge_id).maybeSingle();if(row){await setState(db,chatId,'edit_draft_answer',{...row,scope:'public',edit_id:row.id,cluster_id:cluster.id});await render(chatId,`پاسخ آموزشی فعلی:\n\n${clean(row.answer,3000)}\n\nپاسخ جدید را در یک پیام بفرستید.`,keyboard([[{text:'↩️ جزئیات سؤال',callback_data:`fq:view:${id}`},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}}
  await setState(db,chatId,'frequent_train_answer',{scope:'public',question:clean(cluster.representative_question,500),aliases:(cluster.sample_questions||[]).filter((item:any)=>normalizeAssistantText(item)!==normalizeAssistantText(cluster.representative_question)).slice(0,29),answer:clean(cluster.last_answer,6000),actions:[],response_mode:'grounded',match_mode:'smart',cluster_id:cluster.id});await render(chatId,`برای این سؤال هنوز پاسخ آموزشی مستقیم ثبت نشده است:\n\n${clean(cluster.representative_question,1000)}\n\nپاسخ تأییدشده جدید را در یک پیام بفرستید.`,keyboard([[{text:'↩️ جزئیات سؤال',callback_data:`fq:view:${id}`},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);
}

async function handleCallback(db:any,chatId:string,data:string,messageId:number){
  if(data==='menu:home')return home(db,chatId,false,messageId);
  if(data==='menu:cancel'){
    const state=await getState(db,chatId),draft=state?.draft||{};await clearState(db,chatId);
    if(draft.cluster_id)return showFrequent(db,chatId,String(draft.cluster_id),messageId);
    if(draft.edit_id)return showItem(db,chatId,short(draft.edit_id),messageId);
    await render(chatId,'عملیات لغو شد. گزینه بعدی را انتخاب کنید:',homeKeyboard,messageId);return;
  }
  if(data==='menu:quick'){await setState(db,chatId,'quick_instruction',{});await render(chatId,'دستور را در یک پیام بنویسید. نمونه:\n\nاگر کاربر گفت «هزینه مشاوره چقدر است؟» یا «قیمت مشاوره»، دقیقاً بگو «برای دیدن هزینه وارد فرم مشاوره شوید» و دکمه ثبت مشاوره را نمایش بده.',keyboard([[{text:'↩️ منوی اصلی',callback_data:'menu:home'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}
  if(data==='menu:add'){await clearState(db,chatId);await render(chatId,'این دانش برای چه کسی است؟',scopeKeyboard('addscope'),messageId);return}
  if(data==='menu:list'){await clearState(db,chatId);await render(chatId,'کدام فهرست را می‌خواهید؟',scopeKeyboard('list'),messageId);return}
  if(data==='menu:test'){await clearState(db,chatId);await render(chatId,'کدام دستیار آزمایش شود؟',scopeKeyboard('test'),messageId);return}
  if(data==='menu:unanswered')return showUnanswered(db,chatId,messageId);
  if(data==='menu:status')return showStatus(db,chatId,messageId);
  if(data==='site:enable'||data==='site:disable')return setSiteEnabled(db,chatId,data==='site:enable',messageId);

  if(data==='fq:home'){await clearState(db,chatId);return frequentHome(chatId,messageId)}
  if(data.startsWith('fq:list:')){const [, ,kind,page]=data.split(':');await clearState(db,chatId);return listFrequent(db,chatId,kind==='trained'?'trained':'auto',Number(page)||0,messageId)}
  if(data.startsWith('fq:view:')){await clearState(db,chatId);return showFrequent(db,chatId,data.slice('fq:view:'.length),messageId)}
  if(data.startsWith('fq:edit:'))return editFrequent(db,chatId,data.slice('fq:edit:'.length),messageId);

  if(data.startsWith('addscope:')){const scope=data.split(':')[1] as Scope;await setState(db,chatId,'mode',{scope,actions:[]});await render(chatId,'ربات چطور پاسخ بدهد؟',modeKeyboard,messageId);return}
  if(data.startsWith('mode:')){const state=await getState(db,chatId),mode=data.split(':')[1];if(!state)return home(db,chatId,false,messageId);const draft={...state.draft,response_mode:sanitizeResponseMode(mode),match_mode:mode==='grounded'?'smart':'contains'};await setState(db,chatId,'guided_question',draft);await render(chatId,'جمله‌هایی که ممکن است کاربر بگوید را بنویسید. هر جمله را در یک خط جدا بفرستید.',keyboard([[{text:'↩️ انتخاب شیوه پاسخ',callback_data:`addscope:${draft.scope}`},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}
  if(data.startsWith('list:')){const [,scope,page]=data.split(':');await clearState(db,chatId);return listKnowledge(db,chatId,scope==='admin'?'admin':'public',Number(page)||0,messageId)}
  if(data==='test:teach'){const state=await getState(db,chatId);if(!state||state.step!=='test_result')return render(chatId,'نتیجه آزمایش منقضی شده است. دوباره آزمایش کنید.',keyboard([[{text:'🧪 آزمایش دوباره',callback_data:'menu:test'}],backHome]),messageId);return showPreview(db,chatId,{...state.draft,response_mode:'grounded',match_mode:'smart',actions:state.draft.actions||[]},messageId)}
  if(data.startsWith('test:')){const scope=data.split(':')[1] as Scope;await setState(db,chatId,'test_question',{scope});await render(chatId,`سؤال آزمایشی ${scope==='public'?'کاربر سایت':'مدیر'} را بنویسید:`,keyboard([[{text:'↩️ انتخاب نوع آزمایش',callback_data:'menu:test'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}

  if(data==='flow:answer'){const state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);await setState(db,chatId,'guided_answer',state.draft);await render(chatId,'پاسخی را که ربات باید بداند در یک پیام بنویسید:',keyboard([[{text:'↩️ ویرایش سؤال‌ها',callback_data:'edit:draft:question'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}
  if(data==='flow:back'){const state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);return state.draft?.scope==='admin'?render(chatId,'دکمه باید مدیر را به کدام بخش پنل ببرد؟',adminTargetKeyboard,messageId):showActionPicker(db,chatId,state.draft,messageId)}
  if(data.startsWith('action:')){const choice=data.split(':')[1],state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);const draft=state.draft||{};if(choice==='done')return showPreview(db,chatId,draft,messageId);if(choice==='more')return showActionPicker(db,chatId,draft,messageId);if(choice==='custom'){await setState(db,chatId,'custom_path',draft);await render(chatId,'مسیر صفحه را بنویسید؛ مثلاً /products یا /education',keyboard([[{text:'↩️ انتخاب دکمه',callback_data:'flow:back'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}const preset=actionPresets[choice];if(preset)return appendAction(db,chatId,draft,preset,messageId)}
  if(data.startsWith('target:')){const state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);const target=safeAdminTab(data.split(':')[1]);return showPreview(db,chatId,{...state.draft,target_tab:target,action_label:targetLabels[target]||'رفتن به بخش مرتبط'},messageId)}
  if(data.startsWith('save:'))return saveDraft(db,chatId,data.endsWith('published')?'published':'draft',messageId);
  if(data.startsWith('edit:draft:')){const state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);const part=data.split(':')[2];await setState(db,chatId,part==='question'?'edit_draft_question':'edit_draft_answer',state.draft);await render(chatId,part==='question'?'جمله‌های جدید را هرکدام در یک خط بنویسید:':'پاسخ جدید را بنویسید:',keyboard([[{text:'↩️ پیش‌نمایش',callback_data:'flow:preview'},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}
  if(data==='flow:preview'){const state=await getState(db,chatId);if(!state)return home(db,chatId,false,messageId);return showPreview(db,chatId,state.draft,messageId)}

  if(data.startsWith('item:')){
    const [,action,prefix]=data.split(':'),found=await rowByPrefix(db,prefix);if(!found){await render(chatId,'دانش پیدا نشد.',keyboard([backHome]),messageId);return}
    if(action==='show'){await clearState(db,chatId);return showItem(db,chatId,prefix,messageId)}
    if(action==='toggle'){const active=publishedAndActive(found.row),changes=active?{status:'draft'}:{status:'published',is_active:true},{error}=await db.from(found.table).update(changes).eq('id',found.id);if(error)throw error;return showItem(db,chatId,prefix,messageId)}
    if(action==='editq'||action==='edita'){const draft={...found.row,scope:found.scope,edit_id:found.id};await setState(db,chatId,action==='editq'?'edit_draft_question':'edit_draft_answer',draft);await render(chatId,action==='editq'?'جمله‌های جدید را هرکدام در یک خط بنویسید:':`پاسخ فعلی:\n\n${clean(found.row.answer,3000)}\n\nپاسخ جدید را بنویسید:`,keyboard([[{text:'↩️ جزئیات دانش',callback_data:`item:show:${prefix}`},{text:'❌ لغو',callback_data:'menu:cancel'}]]),messageId);return}
    if(action==='delete'){await render(chatId,`حذف «${found.row.question}»؟ این کار قابل بازگشت نیست.`,keyboard([[{text:'بله، حذف شود',callback_data:`deleteyes:${prefix}`},{text:'انصراف',callback_data:`item:show:${prefix}`}]]),messageId);return}
  }
  if(data.startsWith('deleteyes:')){const found=await rowByPrefix(db,data.split(':')[1]);if(found){const {error}=await db.from(found.table).delete().eq('id',found.id);if(error)throw error;return listKnowledge(db,chatId,found.scope,0,messageId)}await render(chatId,'دانش پیدا نشد.',homeKeyboard,messageId);return}
  await render(chatId,'این گزینه منقضی شده است؛ از منوی اصلی دوباره انتخاب کنید.',homeKeyboard,messageId);
}

async function handleText(db:any,chatId:string,incoming:string){
  const command=incoming.replace(/^\/([a-z_]+)@\w+/i,'/$1');
  if(command==='/start'||command==='/help')return home(db,chatId);if(command==='/cancel')return home(db,chatId,false);if(command==='/add'){await send(chatId,'این دانش برای چه کسی است؟',scopeKeyboard('addscope'));return}if(command==='/quick'){await setState(db,chatId,'quick_instruction',{});await send(chatId,'دستور آموزش را در یک پیام بنویسید:',keyboard([backHome]));return}if(command==='/list'){await send(chatId,'کدام فهرست را می‌خواهید؟',scopeKeyboard('list'));return}if(command==='/test'){await send(chatId,'کدام دستیار آزمایش شود؟',scopeKeyboard('test'));return}if(command==='/frequent')return frequentHome(chatId);if(command==='/unanswered')return showUnanswered(db,chatId);
  if(command.startsWith('/show '))return showItem(db,chatId,command.slice(6));
  for(const [prefix,status] of [['/publish ','published'],['/draft ','draft']] as const)if(command.startsWith(prefix)){const found=await rowByPrefix(db,command.slice(prefix.length));if(found){const changes=status==='published'?{status,is_active:true}:{status},{error}=await db.from(found.table).update(changes).eq('id',found.id);if(error)throw error}await send(chatId,found?(status==='published'?'دانش منتشر و فعال شد.':'دانش به پیش‌نویس برگشت.'):'شناسه یکتا پیدا نشد.',homeKeyboard);return}
  if(command.startsWith('/delete ')){const found=await rowByPrefix(db,command.slice(8).split(/\s+/)[0]);if(found)await send(chatId,`حذف «${found.row.question}»؟`,keyboard([[{text:'بله، حذف شود',callback_data:`deleteyes:${short(found.id)}`},...backHome]]));else await send(chatId,'شناسه یکتا پیدا نشد.',homeKeyboard);return}
  if(command.startsWith('/test_admin ')){await testAnswer(db,chatId,'admin',command.slice(12).trim());return}if(command.startsWith('/test ')){await testAnswer(db,chatId,'public',command.slice(6).trim());return}
  const state=await getState(db,chatId);
  if(!state){if(/(اگر|وقتی|هر وقت|از این به بعد).*(کاربر|مخاطب|پرسید|گفت)/i.test(incoming)){await send(chatId,'در حال تبدیل دستور شما به پیش‌نویس…');try{const parsed=await parseAssistantInstruction({instruction:incoming,brand:BRAND,scopeHint:'public'});if(parsed.needs_clarification){await setState(db,chatId,'quick_instruction',{});await send(chatId,parsed.clarification_message,keyboard([backHome]))}else await showPreview(db,chatId,{...parsed,actions:parsed.actions||[]})}catch{await send(chatId,'تحلیل هوشمند انجام نشد. از «آموزش مرحله‌ای» استفاده کنید.',homeKeyboard)}return}await send(chatId,'برای آموزش یا آزمایش، یکی از دکمه‌های زیر را انتخاب کنید.',homeKeyboard);return}
  const draft:Draft=state.draft||{};
  if(state.step==='quick_instruction'){await send(chatId,'در حال تحلیل دستور و ساخت پیش‌نویس…');try{const parsed=await parseAssistantInstruction({instruction:incoming,brand:BRAND,scopeHint:'public'});if(parsed.needs_clarification){await setState(db,chatId,'quick_instruction',{});await send(chatId,parsed.clarification_message,keyboard([backHome]));return}await showPreview(db,chatId,{...parsed,actions:parsed.actions||[]})}catch(error){console.error('telegram instruction parser',String((error as Error)?.message||error));await send(chatId,'تحلیل هوشمند موقتاً انجام نشد. دوباره تلاش کنید یا آموزش مرحله‌ای را بزنید.',keyboard([[{text:'آموزش مرحله‌ای',callback_data:'menu:add'}],backHome]))}return}
  if(state.step==='guided_question'||state.step==='edit_draft_question'){const phrases=incoming.split(/\n|[،,؛;]/).map(value=>clean(value,500)).filter(Boolean).slice(0,30);if(!phrases.length){await send(chatId,'حداقل یک جمله بنویسید.');return}const next={...draft,question:phrases[0],aliases:phrases.slice(1)};if(state.step==='edit_draft_question')return showPreview(db,chatId,next);await setState(db,chatId,'guided_answer',next);await send(chatId,next.response_mode==='refusal'?'متنی را که ربات باید برای عدم اطلاع بگوید بنویسید؛ مثلاً «من درباره این موضوع اطلاعاتی ندارم».':'پاسخی را که ربات باید بداند بنویسید:',keyboard([[{text:'↩️ ویرایش سؤال‌ها',callback_data:'edit:draft:question'},{text:'❌ لغو',callback_data:'menu:cancel'}]]));return}
  if(state.step==='guided_answer'||state.step==='edit_draft_answer'){if(incoming.length<2){await send(chatId,'پاسخ خیلی کوتاه است.');return}const next={...draft,answer:clean(incoming,6000)};if(state.step==='edit_draft_answer')return showPreview(db,chatId,next);if(next.scope==='admin'){await setState(db,chatId,'target_choice',next);await send(chatId,'دکمه باید مدیر را به کدام بخش پنل ببرد؟',adminTargetKeyboard)}else await showActionPicker(db,chatId,next);return}
  if(state.step==='custom_path'){const path=safePublicPath(incoming);if(!path){await send(chatId,'این مسیر مجاز نیست. یکی از مسیرهای عمومی سایت مثل /products را بنویسید.');return}await setState(db,chatId,'custom_label',{...draft,pending_path:path});await send(chatId,'عنوانی که روی دکمه دیده شود را بنویسید:',keyboard([[{text:'↩️ انتخاب دکمه',callback_data:'flow:back'},{text:'❌ لغو',callback_data:'menu:cancel'}]]));return}
  if(state.step==='custom_label'){const label=clean(incoming,100);if(label.length<2){await send(chatId,'عنوان دکمه خیلی کوتاه است.');return}return appendAction(db,chatId,draft,{label,path:draft.pending_path})}
  if(state.step==='frequent_train_answer'){if(incoming.length<2){await send(chatId,'پاسخ خیلی کوتاه است.');return}return showPreview(db,chatId,{...draft,answer:clean(incoming,6000),status:'published',is_active:true})}
  if(state.step==='test_question'){await testAnswer(db,chatId,draft.scope||'public',incoming);return}
  await home(db,chatId,false);
}

serve(async req=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const secret=assistantTelegramWebhookSecret();if(!secret||req.headers.get('X-Telegram-Bot-Api-Secret-Token')!==secret)return new Response('Forbidden',{status:403});
  const update=await req.json().catch(()=>({})),callback=update?.callback_query,message=callback?.message||update?.message,chatId=String(message?.chat?.id||''),messageId=Number(message?.message_id||0),owner=assistantTelegramOwner();
  if(callback?.id)await telegramAnswerCallback(String(callback.id)).catch(()=>null);
  if(!message||!chatId||chatId!==owner||message?.chat?.type!=='private')return Response.json({ok:true});
  const db=getSupabaseAdmin();
  try{
    if(callback)await handleCallback(db,chatId,String(callback.data||''),messageId);
    else{const incoming=String(message?.text||'').trim();if(!incoming)await send(chatId,'فقط پیام متنی یا یکی از دکمه‌ها را ارسال کنید.',homeKeyboard);else await handleText(db,chatId,incoming)}
    return Response.json({ok:true});
  }catch(error){
    console.error('assistant-telegram',String((error as Error)?.message||error));
    try{if(callback&&messageId)await render(chatId,'خطای موقت رخ داد. از منوی اصلی دوباره تلاش کنید.',homeKeyboard,messageId);else await send(chatId,'خطای موقت رخ داد. از منوی اصلی دوباره تلاش کنید.',homeKeyboard)}catch{}
    return Response.json({ok:true});
  }
});
