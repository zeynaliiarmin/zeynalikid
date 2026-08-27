export type AssistantResponseMode='grounded'|'exact'|'refusal';
export type AssistantMatchMode='smart'|'contains'|'exact';
export interface AssistantKnowledgeAction {label:string;path:string;}
export interface AssistantKnowledge {
  id:string;
  question:string;
  answer:string;
  aliases:string[];
  keywords:string[];
  category:string;
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

export function scoreAssistantKnowledge(query:string,item:AssistantKnowledge):number{
  const q=normalizeAssistantText(query),question=normalizeAssistantText(item.question),aliases=(item.aliases||[]).map(normalizeAssistantText).filter(Boolean);
  if(!q||!question)return 0;
  if(q===question||aliases.includes(q))return 1+Number(item.priority||0)/10000;
  if(question.includes(q)||q.includes(question)||aliases.some(alias=>alias.includes(q)||q.includes(alias)))return .82+Number(item.priority||0)/10000;
  const qt=tokens(q),candidate=tokens([item.question,...aliases,...(item.keywords||[])].join(' '));
  let overlap=0;for(const token of qt)if(candidate.has(token))overlap++;
  const union=new Set([...qt,...candidate]).size||1,coverage=overlap/Math.max(1,qt.size),fuzzy=Math.max(dice(q,question),...aliases.map(alias=>dice(q,alias)),0);
  return Math.min(.8,overlap/union*.3+coverage*.35+fuzzy*.3)+Number(item.priority||0)/10000;
}

export function matchAssistantKnowledge(query:string,items:AssistantKnowledge[],limit=4){
  return (items||[]).map(item=>({item,score:scoreAssistantKnowledge(query,item)}))
    .filter(row=>row.score>=.28)
    .sort((a,b)=>b.score-a.score||Number(b.item.priority||0)-Number(a.item.priority||0))
    .slice(0,limit);
}

/** Exact/refusal rules are deterministic: the approved answer is returned verbatim. */
export function findAssistantRule(query:string,items:AssistantKnowledge[]){
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
      const smart=scoreAssistantKnowledge(query,item);
      if(smart>=.5)score=1+smart;
    }
    return {item,score};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||Number(b.item.priority||0)-Number(a.item.priority||0));
  return candidates[0]||null;
}
