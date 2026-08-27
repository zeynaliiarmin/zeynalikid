import {compatibleAssistantIntent,normalizeAssistantText,sameAssistantIntent,shareAssistantIntentToken} from './assistantMatch.ts';
import {assistantTelegramOwner,telegramSendMessage} from './assistantTelegramApi.ts';
import {sanitizeAssistantQuestion} from './generativeAssistant.ts';

const EMBEDDING_URL='https://api.mistral.ai/v1/embeddings';
const EMBEDDING_MODEL='mistral-embed';
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InsightSource={id?:unknown;question?:unknown;answer?:unknown;score?:unknown};
type ClusterRow={id:string;cluster_key:string;representative_question:string;sample_questions?:string[];occurrence_count:number;knowledge_id?:string|null;canonical_answer?:string;last_answer?:string;last_model?:string;embedding?:number[]|null;last_notified_count?:number};

const clampThreshold=(value:unknown)=>Math.max(2,Math.min(100,Number(value)||3));
const clean=(value:unknown,max:number)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
const asVector=(value:unknown)=>Array.isArray(value)?value.map(Number).filter(Number.isFinite).slice(0,2048):[];
const cosine=(left:number[],right:number[])=>{if(!left.length||left.length!==right.length)return 0;let dot=0,a=0,b=0;for(let i=0;i<left.length;i++){dot+=left[i]*right[i];a+=left[i]*left[i];b+=right[i]*right[i]}return a&&b?dot/Math.sqrt(a*b):0};

export function shouldNotifyFrequentQuestion(count:unknown,lastNotified:unknown,thresholdValue:unknown):boolean{
  const total=Math.max(0,Number(count)||0),last=Math.max(0,Number(lastNotified)||0),threshold=clampThreshold(thresholdValue);
  if(total<threshold||last>=total)return false;
  return last<threshold||(total>=5&&Math.floor(total/5)>Math.floor(last/5));
}

async function sha256(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
async function embedQuestion(question:string):Promise<number[]>{
  const key=String(Deno.env.get('MISTRAL_PUBLIC_API_KEY')||Deno.env.get('MISTRAL_API_KEY')||'').trim();if(!key)return [];
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10_000);
  try{const response=await fetch(EMBEDDING_URL,{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:EMBEDDING_MODEL,input:[question]})});if(!response.ok)return [];const payload=await response.json().catch(()=>null);return asVector(payload?.data?.[0]?.embedding)}catch{return []}finally{clearTimeout(timer)}
}

function directSource(options:{model:unknown;sources?:InsightSource[]}){
  const source=Array.isArray(options.sources)?options.sources[0]:null,id=String(source?.id||''),score=Number(source?.score)||0,rule=options.model==='internal-exact-rule'||options.model==='internal-refusal-rule';
  return source&&uuidPattern.test(id)&&(rule||score>=.6)?{id,answer:clean(source.answer,6000)}:null;
}

async function findCandidate(db:any,question:string,normalized:string,knowledgeId:string|null,vector:number[]):Promise<ClusterRow|null>{
  if(knowledgeId){const {data}=await db.from('assistant_question_clusters').select('*').eq('knowledge_id',knowledgeId).order('last_seen_at',{ascending:false}).limit(1).maybeSingle();if(data)return data as ClusterRow}
  let exactQuery=db.from('assistant_question_clusters').select('*').eq('normalized_question',normalized).order('last_seen_at',{ascending:false}).limit(1);
  if(!knowledgeId)exactQuery=exactQuery.is('knowledge_id',null);else exactQuery=exactQuery.is('knowledge_id',null);
  const {data:exact}=await exactQuery.maybeSingle();if(exact)return exact as ClusterRow;
  const {data}=await db.from('assistant_question_clusters').select('*').is('knowledge_id',null).order('last_seen_at',{ascending:false}).limit(120);const candidates=(data||[]) as ClusterRow[];
  const lexical=candidates.find(item=>sameAssistantIntent(question,item.representative_question)||(item.sample_questions||[]).some(sample=>sameAssistantIntent(question,sample)));if(lexical)return lexical;
  if(!vector.length)return null;let best:ClusterRow|null=null,bestScore=.925;
  for(const item of candidates){if(!compatibleAssistantIntent(question,item.representative_question)||!shareAssistantIntentToken(question,item.representative_question))continue;const score=cosine(vector,asVector(item.embedding));if(score>bestScore){best=item;bestScore=score}}
  return best;
}

export async function trackAssistantQuestion(db:any,options:{question:unknown;answer:unknown;model:unknown;sources?:InsightSource[];threshold?:unknown}){
  const question=sanitizeAssistantQuestion(options.question),normalized=normalizeAssistantText(question),answer=clean(options.answer,6000),model=clean(options.model,100);if(normalized.length<3||answer.length<2)return null;
  const source=directSource(options),embeddingAllowed=model!=='internal-privacy-policy'&&model!=='internal-policy';let vector:number[]=[],candidate=await findCandidate(db,question,normalized,source?.id||null,vector);
  if(!candidate&&!source&&embeddingAllowed){vector=await embedQuestion(question);if(vector.length)candidate=await findCandidate(db,question,normalized,null,vector)}
  const clusterKey=candidate?.cluster_key||(source?`knowledge:${source.id}`:`automatic:${(await sha256(normalized)).slice(0,40)}`),origin=source?'trained':'automatic';
  const {data,error}=await db.rpc('record_assistant_question_cluster',{p_cluster_key:clusterKey,p_question:question,p_normalized:normalized,p_answer:answer,p_answer_origin:origin,p_knowledge_id:source?.id||null,p_canonical_answer:source?.answer||'',p_model:model,p_embedding:vector.length?vector:null});
  if(error)throw error;const row=(Array.isArray(data)?data[0]:data) as ClusterRow|undefined;if(!row)return null;
  const threshold=clampThreshold(options.threshold);if(!shouldNotifyFrequentQuestion(row.occurrence_count,row.last_notified_count,threshold))return row;
  const owner=assistantTelegramOwner();if(!owner)return row;const trained=Boolean(row.knowledge_id),shownAnswer=clean(trained?(row.canonical_answer||answer):(row.last_answer||answer),1500);
  await telegramSendMessage(owner,`🔥 سؤال پرتکرار شناسایی شد\n\nتعداد تکرار: ${row.occurrence_count} بار\nنوع: ${trained?'پاسخ آموزشی ثبت‌شده':'بدون پاسخ آموزشی مستقیم'}\n\nسؤال نمونه:\n${clean(row.representative_question,500)}\n\n${trained?'پاسخ آموزشی فعلی':'آخرین پاسخ دستیار'}:\n${shownAnswer}`,{inline_keyboard:[[{text:'مشاهده جزئیات',callback_data:`fq:view:${row.id}`},{text:trained?'ویرایش پاسخ':'آموزش پاسخ',callback_data:`fq:edit:${row.id}`}],[{text:'همه سؤال‌های پرتکرار',callback_data:'fq:home'}]]});
  await db.from('assistant_question_clusters').update({last_notified_count:row.occurrence_count}).eq('id',row.id).lt('last_notified_count',row.occurrence_count);
  return row;
}
