export interface TelegramButton {text:string;callback_data?:string;url?:string;}
export interface TelegramReplyMarkup {inline_keyboard:TelegramButton[][];}

const botToken=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_BOT_TOKEN')||'').trim();
export const assistantTelegramOwner=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_OWNER_CHAT_ID')||'').trim();
export const assistantTelegramWebhookSecret=()=>String(Deno.env.get('ASSISTANT_TELEGRAM_WEBHOOK_SECRET')||'').trim();
export const expectedAssistantTelegramWebhook=()=>{try{const base=new URL(String(Deno.env.get('SUPABASE_URL')||''));return base.protocol==='https:'?new URL('/functions/v1/assistant-telegram',base).toString():''}catch{return ''}};

async function telegramApi(method:string,payload:Record<string,unknown>={}){
  const token=botToken();if(!token)throw new Error('TELEGRAM_TOKEN_MISSING');
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10_000)});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.ok){console.error('assistant telegram api',method,response.status,String(body?.description||'').slice(0,180));throw new Error(`TELEGRAM_${method.toUpperCase()}_FAILED`)}
  return body.result;
}

export const telegramSendMessage=(chatId:string,text:string,replyMarkup?:TelegramReplyMarkup)=>telegramApi('sendMessage',{chat_id:chatId,text:String(text||'').slice(0,4090),disable_web_page_preview:true,...(replyMarkup?{reply_markup:replyMarkup}:{})});
export const telegramEditMessage=(chatId:string,messageId:number,text:string,replyMarkup?:TelegramReplyMarkup)=>telegramApi('editMessageText',{chat_id:chatId,message_id:messageId,text:String(text||'').slice(0,4090),disable_web_page_preview:true,...(replyMarkup?{reply_markup:replyMarkup}:{})});
export const telegramAnswerCallback=(callbackQueryId:string,text='')=>telegramApi('answerCallbackQuery',{callback_query_id:callbackQueryId,...(text?{text:String(text).slice(0,180)}:{})});

export async function getAssistantTelegramStatus(){
  const configured={token:Boolean(botToken()),owner:Boolean(assistantTelegramOwner()),webhook_secret:Boolean(assistantTelegramWebhookSecret())};
  if(!configured.token)return {configured,connected:false,bot:null,webhook:null,expected_url:expectedAssistantTelegramWebhook(),error:'توکن ربات تنظیم نشده است.'};
  try{
    const [bot,webhook]=await Promise.all([telegramApi('getMe'),telegramApi('getWebhookInfo')]);
    const expected=expectedAssistantTelegramWebhook(),allowed=Array.isArray(webhook?.allowed_updates)?webhook.allowed_updates.map(String):[],updatesReady=!allowed.length||['message','callback_query'].every(item=>allowed.includes(item)),connected=Boolean(configured.owner&&configured.webhook_secret&&bot?.id&&expected&&webhook?.url===expected&&updatesReady);
    const error=connected?'':!expected?'نشانی پروژه برای وب‌هوک معتبر نیست.':webhook?.url!==expected?'نشانی وب‌هوک صحیح نیست.':!updatesReady?'وب‌هوک دریافت پیام یا دکمه‌ها را کامل فعال نکرده است.':'تنظیمات مالک یا رمز وب‌هوک کامل نیست.';
    return {configured,connected,bot:{id:String(bot?.id||''),username:String(bot?.username||''),name:String(bot?.first_name||'')},webhook:{url:String(webhook?.url||''),pending_updates:Number(webhook?.pending_update_count||0),last_error_date:Number(webhook?.last_error_date||0),last_error_message:String(webhook?.last_error_message||'').slice(0,300),allowed_updates:allowed},expected_url:expected,error};
  }catch(error){return {configured,connected:false,bot:null,webhook:null,expected_url:expectedAssistantTelegramWebhook(),error:String((error as Error)?.message||'TELEGRAM_UNAVAILABLE')}}
}

export async function repairAssistantTelegram(brand:string){
  const url=expectedAssistantTelegramWebhook(),secret=assistantTelegramWebhookSecret();
  if(!url||!botToken()||!assistantTelegramOwner()||!secret)throw new Error('TELEGRAM_CONFIGURATION_INCOMPLETE');
  await telegramApi('setWebhook',{url,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false,max_connections:20});
  await telegramApi('setMyCommands',{commands:[
    {command:'start',description:'باز کردن منوی اصلی'},
    {command:'add',description:'آموزش مرحله‌ای دانش جدید'},
    {command:'quick',description:'آموزش با یک جمله'},
    {command:'list',description:'مدیریت دانش‌ها'},
    {command:'test',description:'آزمایش پاسخ دستیار'},
    {command:'unanswered',description:'سؤال‌های بی‌پاسخ'},
    {command:'cancel',description:'لغو عملیات فعلی'},
    {command:'help',description:'راهنما'},
  ],scope:{type:'all_private_chats'}});
  await telegramApi('setMyDescription',{description:`ربات خصوصی مدیریت و آموزش دستیار ${brand}. فقط مالک تأییدشده می‌تواند از آن استفاده کند.`}).catch(()=>null);
  await telegramApi('setMyShortDescription',{short_description:`مدیریت دانش دستیار ${brand}`}).catch(()=>null);
  return getAssistantTelegramStatus();
}
