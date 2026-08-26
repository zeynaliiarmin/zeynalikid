import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [migration,publicFn,adminFn,telegramFn,mistralPreview,widget,app,adminPanel,adminManager,adminApi]=await Promise.all([
  read('supabase/migrations/20260825170000_free_knowledge_assistant.sql'),
  read('supabase/functions/assistant-public/index.ts'),
  read('supabase/functions/assistant-admin/index.ts'),
  read('supabase/functions/assistant-telegram/index.ts'),
  read('supabase/functions/_shared/mistralPreview.ts'),
  read('src/components/AssistantWidget.tsx'),
  read('src/App.tsx'),
  read('src/admin/AdminPanel.tsx'),
  read('src/admin/AssistantManager.tsx'),
  read('src/lib/assistantAdminApi.ts'),
]);

const failures=[];
const need=(source,text,label)=>{if(!source.includes(text))failures.push(label)};
const forbid=(source,pattern,label)=>{if(pattern.test(source))failures.push(label)};

need(migration,'assistant_knowledge enable row level security','knowledge RLS missing');
need(migration,'assistant_browser_deny','explicit browser deny policy missing');
need(migration,'assistant_bot_states','Telegram conversation state table missing');

need(publicFn,".eq('status','published')",'public endpoint may expose drafts');
need(publicFn,"action==='unanswered'",'unanswered workflow missing');
need(publicFn,"action==='feedback'",'feedback workflow missing');
forbid(publicFn,/api\.(mistral|openai|deepseek)\.ai|generativelanguage\.googleapis\.com/i,'public assistant must not call an external model during admin-only preview');

need(adminFn,'validateAdminSession','admin assistant endpoint lacks session validation');
need(adminFn,"action==='batch_import'",'admin import missing');
need(adminFn,'admin_audit_logs','assistant admin audit missing');
need(adminFn,"action==='generate_preview'",'admin-only generative preview action missing');
need(adminFn,".eq('status','published')",'generative preview may retrieve draft knowledge');
need(adminFn,".eq('is_active',true)",'generative preview may retrieve inactive knowledge');
need(adminFn,'assistant-admin-mistral-minute','generative preview minute limit missing');
need(adminFn,'assistant-admin-mistral-day','generative preview daily limit missing');
need(adminFn,"action:'assistant_mistral_preview'",'generative preview audit event missing');
if(adminFn.indexOf('const auth=await validateAdminSession')>adminFn.indexOf("if(action==='generate_preview')"))failures.push('generative preview runs before admin authentication');

need(mistralPreview,"Deno.env.get('MISTRAL_API_KEY')",'Mistral key is not read from Edge secrets');
need(mistralPreview,"matchKnowledge(question,knowledge,6)",'approved-knowledge retrieval missing');
need(mistralPreview,"model:MISTRAL_PREVIEW_MODEL",'fixed Mistral model missing');
need(mistralPreview,'temperature:0.1','low-temperature grounded generation missing');
need(mistralPreview,'providerCalled:false','no-match provider bypass missing');
need(mistralPreview,'sanitizeMistralPreviewQuestion','preview question sanitization missing');
forbid(mistralPreview,/MISTRAL_API_KEY\s*=\s*['"][^'"]+/i,'Mistral API key is hard-coded');

need(telegramFn,"X-Telegram-Bot-Api-Secret-Token",'Telegram webhook signature validation missing');
need(telegramFn,"chatId!==owner()",'Telegram owner-only validation missing');
need(telegramFn,"status:'draft'",'Telegram additions must start as draft');
need(telegramFn,'/delete ID CONFIRM','Telegram destructive confirmation missing');

need(widget,'matchAssistantKnowledge','browser-local matching missing');
need(widget,'ارسال ناشناس برای بررسی','explicit unanswered consent missing');
need(widget,'شماره تماس یا اطلاعات پزشکی خصوصی وارد نکنید','privacy warning missing');
need(app,'<AssistantWidget','assistant widget not mounted');
need(adminPanel,"id:'assistant'",'assistant admin tab missing');

need(adminManager,'data-testid="assistant-mistral-preview"','admin preview UI missing');
need(adminManager,'فقط برای مدیر است','admin-only preview notice missing');
need(adminManager,'اطلاعات شخصی یا پزشکی خصوصی وارد نکنید','preview privacy warning missing');
need(adminManager,'دانش استفاده‌شده','retrieved knowledge disclosure missing');
need(adminApi,"call<AssistantMistralPreview>('generate_preview'",'admin preview API client missing');

const browserCode=[widget,app,adminPanel,adminManager,adminApi].join('\n');
forbid(browserCode,/MISTRAL_API_KEY|api\.mistral\.ai/i,'Mistral secret or provider endpoint leaked into browser code');
const nonAdminServer=[publicFn,telegramFn].join('\n');
forbid(nonAdminServer,/api\.mistral\.ai|generateMistralPreview/i,'Mistral preview leaked outside the authenticated admin endpoint');
const allAssistantCode=[publicFn,adminFn,telegramFn,mistralPreview,widget,adminManager,adminApi].join('\n');
forbid(allAssistantCode,/ASSISTANT_TELEGRAM_BOT_TOKEN\s*=\s*['"][^'"]+/i,'assistant bot token hard-coded');
forbid(widget,/service_role/i,'service role leaked into assistant widget');

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Knowledge assistant and admin-only Mistral preview security contracts passed.');
