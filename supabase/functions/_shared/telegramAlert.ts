interface AlertRow {kind?:string;}
export async function sendTelegramErrorAlert(rows:AlertRow[]):Promise<boolean>{
 const token=String(Deno.env.get('TELEGRAM_BOT_TOKEN')||'').trim();
 const chatId=String(Deno.env.get('TELEGRAM_CHAT_ID')||'').trim();
 if(!token||!chatId||!rows.length)return false;
 const project=String(Deno.env.get('TELEGRAM_PROJECT_NAME')||'Website').slice(0,80);
 const kinds=[...new Set(rows.map(row=>String(row.kind||'error').slice(0,30)))];
 const text=[`🚨 هشدار فنی ${project}`,`تعداد خطاهای مهم: ${rows.length}`,`نوع: ${kinds.join('، ')}`,`زمان: ${new Date().toISOString()}`,'برای جزئیات، پنل خطاهای مدیریت را بررسی کنید.'].join('\n');
 try{
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),signal:AbortSignal.timeout(6000)});
  return response.ok;
 }catch{return false}
}
