/** پرونده تصویری زینالیکید — Canvas RTL، مینیمال + نئومورفیسم + ممفیس */
const toEnglishDigits = (value: unknown) => String(value ?? '—').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
const gender = (v: any) => v === 'male' ? 'پسر' : v === 'female' ? 'دختر' : (v || '—');

export async function generateFormImage(submission: any, format: 'webp' | 'jpg' = 'webp'): Promise<Blob> {
  try { await (document as any).fonts?.ready; } catch {}
  const parentName = submission.pName || submission.parentName || '—';
  const phone = toEnglishDigits(submission.fullPhone || submission.full_phone || submission.pPhone || '—');
  const courseTitle = submission.course?.title || '';
  const digest = Array.isArray(submission.digest) ? submission.digest.join('، ') : (submission.digest || '—');
  const topics = Array.isArray(submission.topics) ? submission.topics.join('، ') : (submission.topics || '—');
  const notes = String(submission.notes || submission.adminNotes || '—');
  const rows: Array<[string,string,boolean]> = [
    ['نام والد / سرپرست', parentName, false], ['شماره تماس', phone, true],
    ['نوع ثبت', submission.type === 'course' ? 'ثبت دوره' : 'درخواست مشاوره', false], ['کد پیگیری', toEnglishDigits(submission.trackingCode || '—'), true],
    ['سن', toEnglishDigits(submission.age || '—') + ' سال', true], ['جنسیت', gender(submission.gender), false],
    ['قد', toEnglishDigits(submission.height || '—') + ' سانتی‌متر', true], ['وزن', toEnglishDigits(submission.weight || '—') + ' کیلوگرم', true],
    ['موضوعات', topics, false], ['وضعیت اشتها', submission.appetite || '—', false],
    ['مشکل گوارشی', digest, false], ['بیماری / شرایط خاص', submission.disease || (Array.isArray(submission.specials) ? submission.specials.join('، ') : submission.specials) || '—', false],
  ];
  if (courseTitle) rows.push(['دوره ثبت‌شده', courseTitle, false]);
  const width = 1080, pad = 56, headerH = 178, rowH = 74, cols = 2;
  const notesLines = Math.max(1, Math.ceil(notes.length / 58));
  const height = headerH + 132 + Math.ceil(rows.length / cols) * rowH + 88 + notesLines * 33 + 130;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const round = (x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient,stroke?:string) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();} };
  // calm Memphis background
  ctx.fillStyle='#F4FAF9';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(131, 220, 208,.25)';ctx.beginPath();ctx.arc(width+40,30,205,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(192,184,245,.24)';ctx.beginPath();ctx.arc(-65,height-85,165,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(15,118,110,.23)';for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(88+(i%3)*22,92+Math.floor(i/3)*22,5,0,Math.PI*2);ctx.fill();}
  // soft main sheet
  ctx.shadowColor='rgba(16,91,87,.16)';ctx.shadowBlur=28;ctx.shadowOffsetY=12;round(pad,36,width-pad*2,height-72,32,'rgba(255,255,255,.93)','#E1EFED');ctx.shadowColor='transparent';
  // top gradient + title
  const g=ctx.createLinearGradient(pad,36,width-pad,190);g.addColorStop(0,'#087F78');g.addColorStop(1,'#10A8C8');round(pad,36,width-pad*2,headerH,32,g);
  ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.arc(width-120,72,78,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='right';ctx.font='800 32px Vazirmatn, Tahoma, Arial';ctx.fillText('پرونده رشد و تغذیه کودک',width-pad-34,98);
  ctx.font='500 16px Vazirmatn, Tahoma, Arial';ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillText('زینالیکید  |  پرونده محرمانه والد و کودک',width-pad-34,132);
  ctx.textAlign='left';ctx.font='600 15px Vazirmatn, Tahoma, Arial';ctx.fillText(toEnglishDigits(submission.date || '—')+'  '+toEnglishDigits(submission.time || ''),pad+34,132);
  // section titles and cards
  let y=headerH+76;
  const section=(title:string)=>{ctx.fillStyle='#0B7772';ctx.textAlign='right';ctx.font='800 20px Vazirmatn, Tahoma, Arial';ctx.fillText(title,width-pad-24,y);ctx.fillStyle='#B9E5DF';ctx.fillRect(pad+24,y-8,width-pad*2-265,2);y+=26;};
  const drawPair=(left:any,right:any)=>{const gap=16, cardW=(width-pad*2-gap)/2; const draw=(item:any,x:number)=>{if(!item)return;round(x,y,cardW,rowH-10,16,'#F7FBFB','#E1EEEC');ctx.textAlign='right';ctx.font='700 13px Vazirmatn, Tahoma, Arial';ctx.fillStyle='#5A7778';ctx.fillText(item[0],x+cardW-18,y+23);ctx.font=item[2]?'700 18px Arial, Tahoma':'600 16px Vazirmatn, Tahoma, Arial';ctx.fillStyle='#142F31';ctx.textAlign=item[2]?'left':'right';const vx=item[2]?x+18:x+cardW-18;const val=String(item[1]);ctx.fillText(val.length>29?val.slice(0,27)+'…':val,vx,y+52);};draw(right,pad);draw(left,pad+cardW+gap);y+=rowH;};
  section('اطلاعات والد و کودک');
  rows.forEach((r,i)=>{if(i%2===0)drawPair(r,rows[i+1]);});
  y+=10;section('توضیحات');
  const noteH=Math.max(66,notesLines*30+30);round(pad,y,width-pad*2,noteH,18,'#F7FBFB','#E1EEEC');ctx.fillStyle='#243F41';ctx.font='500 16px Vazirmatn, Tahoma, Arial';ctx.textAlign='right';
  const words=notes.split(/\s+/);let line='', yy=y+30;for(const word of words){const next=(line+' '+word).trim();if(ctx.measureText(next).width>width-pad*2-42&&line){ctx.fillText(line,width-pad-22,yy);yy+=30;line=word;}else line=next;}if(line)ctx.fillText(line,width-pad-22,yy);
  // footer
  ctx.strokeStyle='#DDECEA';ctx.beginPath();ctx.moveTo(pad+24,height-74);ctx.lineTo(width-pad-24,height-74);ctx.stroke();ctx.textAlign='center';ctx.font='500 13px Vazirmatn, Tahoma, Arial';ctx.fillStyle='#789395';ctx.fillText('زینالیکید — همراهی والدین در مسیر رشد و تغذیه کودک',width/2,height-42);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('image generation failed')),format==='webp'?'image/webp':'image/jpeg',.9));
}
