export type AssistantResponseMode='grounded'|'exact'|'refusal';
export type AssistantMatchMode='smart'|'contains'|'exact';
export interface AssistantKnowledgeAction {label:string;path:string;}
export interface KnowledgeLike {
  id?:string;
  question?:string;
  answer?:string;
  aliases?:string[];
  keywords?:string[];
  category?:string;
  link_url?:string;
  link_label?:string;
  source_url?:string;
  priority?:number;
  response_mode?:AssistantResponseMode;
  match_mode?:AssistantMatchMode;
  actions?:AssistantKnowledgeAction[];
  updated_at?:string;
}

export function normalizeAssistantText(value:unknown):string{
  return String(value||'').toLowerCase()
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[ۀة]/g,'ه')
    .replace(/ؤ/g,'و').replace(/[إأ]/g,'ا').replace(/[َُِّْٰ]/g,'')
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^a-z0-9آ-ی\s]/g,' ').replace(/\s+/g,' ').trim();
}

const tokens=(value:string)=>new Set(normalizeAssistantText(value).split(' ').filter(token=>token.length>1));
const dice=(a:string,b:string)=>{
  const left=normalizeAssistantText(a).replace(/\s/g,''),right=normalizeAssistantText(b).replace(/\s/g,'');
  if(!left||!right)return 0;if(left===right)return 1;
  const pairs=new Map<string,number>();
  for(let i=0;i<left.length-1;i++){const pair=left.slice(i,i+2);pairs.set(pair,(pairs.get(pair)||0)+1)}
  let hits=0;
  for(let i=0;i<right.length-1;i++){const pair=right.slice(i,i+2),count=pairs.get(pair)||0;if(count){hits++;pairs.set(pair,count-1)}}
  return 2*hits/Math.max(1,left.length+right.length-2);
};

export function scoreKnowledge(query:string,item:KnowledgeLike):number{
  const q=normalizeAssistantText(query),question=normalizeAssistantText(item.question),aliases=(item.aliases||[]).map(normalizeAssistantText).filter(Boolean);
  if(!q||!question)return 0;
  if(q===question||aliases.includes(q))return 1+Number(item.priority||0)/10000;
  if(question.includes(q)||q.includes(question)||aliases.some(alias=>alias.includes(q)||q.includes(alias)))return .82+Number(item.priority||0)/10000;
  const qt=tokens(q),candidate=tokens([item.question,...aliases,...(item.keywords||[])].join(' '));
  let overlap=0;for(const token of qt)if(candidate.has(token))overlap++;
  const union=new Set([...qt,...candidate]).size||1,coverage=overlap/Math.max(1,qt.size),fuzzy=Math.max(dice(q,question),...aliases.map(alias=>dice(q,alias)),0);
  return Math.min(.8,overlap/union*.3+coverage*.35+fuzzy*.3)+Number(item.priority||0)/10000;
}

export function matchKnowledge(query:string,items:KnowledgeLike[],limit=4){
  return (items||[]).map(item=>({item,score:scoreKnowledge(query,item)}))
    .filter(row=>row.score>=.28)
    .sort((a,b)=>b.score-a.score||Number(b.item.priority||0)-Number(a.item.priority||0))
    .slice(0,limit);
}

