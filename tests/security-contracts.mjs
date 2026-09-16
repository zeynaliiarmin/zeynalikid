import {readFile} from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [page,client,edge,widget,projectConfig,vercel,consent,launcher,home,homeCss,telegram,logError,static404,portalPage,portalEdge]=await Promise.all([
 read('src/pages/CoursePaymentPage.tsx'),read('src/lib/checkoutSession.ts'),read('supabase/functions/checkout-session/index.ts'),read('src/components/TurnstileGate.tsx'),read('src/config/project.ts'),read('vercel.json'),read('src/components/PrivacyConsent.tsx'),read('src/utils/paymentLauncher.ts'),read('src/pages/HomePage.tsx'),read('src/pages/home-v2.css'),read('supabase/functions/_shared/telegramAlert.ts'),read('supabase/functions/log-error/index.ts'),read('public/404.html'),read('src/pages/UserPortalPage.tsx'),read('supabase/functions/user-portal/index.ts'),
]);
const failures=[];
const requireText=(source,text,label)=>{if(!source.includes(text))failures.push(label)};
requireText(page,'paymentDetails.unlocked&&<>','payment destinations are not gated in the UI');
// بررسی امنیتی فقط روی فرم ورود/ثبت‌نام والد (/profile) است — نه صفحه پرداخت
requireText(portalPage,'captchaOn && <TurnstileGate','CAPTCHA is not rendered on the parent sign-in/register forms');
requireText(portalPage,"variant=\"auth\"",'portal CAPTCHA does not use the auth variant');
requireText(portalEdge,"Deno.env.get(\"TURNSTILE_SECRET_KEY\")",'Turnstile secret is not server-side');
requireText(portalEdge,'https://challenges.cloudflare.com/turnstile/v0/siteverify','Cloudflare Siteverify is not called on the portal');
requireText(widget,"action:'portal_auth'",'widget action does not match the portal auth verification');
// کپچا از صفحه پرداخت و مسیر checkout حذف شده است
const pageCode=page.split('\n').map((line)=>line.replace(/\/\/.*$/,'')).join('\n');
if(/captchaProof|captchaMovedToPortal|بررسی امنیتی|TurnstileGate|captchaIncludesCrypto/.test(pageCode))failures.push('CAPTCHA is still present on the payment page');
if(/turnstileToken/.test(client))failures.push('checkout client still sends a Turnstile token');
if(/turnstileToken/.test(edge))failures.push('checkout edge still expects a Turnstile token');
requireText(projectConfig,'TURNSTILE_SITE_KEY','public Turnstile site key is missing');
requireText(vercel,'https://challenges.cloudflare.com','CSP does not allow the Turnstile origin');
requireText(page,'data-testid="payment-app-launcher"','payment launcher is not rendered after unlock');
requireText(projectConfig,'PAYMENT_APP_LAUNCHER_ENABLED=true','payment launcher is not controlled by a rollback flag');
requireText(launcher,'if(lastCopied)return','launcher may overwrite a user-selected clipboard value');
requireText(consent,'aria-invalid={invalid}','consent does not expose its validation state');
requireText(consent,"whiteSpace:'normal'",'consent text layout is not normalized for mobile');
requireText(home,'zk-home-page zk-home-v2','Permanent Home V2 scope class is missing');
requireText(homeCss,'@media(min-width:1100px)','Home V2 desktop layout is missing');
requireText(homeCss,'@media(max-width:699px)','Home V2 mobile layout is missing');
requireText(telegram,"Deno.env.get('TELEGRAM_BOT_TOKEN')",'Telegram token is not server-side');
requireText(telegram,"Deno.env.get('TELEGRAM_CHAT_ID')",'Telegram chat id is not server-side');
requireText(logError,'sendTelegramErrorAlert(urgent)','urgent errors are not routed to Telegram');
requireText(static404,'min-height:100dvh','static 404 does not cover the dynamic viewport');
requireText(static404,'overflow-y:auto','static 404 does not preserve natural vertical scrolling');
requireText(static404,'-webkit-tap-highlight-color:transparent','static 404 does not suppress mobile tap highlighting');
requireText(static404,"globalKey='zk_public_theme_mode'",'static 404 does not apply the global public theme mode');
requireText(static404,"personalKey='zk_personal_color_mode'",'static 404 does not apply the browser-local personal override');
if(static404.includes('/src/main')||/type=["']module["']/.test(static404)||/<script[^>]+\bsrc\s*=/.test(static404))failures.push('static 404 unexpectedly executes client bootstrap code');
if(/TURNSTILE_SECRET_KEY\s*=\s*['"][^'"]+/i.test([page,client,edge,widget,projectConfig,vercel,consent,launcher,home,homeCss,telegram,logError,static404].join('\n')))failures.push('Turnstile secret appears hard-coded');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Payment + portal CAPTCHA security contracts passed.');
