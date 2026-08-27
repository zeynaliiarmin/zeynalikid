import type {AssistantKnowledge,AssistantKnowledgeAction} from '../utils/assistantMatch';
import {PROJECT_CODE} from '../config/project';

export interface AssistantSuggestion {question:string;label:string;path?:string;}
export type AssistantAction=AssistantKnowledgeAction;
export interface AssistantSettings {enabled:boolean;welcome_message:string;fallback_message:string;disclaimer:string;suggested_questions:AssistantSuggestion[];frequent_question_threshold?:number;revision?:number;updated_at?:string;}
export interface AssistantPublicData {knowledge:AssistantKnowledge[];settings:AssistantSettings;}
export interface AssistantGeneratedAnswer {ok:true;answer:string;model:string;actions:AssistantAction[];suggestions:AssistantSuggestion[];provider_called:boolean;blocked_admin:boolean;blocked_private?:boolean;remaining_daily:number;limit_code?:string;support_phone?:string;}
export interface AssistantStatus {enabled:boolean;revision:number;updated_at:string;}

const base=String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
const url=`${base}/functions/v1/assistant-public`;
export const ASSISTANT_SETTINGS_EVENT=`${PROJECT_CODE}:assistant-settings`;
let memory:{at:number;value:AssistantPublicData}|null=null;

function browserId(){
  try{const key=`${PROJECT_CODE}_assistant_browser_id_v1`,current=localStorage.getItem(key);if(current&&/^[a-z0-9-]{16,80}$/i.test(current))return current;const next=typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;localStorage.setItem(key,next);return next}catch{return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`}
}

export function announceAssistantSettings(enabled:boolean){
  memory=null;window.dispatchEvent(new CustomEvent(ASSISTANT_SETTINGS_EVENT,{detail:{enabled}}));
  try{const channel=new BroadcastChannel(ASSISTANT_SETTINGS_EVENT);channel.postMessage({enabled});channel.close()}catch{}
  try{localStorage.setItem(`${ASSISTANT_SETTINGS_EVENT}:changed`,JSON.stringify({enabled,at:Date.now()}))}catch{}
}

export async function fetchAssistantStatus():Promise<AssistantStatus>{
  const response=await fetch(`${url}?status=1`,{cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('دستیار در دسترس نیست');const body=await response.json();return {enabled:body.enabled===true,revision:Number(body.revision||0),updated_at:String(body.updated_at||'')};
}

export async function fetchAssistantData(force=false):Promise<AssistantPublicData>{
  const now=Date.now();if(!force&&memory&&now-memory.at<30_000)return memory.value;
  const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('دستیار در دسترس نیست');const body=await response.json();
  const value={knowledge:Array.isArray(body.knowledge)?body.knowledge:[],settings:{enabled:body.settings?.enabled===true,welcome_message:String(body.settings?.welcome_message||'سلام! سؤال خود را بپرسید.'),fallback_message:String(body.settings?.fallback_message||'در مورد این سؤال اطلاعاتی ندارم.'),disclaimer:String(body.settings?.disclaimer||'این دستیار جایگزین مشاوره تخصصی نیست.'),suggested_questions:Array.isArray(body.settings?.suggested_questions)?body.settings.suggested_questions:[],frequent_question_threshold:Math.max(2,Math.min(100,Number(body.settings?.frequent_question_threshold)||3)),revision:Number(body.settings?.revision||0),updated_at:body.settings?.updated_at}};
  memory={at:now,value};return value;
}

async function post<T>(payload:Record<string,unknown>):Promise<T>{
  const response=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(String(body.error||'دستیار موقتاً در دسترس نیست'));return body as T;
}
export const generateAssistantAnswer=(question:string,ui_language:'fa'|'en')=>post<AssistantGeneratedAnswer>({action:'generate',question,ui_language,client_id:browserId(),page_path:typeof location==='undefined'?'':location.pathname});
