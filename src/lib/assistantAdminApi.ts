import {getAdminSessionToken,clearAdminSession} from '../utils/adminSession';
import type {AssistantKnowledge} from '../utils/assistantMatch';
import type {AssistantSettings} from './assistantApi';
export interface AssistantAdminItem extends AssistantKnowledge {status:'draft'|'published';is_active:boolean;created_by:string;created_at?:string;}
export interface AssistantUnanswered {id:number;question:string;occurrences:number;status:'pending'|'resolved'|'ignored';page_path?:string;last_seen_at:string;}
export interface AssistantAdminData {knowledge:AssistantAdminItem[];settings:AssistantSettings;unanswered:AssistantUnanswered[];feedback:Array<{knowledge_id:string;helpful:boolean}>;}
const url=`${String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')}/functions/v1/assistant-admin`;
async function call(action:string,payload:Record<string,unknown>={}){const token=getAdminSessionToken();if(!token)throw new Error('نشست مدیریت معتبر نیست');const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});const body=await response.json().catch(()=>({}));if(!response.ok){if(response.status===401)clearAdminSession();throw new Error(body.error||'عملیات دستیار انجام نشد')}return body}
export const assistantAdminList=():Promise<AssistantAdminData>=>call('list');
export const assistantAdminSave=(item:Partial<AssistantAdminItem>)=>call('save',{item});
export const assistantAdminDelete=(id:string)=>call('delete',{id,confirm:true});
export const assistantAdminSettings=(settings:AssistantSettings)=>call('settings',{settings});
export const assistantAdminUnansweredStatus=(id:number,status:AssistantUnanswered['status'])=>call('unanswered_status',{id,status});
export const assistantAdminImport=(items:Array<Partial<AssistantAdminItem>>)=>call('batch_import',{items});