/** Exact/refusal rules are deterministic: the approved answer is returned verbatim. */
export function findKnowledgeRule(query:string,items:KnowledgeLike[]){
  const normalized=normalizeAssistantText(query);if(!normalized)return null;
  const candidates=(items||[]).filter(item=>item.response_mode==='exact'||item.response_mode==='refusal').map(item=>{
    const phrases=[item.question,...(item.aliases||[])].map(normalizeAssistantText).filter(phrase=>phrase.length>=2);
    const mode=item.match_mode||'smart';let score=0;
    if(mode==='exact'&&phrases.includes(normalized))score=3;
    if(mode==='contains'){
      const hit=phrases.filter(phrase=>normalized.includes(phrase)).sort((a,b)=>b.length-a.length)[0];
      if(hit)score=2+Math.min(.5,hit.length/200);
    }
    if(mode==='smart'){
      const smart=scoreKnowledge(query,item);
      if(smart>=.5)score=1+smart;
    }
    return {item,score};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||Number(b.item.priority||0)-Number(a.item.priority||0));
  return candidates[0]||null;
}

const assistantIntentStopWords=new Set(['از','به','با','در','برای','که','را','رو','و','یا','من','ما','شما','لطفا','لطفاً','میخوام','میخواهم','میخواد','چی','چیه','چیست','چطور','چگونه','کجا','کدام','درباره','میشه','میتونم','هست','است','بود','بگو','سوال','سؤال','the','a','an','is','are','to','of','for','and','or','i','we','you','how','what','where','which','please','can','could','do','does']);
const assistantIntentFacets:Array<[string,RegExp]>=[
  ['price',/(^|\s)(قیمت|هزینه|مبلغ|شهریه|تعرفه|چنده|price|cost|fee)(?=\s|$)/i],
  ['time',/(^|\s)(زمان|ساعت|تاریخ|موعد|چه وقت|چه زمانی|کی برگزار|when|schedule|date)(?=\s|$)/i],
  ['location',/(^|\s)(کجا|آدرس|محل|مکان|where|address|location)(?=\s|$)/i],
  ['cancel',/(^|\s)(لغو|کنسل|انصراف|استرداد|بازپرداخت|refund|cancel)(?=\s|$)/i],
  ['requirements',/(^|\s)(شرایط|مدارک|پیش نیاز|لازم|requirements|prerequisite)(?=\s|$)/i],
  ['duration',/(^|\s)(مدت|چقدر طول|چند روز|چند ماه|duration|how long)(?=\s|$)/i],
  ['availability',/(^|\s)(موجود|ظرفیت|جا دارید|ارائه میشه|available|availability)(?=\s|$)/i],
  ['age',/(^|\s)(چه سنی|رده سنی|مناسب سن|سن مناسب|age range|what age)(?=\s|$)/i],
  ['contents',/(^|\s)(سرفصل|محتوا|شامل چه|contents|syllabus)(?=\s|$)/i],
  ['tracking',/(^|\s)(پیگیری|وضعیت سفارش|کد پیگیری|tracking|order status)(?=\s|$)/i],
];
export function assistantIntentTokens(value:unknown):string[]{
  return normalizeAssistantText(value).split(' ').filter(token=>token.length>1&&!assistantIntentStopWords.has(token));
}
function intentFacets(value:string):Set<string>{
  const found=new Set(assistantIntentFacets.filter(([,pattern])=>pattern.test(value)).map(([name])=>name));
  if(/(^|\s)(آنلاین|مجازی|غیر حضوری|غیرحضوری|online|virtual)(?=\s|$)/i.test(value))found.add('channel:online');
  else if(/(^|\s)(حضوری|in person|onsite)(?=\s|$)/i.test(value))found.add('channel:in-person');
  else if(/(^|\s)(تلفنی|تلفن|phone|telephone)(?=\s|$)/i.test(value))found.add('channel:phone');
  return found;
}
/** Different qualifiers, channels or numeric subjects stay separate even when topic words overlap. */
export function compatibleAssistantIntent(left:unknown,right:unknown):boolean{
  const a=normalizeAssistantText(left),b=normalizeAssistantText(right);if(!a||!b)return false;
  const af=intentFacets(a),bf=intentFacets(b);if(af.size!==bf.size||[...af].some(facet=>!bf.has(facet)))return false;
  const an=a.match(/(^|\s)\d+(?:[./]\d+)?(?=\s|$)/g)?.map(item=>item.trim())||[],bn=b.match(/(^|\s)\d+(?:[./]\d+)?(?=\s|$)/g)?.map(item=>item.trim())||[];
  return an.length===bn.length&&an.every((number,index)=>number===bn[index]);
}
export function shareAssistantIntentToken(left:unknown,right:unknown):boolean{
  const rightTokens=new Set(assistantIntentTokens(right));return assistantIntentTokens(left).some(token=>rightTokens.has(token));
}
/** Deliberately conservative: ambiguity creates a separate cluster instead of mixing goals. */
export function sameAssistantIntent(left:unknown,right:unknown):boolean{
  const a=normalizeAssistantText(left),b=normalizeAssistantText(right);if(!a||!b)return false;if(a===b)return true;if(!compatibleAssistantIntent(a,b))return false;
  const at=new Set(assistantIntentTokens(a)),bt=new Set(assistantIntentTokens(b));let overlap=0;for(const token of at)if(bt.has(token))overlap++;
  if(overlap<2)return false;const coverage=Math.min(overlap/Math.max(1,at.size),overlap/Math.max(1,bt.size));
  return coverage>=.5&&dice(a,b)>=.34;
}
