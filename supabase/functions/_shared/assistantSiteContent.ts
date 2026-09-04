// ── پل زنده دستیار با صفحات سایت (کپی‌شدنی در دانش نیست) ──
// در لحظه پرسش، محتوای منتشرشده «آموزش‌ها» (مقاله/ویدیو/پادکست)، «مجوزها»، «تجربه والدین»،
// «نظرات تأییدشده» و «سؤالات متداول» به‌عنوان منابع تأییدشده به مخزن جست‌وجوی دستیار اضافه می‌شود؛
// پس هر محتوای تازه‌ای که مالک در پنل بگذارد، همان لحظه قابل پاسخ‌دادن است و دکمه «مشاهده همین مورد»
// با لینک دقیق به همان آیتم (?open=id) ساخته می‌شود. هیچ عدد، اعتبار یا داده کاربریِ غیرعمومی اینجا نمی‌آید.

type MediaDestination='education'|'experience';
const LEGACY_MAP:Record<string,MediaDestination>={education:'education',experience:'experience','parent-experience':'experience'};
const TYPE_WORDS:Record<string,string>={video:'ویدیو',audio:'پادکست',article:'مقاله',image:'تصویر',text:'متن',faq:'سؤال متداول'};
const clean=(value:unknown,max:number)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);

function itemDestinations(item:any,source?:MediaDestination):MediaDestination[]{
  const out:MediaDestination[]=[];
  const push=(value:unknown)=>{const mapped=LEGACY_MAP[String(value??'').trim()];if(mapped&&!out.includes(mapped))out.push(mapped)};
  if(Array.isArray(item?.mediaCategories))for(const value of item.mediaCategories)push(value);
  else{if(source)push(source);push(item?.mediaCategory);for(const value of Array.isArray(item?.categories)?item.categories:[])push(value)}
  return out;
}
function flattenGenericMedia(mediaItems:any):any[]{
  if(Array.isArray(mediaItems))return mediaItems.map((item:any)=>({...item,type:item?.type||'video',_source:'education'}));
  if(!mediaItems||typeof mediaItems!=='object')return[];
  return [['videos','video','education'],['audios','audio','education'],['images','image','education'],['texts','text','education']].flatMap(([key,type,source]:string[])=>(Array.isArray(mediaItems[key])?mediaItems[key]:[]).map((item:any)=>({...item,type:item?.type||type,_source:source})));
}
export function mediaItemsForDestination(cfg:any,destination:MediaDestination):any[]{
  const pools=[
    ...(Array.isArray(cfg?.education?.items)?cfg.education.items:[]).map((item:any)=>({...item,_source:'education'})),
    ...(Array.isArray(cfg?.experience?.items)?cfg.experience.items:[]).map((item:any)=>({...item,_source:'experience'})),
    ...flattenGenericMedia(cfg?.mediaItems),
  ];
  const seen=new Set<string>();
  return pools.filter((item:any,index:number)=>{
    if(item?.active===false||item?.isVisible===false)return false;
    if(!itemDestinations(item,item._source==='education'||item._source==='experience'?item._source:undefined).includes(destination))return false;
    const key=`${destination}:${clean(String(item?.id??''),64)||index}`;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function mediaBody(item:any):string{
  const type=TYPE_WORDS[String(item?.type||'video')]||'محتوا';
  const title=clean(item?.title||item?.name||'',160);
  const body=clean(item?.body||item?.text||item?.description||item?.desc||item?.content||'',1200);
  return `${title?`«${title}»`:'این محتوا'} (${type})${body?`:\n${body}`:' در سایت منتشر شده است.'}`;
}
function courseTitleMap(cfg:any):Record<string,string>{
  const map:Record<string,string>={};
  for(const tab of Array.isArray(cfg?.courseTabs)?cfg.courseTabs:[])for(const course of Array.isArray(tab?.courses)?tab.courses:[]){const id=clean(String(course?.id??''),64);if(id)map[id]=clean(course?.title,120)}
  for(const course of Array.isArray(cfg?.courses)?cfg.courses:[]){const id=clean(String(course?.id??''),64);if(id&&!map[id])map[id]=clean(course?.title,120)}
  return map;
}
export interface SiteKnowledgeRow{id:string;question:string;answer:string;aliases:string[];keywords:string[];category:string;link_url:string;link_label:string;actions:{label:string;path:string}[];response_mode:'grounded';match_mode:'smart';priority:number;status:'published';is_active:boolean}

export function buildSiteContentKnowledge(cfg:any,reviews:any[]):SiteKnowledgeRow[]{
  const rows:SiteKnowledgeRow[]=[],seen=new Set<string>();
  const add=(row:Omit<SiteKnowledgeRow,'actions'|'response_mode'|'match_mode'|'priority'|'status'|'is_active'>)=>{
    const key=row.question.toLowerCase().replace(/\s+/g,' ');
    if(key.length<4||seen.has(key)||rows.length>=220)return;
    seen.add(key);
    rows.push({...row,actions:[],response_mode:'grounded',match_mode:'smart',priority:0,status:'published',is_active:true});
  };
  const mediaRows=(items:any[],page:'education'|'experience',category:string)=>{
    for(const item of items.slice(0,90)){
      const title=clean(item?.title||item?.name||'',160);if(!title)continue;
      const id=clean(String(item?.id??''),64),type=TYPE_WORDS[String(item?.type||'video')]||'محتوا';
      const flat=clean(title.replace(/\u200c/g,''),160);
      add({id:`site-${page}-${id||rows.length}`,question:`${type} ${title}`,answer:mediaBody(item),aliases:[title,flat,`${title} ${page==='education'?'آموزش':'تجربه والدین'}`,`${flat} ${page==='education'?'آموزش':'تجربه والدین'}`],keywords:[type,title.split(' ').filter(word=>word.length>2).slice(0,6),page==='education'?'آموزش‌ها':'تجربه والدین'].flat(),category,link_url:id?`/${page}?open=${id}`:`/${page}`,link_label:`مشاهده همین ${type}`});
    }
  };
  mediaRows(mediaItemsForDestination(cfg,'education'),'education','آموزش‌ها');
  mediaRows(mediaItemsForDestination(cfg,'experience'),'experience','تجربه والدین');
  for(const item of (Array.isArray(cfg?.faqItems)?cfg.faqItems:[]).slice(0,60)){
    const question=clean(item?.question,300),answer=clean(item?.answer,2000);if(!question||!answer)continue;
    const id=clean(String(item?.id??''),40);
    add({id:`site-faq-${id||rows.length}`,question,answer,aliases:[],keywords:['سؤالات متداول'],category:'سؤالات متداول',link_url:id?`/faq?open=${id}`:'/faq',link_label:'دیدن همین پاسخ در سؤالات متداول'});
  }
  for(const item of (Array.isArray(cfg?.faqItemsEn)?cfg.faqItemsEn:[]).slice(0,60)){
    const question=clean(item?.question,300),answer=clean(item?.answer,2000);if(!question||!answer)continue;
    const id=clean(String(item?.id??''),40);
    add({id:`site-faqen-${id||rows.length}`,question,answer,aliases:[],keywords:['FAQ','questions'],category:'FAQ',link_url:id?`/faq?open=${id}`:'/faq',link_label:'Open this answer in FAQ'});
  }
  const licenses=Array.isArray(cfg?.licenses)?cfg.licenses:(cfg?.licenses&&typeof cfg.licenses==='object'?Object.values(cfg.licenses):[]);
  for(const item of (licenses as any[]).filter((item:any)=>item?.isVisible!==false).slice(0,40)){
    const title=clean(item?.title,160);if(!title)continue;
    const id=clean(String(item?.id??''),40),description=clean(item?.description,600);
    const flatTitle=clean(title.replace(/\u200c/g,''),160);
    add({id:`site-license-${id||rows.length}`,question:title.startsWith('مجوز')?title:`مجوز ${title}`,answer:`«${title}»${description?` — ${description}`:''} در صفحه مجوزها منتشر شده است.`,aliases:[title,flatTitle,`گواهینامه ${flatTitle}`,`مدرک ${flatTitle}`],keywords:['مجوز','گواهینامه',title.split(' ').filter(word=>word.length>2).slice(0,5)].flat(),category:'مجوزها',link_url:id?`/licenses?open=${id}`:'/licenses',link_label:'دیدن همین مجوز'});
  }
  const licensesText=clean(cfg?.licensesText,2000);
  if(licensesText)add({id:'site-licenses-text',question:'مجوزهای سایت چیست؟',answer:licensesText,aliases:['گواهینامه‌ها را بفرست','مجوز دارید؟','اعتبار مجوزها'],keywords:['مجوز','گواهینامه'],category:'مجوزها',link_url:'/licenses',link_label:'دیدن صفحه مجوزها'});
  const titles=courseTitleMap(cfg);
  for(const review of (Array.isArray(reviews)?reviews:[]).slice(0,40)){
    const comment=clean(review?.comment,900);if(comment.length<8)continue;
    const ids=[...new Set([clean(String(review?.course_id??''),64),...(Array.isArray(review?.course_ids)?review.course_ids.map((value:any)=>clean(String(value),64)):[])].filter(Boolean))];
    const courses=ids.map((id:string)=>titles[id]).filter(Boolean);
    const scope=courses.length?courses.slice(0,2).join(' و '):'دوره‌ها و محصولات';
    const rating=Math.max(1,Math.min(5,Number(review?.rating)||5));
    const name=clean(review?.reviewer_name,60)||'یکی از والدین';
    add({id:`site-review-${clean(String(review?.id??rows.length),20)}`,question:`نظر والدین درباره ${scope}`,answer:`${name} درباره ${scope} با امتیاز ${rating} از ۵ نوشته: «${comment}»`,aliases:[`تجربه ${scope}`,`نظر ${scope}`],keywords:['نظر','تجربه',...courses].filter(Boolean),category:'نظرات والدین',link_url:ids.length?'/courses':'/products',link_label:ids.length?'دیدن دوره‌ها':'دیدن محصولات'});
  }
  return rows;
}
