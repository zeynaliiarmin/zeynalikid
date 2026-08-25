import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {getSupabaseAdmin} from '../_shared/supabaseClient.ts';
import {matchKnowledge} from '../_shared/assistantMatch.ts';
const token=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_BOT_TOKEN')||'').trim();
const owner=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_OWNER_CHAT_ID')||'').trim();
const webhookSecret=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_WEBHOOK_SECRET')||'').trim();
const send=async(chatId:string,text:string)=>{if(!token())return;try{await fetch(`https://api.telegram.org/bot${token()}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),signal:AbortSignal.timeout(6000)})}catch{}};
const help=`دستورات مدیریت دانش زینالیکید:
/add — افزودن مرحله‌ای دانش جدید
/list — ۱۰ مورد آخر
/test سؤال — آزمایش پاسخ‌های منتشرشده
/unanswered — سؤال‌های بدون پاسخ
/publish ID — انتشار
/draft ID — بازگرداندن به پیش‌نویس
/delete ID CONFIRM — حذف قطعی
/cancel — لغو عملیات فعلی
/help — راهنما`;
const short=(id:unknown)=>String(id||'').slice(0,8);
async function resolveId(db:any,prefix:string){const value=String(prefix||'').trim().toLowerCase();if(!/^[0-9a-f-]{4,36}$/.test(value))return null;const {data}=await db.from('assistant_knowledge').select('id').limit(1000);const matches=(data||[]).filter((item:any)=>String(item.id).toLowerCase().startsWith(value));return matches.length===1?matches[0].id:null}
serve(async req=>{if(req.method!=='POST')return new Response('Method not allowed',{status:405});if(!webhookSecret()||req.headers.get('X-Telegram-Bot-Api-Secret-Token')!==webhookSecret())return new Response('Forbidden',{status:403});
 const update=await req.json().catch(()=>({}));const message=update?.message;if(!message)return Response.json({ok:true});const chatId=String(message?.chat?.id||''),text=String(message?.text||'').trim();if(!chatId||chatId!==owner()||message?.chat?.type!=='private')return Response.json({ok:true});const db=getSupabaseAdmin();
 try{
  if(text==='/start'||text==='/help'){await send(chatId,`مالک تأیید شد.\n\n${help}`);return Response.json({ok:true})}
  if(text==='/cancel'){await db.from('assistant_bot_states').delete().eq('chat_id',chatId);await send(chatId,'عملیات فعلی لغو شد.');return Response.json({ok:true})}
  if(text==='/add'){await db.from('assistant_bot_states').upsert({chat_id:chatId,step:'question',draft:{},updated_at:new Date().toISOString()});await send(chatId,'سؤال اصلی را بنویسید:');return Response.json({ok:true})}
  if(text==='/list'){const {data}=await db.from('assistant_knowledge').select('id,question,status').order('updated_at',{ascending:false}).limit(10);await send(chatId,(data||[]).length?(data||[]).map((item:any,index:number)=>`${index+1}. [${item.status==='published'?'منتشر':'پیش‌نویس'}] ${short(item.id)} — ${item.question}`).join('\n'):'هنوز دانشی ثبت نشده است.');return Response.json({ok:true})}
  if(text==='/unanswered'){const {data}=await db.from('assistant_unanswered').select('id,question,occurrences').eq('status','pending').order('occurrences',{ascending:false}).limit(10);await send(chatId,(data||[]).length?(data||[]).map((item:any)=>`#${item.id} (${item.occurrences} بار) ${item.question}`).join('\n'):'سؤال بدون پاسخ وجود ندارد.');return Response.json({ok:true})}
  if(text.startsWith('/test ')){const query=text.slice(6).trim();const {data}=await db.from('assistant_knowledge').select('id,question,answer,aliases,keywords,category,link_url,link_label,priority').eq('status','published').eq('is_active',true).limit(500);const result=matchKnowledge(query,data||[],3);await send(chatId,result.length?`بهترین پاسخ (${Math.round(result[0].score*100)}٪):\n${result[0].item.answer}\n\nموارد مرتبط:\n${result.map(row=>`• ${row.item.question}`).join('\n')}`:'پاسخ منتشرشده‌ای پیدا نشد.');return Response.json({ok:true})}
  for(const [command,status] of [['/publish ','published'],['/draft ','draft']] as const){if(text.startsWith(command)){const id=await resolveId(db,text.slice(command.length));if(!id){await send(chatId,'شناسه یکتا پیدا نشد.');return Response.json({ok:true})}await db.from('assistant_knowledge').update({status}).eq('id',id);await send(chatId,status==='published'?`منتشر شد: ${short(id)}`:`به پیش‌نویس برگشت: ${short(id)}`);return Response.json({ok:true})}}
  if(text.startsWith('/delete ')){const parts=text.split(/\s+/);if(parts[2]!=='CONFIRM'){await send(chatId,'برای حذف قطعی بنویسید: /delete ID CONFIRM');return Response.json({ok:true})}const id=await resolveId(db,parts[1]);if(!id){await send(chatId,'شناسه یکتا پیدا نشد.');return Response.json({ok:true})}await db.from('assistant_knowledge').delete().eq('id',id);await send(chatId,`حذف شد: ${short(id)}`);return Response.json({ok:true})}
  if(text.startsWith('/')){await send(chatId,help);return Response.json({ok:true})}
  const {data:state}=await db.from('assistant_bot_states').select('step,draft').eq('chat_id',chatId).maybeSingle();if(!state)return Response.json({ok:true});const draft=state.draft||{};
  if(state.step==='question'){if(text.length<2){await send(chatId,'سؤال خیلی کوتاه است. دوباره بنویسید:');return Response.json({ok:true})}await db.from('assistant_bot_states').update({step:'answer',draft:{question:text},updated_at:new Date().toISOString()}).eq('chat_id',chatId);await send(chatId,'پاسخ تأییدشده را بنویسید:');return Response.json({ok:true})}
  if(state.step==='answer'){if(text.length<2){await send(chatId,'پاسخ خیلی کوتاه است. دوباره بنویسید:');return Response.json({ok:true})}await db.from('assistant_bot_states').update({step:'keywords',draft:{...draft,answer:text},updated_at:new Date().toISOString()}).eq('chat_id',chatId);await send(chatId,'کلمات کلیدی را با ویرگول جدا کنید؛ اگر ندارید - بفرستید:');return Response.json({ok:true})}
  if(state.step==='keywords'){const keywords=text==='-'?[]:text.split(/[,،]/).map((value:string)=>value.trim()).filter(Boolean).slice(0,30);await db.from('assistant_bot_states').update({step:'category',draft:{...draft,keywords},updated_at:new Date().toISOString()}).eq('chat_id',chatId);await send(chatId,'دسته‌بندی را بنویسید؛ اگر ندارید - بفرستید:');return Response.json({ok:true})}
  if(state.step==='category'){await db.from('assistant_bot_states').update({step:'link',draft:{...draft,category:text==='-'?'عمومی':text.slice(0,80)},updated_at:new Date().toISOString()}).eq('chat_id',chatId);await send(chatId,'لینک مرتبط مثل /courses را بفرستید؛ اگر ندارید - بفرستید:');return Response.json({ok:true})}
  if(state.step==='link'){const link=text==='-'?'':((text.startsWith('/')||/^https:\/\//i.test(text))?text.slice(0,500):'');const {data,error}=await db.from('assistant_knowledge').insert({question:draft.question,answer:draft.answer,keywords:draft.keywords||[],category:draft.category||'عمومی',link_url:link,status:'draft',created_by:'telegram'}).select('id').single();await db.from('assistant_bot_states').delete().eq('chat_id',chatId);await send(chatId,error?'ثبت انجام نشد. دوباره /add را شروع کنید.':`پیش‌نویس ذخیره شد: ${short(data.id)}\nبرای انتشار: /publish ${short(data.id)}`);return Response.json({ok:true})}
  return Response.json({ok:true});
 }catch(error){console.error('assistant-telegram',String((error as Error)?.message||error));await send(chatId,'خطای موقت رخ داد. دوباره تلاش کنید.');return Response.json({ok:true})}
});
