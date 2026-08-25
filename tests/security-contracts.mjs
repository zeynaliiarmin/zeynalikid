import {readFile} from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [page,client,edge,widget,projectConfig,vercel]=await Promise.all([
 read('src/pages/CoursePaymentPage.tsx'),read('src/lib/checkoutSession.ts'),read('supabase/functions/checkout-session/index.ts'),read('src/components/TurnstileGate.tsx'),read('src/config/project.ts'),read('vercel.json'),
]);
const failures=[];
const requireText=(source,text,label)=>{if(!source.includes(text))failures.push(label)};
requireText(page,'paymentDetails.unlocked&&<>','payment destinations are not gated in the UI');
requireText(page,'captchaProof.token','verified CAPTCHA token is not used for checkout');
requireText(page,'ابتدا بررسی امنیتی را تکمیل کنید','final submission is not blocked before CAPTCHA');
requireText(client,'turnstileToken','checkout client does not send the Turnstile token');
requireText(edge,"Deno.env.get('TURNSTILE_SECRET_KEY')",'Turnstile secret is not server-side');
requireText(edge,'https://challenges.cloudflare.com/turnstile/v0/siteverify','Cloudflare Siteverify is not called');
requireText(edge,"result.action==='payment_details'",'Turnstile action is not bound to payment');
requireText(edge,'expectedHostname','Turnstile hostname is not validated');
requireText(widget,"action:'payment_details'",'widget action does not match server verification');
requireText(projectConfig,'TURNSTILE_SITE_KEY','public Turnstile site key is missing');
requireText(vercel,'https://challenges.cloudflare.com','CSP does not allow the Turnstile origin');
if(/TURNSTILE_SECRET_KEY\s*=\s*['"][^'"]+/i.test([page,client,edge,widget,projectConfig,vercel].join('\n')))failures.push('Turnstile secret appears hard-coded');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Payment CAPTCHA security contracts passed.');
