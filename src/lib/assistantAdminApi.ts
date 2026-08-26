import {getAdminSessionToken,clearAdminSession} from '../utils/adminSession';
import type {AssistantKnowledge} from '../utils/assistantMatch';
import type {AssistantSettings} from './assistantApi';

export interface AssistantAdminItem extends AssistantKnowledge {
  status:'draft'|'published';
  is_active:boolean;
  created_by:string;
  created_at?:string;
}

export interface AssistantUnanswered {
  id:number;
  question:string;
  occurrences:number;
  status:'pending'|'resolved'|'ignored';
  page_path?:string;
  last_seen_at:string;
}

export interface AssistantAdminData {
  knowledge:AssistantAdminItem[];
  settings:AssistantSettings;
  unanswered:AssistantUnanswered[];
  feedback:Array<{knowledge_id:string;helpful:boolean}>;
}

export interface AssistantMistralPreviewSource {
  id:string;
  question:string;
  category:string;
  link_url:string;
  score:number;
}

export interface AssistantMistralPreview {
  ok:true;
  answer:string;
  model:string;
  sources:AssistantMistralPreviewSource[];
  provider_called:boolean;
  remaining:number;
}

const url=`${String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')}/functions/v1/assistant-admin`;

async function call<T>(action:string,payload:Record<string,unknown>={}):Promise<T>{
  const token=getAdminSessionToken();
  if(!token)throw new Error('نشست مدیریت معتبر نیست');
  const response=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({action,...payload}),
  });
  const body=await response.json().catch(()=>({})) as Record<string,unknown>;
  if(!response.ok){
    if(response.status===401)clearAdminSession();
    throw new Error(String(body.error||'عملیات دستیار انجام نشد'));
  }
  return body as T;
}

export const assistantAdminList=():Promise<AssistantAdminData>=>call('list');
export const assistantAdminSave=(item:Partial<AssistantAdminItem>)=>call<{item:AssistantAdminItem}>('save',{item});
export const assistantAdminDelete=(id:string)=>call<{ok:true}>('delete',{id,confirm:true});
export const assistantAdminSettings=(settings:AssistantSettings)=>call<{settings:AssistantSettings}>('settings',{settings});
export const assistantAdminUnansweredStatus=(id:number,status:AssistantUnanswered['status'])=>call<{ok:true}>('unanswered_status',{id,status});
export const assistantAdminImport=(items:Array<Partial<AssistantAdminItem>>)=>call<{ok:true;imported:number}>('batch_import',{items});
export const assistantAdminGeneratePreview=(question:string)=>call<AssistantMistralPreview>('generate_preview',{question});
