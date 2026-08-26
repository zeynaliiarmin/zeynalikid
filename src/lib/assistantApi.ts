import type {AssistantKnowledge} from '../utils/assistantMatch';
import {PROJECT_CODE} from '../config/project';

export interface AssistantSuggestion {question:string;label:string;path?:string;}
export interface AssistantAction {label:string;path:string;}
export interface AssistantSettings {enabled:boolean;welcome_message:string;fallback_message:string;disclaimer:string;suggested_questions:AssistantSuggestion[];updated_at?:string;}
export interface AssistantPublicData {knowledge:AssistantKnowledge[];settings:AssistantSettings;}
export interface AssistantGeneratedAnswer {ok:true;answer:string;model:string;actions:AssistantAction[];suggestions:AssistantSuggestion[];provider_called:boolean;blocked_admin:boolean;blocked_private?:boolean;remaining_daily:number;limit_code?:string;support_phone?:string;}

const base=String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
const url=`${base}/functions/v1/assistant-public`;
const CACHE_KEY=`${PROJECT_CODE}_assistant_public_v2`;
const CLIENT_KEY=`${PROJECT_CODE}_assistant_browser_id_v1`;
let memory:{at:number;value:AssistantPublicData}|null=null;

function browserId(){
 try{const current=localStorage.getItem(CLIENT_KEY);if(current&&/^[a-z0-9-]{16,80}$/i.test(current))return current;const next=typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;localStorage.setItem(CLIENT_KEY,next);return next}catch{return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`}
}

export async function fetchAssistantData():Promise<AssistantPublicData>{
 const now=Date.now();if(memory&&now-memory.at<300000)return memory.value;
 try{const cached=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(cached?.value&&now-Number(cached.at||0)<300000){memory=cached;return cached.value}}catch{}
 const response=await fetch(url,{headers:{'Content-Type':'application/json'}});if(!response.ok)throw new Error('دستیار در دسترس نیست');const body=await response.json();
 const value={knowledge:Array.isArray(body.knowledge)?body.knowledge:[],settings:{enabled:body.settings?.enabled!==false,welcome_message:String(body.settings?.welcome_message||'سلام! سؤال خود را بپرسید.'),fallback_message:String(body.settings?.fallback_message||'در مورد این سؤال اطلاعاتی ندارم.'),disclaimer:String(body.settings?.disclaimer||'این دستیار جایگزین مشاوره تخصصی نیست.'),suggested_questions:Array.isArray(body.settings?.suggested_questions)?body.settings.suggested_questions:[],updated_at:body.settings?.updated_at}};
 memory={at:now,value};try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(memory))}catch{}return value;
}

async function post<T>(payload:Record<string,unknown>):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(String(body.error||'دستیار موقتاً در دسترس نیست'));return body as T;
}
export const generateAssistantAnswer=(question:string,ui_language:'fa'|'en')=>post<AssistantGeneratedAnswer>({action:'generate',question,ui_language,client_id:browserId()});
