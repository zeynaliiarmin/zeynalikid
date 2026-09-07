// api/backup-telegram.js — Vercel serverless (Node.js)
// Sends a full backup ZIP to Telegram. Bot token/chat id are read from env only.
// Auth: requires X-Admin-Token matching BACKUP_SHARED_SECRET or ADMIN_PASSWORD.

export const config = { maxDuration: 60 };

const strToBytes = (s) => new TextEncoder().encode(s);
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;} return t; })();
function crc32(bytes) { let c=0xffffffff; for(let i=0;i<bytes.length;i++) c=CRC_TABLE[(c^bytes[i])&0xff]^(c>>>8); return (c^0xffffffff)>>>0; }
function dosDateTime(d){const t=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2);const dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();return{time:t,date:dt};}
function buildZip(files){
  const chunks=[],central=[]; let offset=0; const now=new Date(); const {time,date}=dosDateTime(now);
  for(const f of files){
    const bytes = typeof f.content==='string'?strToBytes(f.content):f.content;
    const nameBytes = strToBytes(f.name.replace(/^\/+/,''));
    const c=crc32(bytes), sz=bytes.length;
    const lh=new Uint8Array(30+nameBytes.length); const dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0x0800,true); dv.setUint16(8,0,true);
    dv.setUint16(10,time,true); dv.setUint16(12,date,true); dv.setUint32(14,c,true); dv.setUint32(18,sz,true); dv.setUint32(22,sz,true);
    dv.setUint16(26,nameBytes.length,true); dv.setUint16(28,0,true); lh.set(nameBytes,30);
    chunks.push(lh); chunks.push(bytes);
    const ch=new Uint8Array(46+nameBytes.length); const cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true);
    cv.setUint16(12,time,true); cv.setUint16(14,date,true); cv.setUint32(16,c,true); cv.setUint32(20,sz,true); cv.setUint32(24,sz,true);
    cv.setUint16(28,nameBytes.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true); cv.setUint16(34,0,true); cv.setUint16(36,0,true);
    cv.setUint32(38,0,true); cv.setUint32(42,offset,true); ch.set(nameBytes,46); central.push(ch);
    offset += lh.length + bytes.length;
  }
  let centralSize=0; const cs=offset; for(const c of central){ chunks.push(c); centralSize+=c.length; }
  const end=new Uint8Array(22); const ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true); ev.setUint16(8,files.length,true); ev.setUint16(10,files.length,true);
  ev.setUint32(12,centralSize,true); ev.setUint32(16,cs,true); ev.setUint16(20,0,true); chunks.push(end);
  let total=0; for(const c of chunks) total+=c.length;
  const out=new Uint8Array(total); let p=0; for(const c of chunks){out.set(c,p);p+=c.length;}
  return Buffer.from(out);
}
function jalaliStamp(d=new Date()){
  try{return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/[\/\\]/g,'-');}catch{return d.toISOString().slice(0,10);}
}
const TAGS={'زینالیکید':['بکاپ','بک‌آپ','زینالیکید','zeynalikid','backup'],'فرزند من':['بکاپ','بک‌آپ','فرزندمن','farzandman','backup']};

async function sendTg(filename, zipBuf, caption){
  const token=process.env.BACKUP_TELEGRAM_BOT_TOKEN, chatId=process.env.BACKUP_TELEGRAM_CHAT_ID;
  if(!token||!chatId) throw new Error('BACKUP_TELEGRAM_NOT_CONFIGURED');
  const FormData=globalThis.FormData||(await import('node-fetch')).FormData;
  // In Node 18+, FormData + Blob are available globally, but for file upload we need a file-ish Blob.
  const form=new FormData();
  form.append('chat_id', chatId);
  form.append('document', new Blob([zipBuf], {type:'application/zip'}), filename);
  form.append('caption', caption.slice(0,1024));
  const resp=await fetch(`https://api.telegram.org/bot${token}/sendDocument`,{method:'POST',body:form});
  const body=await resp.json().catch(()=>null);
  if(!resp.ok||!body?.ok) throw new Error(`Telegram: ${body?.description||resp.status}`);
  return {message_id:body.result.message_id};
}
async function delTg(mid){
  const token=process.env.BACKUP_TELEGRAM_BOT_TOKEN, chatId=process.env.BACKUP_TELEGRAM_CHAT_ID;
  if(!token||!chatId||!mid) return;
  try{await fetch(`https://api.telegram.org/bot${token}/deleteMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,message_id:mid})});}catch{}
}

export default async function handler(req, res){
  try{
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Admin-Token');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');return res.status(204).end();}
    if(req.method!=='POST') return res.status(405).json({error:'method'});
    const auth=String(req.headers['x-admin-token']||'');
    const required=process.env.BACKUP_SHARED_SECRET||process.env.ADMIN_PASSWORD;
    if(required && auth!==required) return res.status(401).json({error:'unauthorized'});
    const body=req.body||{};
    if(body.action==='delete'){ await delTg(Number(body.message_id)); return res.status(200).json({ok:true}); }
    const {submissions=[],settings={},meta={}}=body;
    const brand=String(meta.brand||process.env.BRAND_NAME||'Z');
    const stamp=jalaliStamp();
    const iso=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const base=`${brand.replace(/\s+/g,'_')}_backup_${stamp}`;
    const tags=(TAGS[brand]||['بکاپ','بک‌آپ','backup',brand]).map(t=>'#'+String(t).replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g,'_')).join(' ');
    const clean={...settings}; delete clean.adminPassword; delete clean.smsApiKey; delete clean.merchantId; delete clean.clientSecret; delete clean.gatewaySecret;
    const readme=[`بک‌آپ ${meta.auto?'خودکار':'دستی'} ${brand}`,`تاریخ (شمسی): ${stamp}`,`تاریخ (میلادی/ISO): ${new Date().toISOString()}`,`تعداد پرونده‌ها: ${submissions.length}`,``,'این فایل پس از ۳۰ روز به‌طور خودکار از تلگرام حذف می‌شود.'].join('\n');
    const zip=buildZip([
      {name:`${base}/README.txt`,content:readme},
      {name:`${base}/submissions.json`,content:JSON.stringify(submissions,null,2)},
      {name:`${base}/settings.json`,content:JSON.stringify(clean,null,2)},
    ]);
    const caption=`${tags}\n📦 بک‌آپ ${meta.auto?'خودکار':'دستی'} ${brand}\n📅 ${stamp}\n📋 ${submissions.length} پرونده`;
    const r=await sendTg(`${base}.zip`, zip, caption);
    return res.status(200).json({ok:true,...r,filename:`${base}.zip`,size:zip.length});
  }catch(e){
    console.error('backup-telegram error',e);
    return res.status(500).json({ok:false,error:String(e?.message||e)});
  }
}
