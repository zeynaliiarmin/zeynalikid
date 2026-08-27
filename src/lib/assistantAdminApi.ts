import {getAdminSessionToken,clearAdminSession} from '../utils/adminSession';
import type {AssistantKnowledge,AssistantKnowledgeAction,AssistantMatchMode,AssistantResponseMode} from '../utils/assistantMatch';
import type {AssistantSettings} from './assistantApi';

export type AssistantKnowledgeScope='public'|'admin';
export interface AssistantAdminItem extends AssistantKnowledge {status:'draft'|'published';is_active:boolean;created_by:string;created_at?:string;target_tab?:string;target_focus?:string;action_label?:string;}
export interface AssistantUnanswered {id:number;question:string;occurrences:number;status:'pending'|'resolved'|'ignored';page_path?:string;last_seen_at:string;}
export interface AssistantAdminData {knowledge:AssistantAdminItem[];adminKnowledge:AssistantAdminItem[];settings:AssistantSettings&{admin_block_message?:string};unanswered:AssistantUnanswered[];}
export interface AssistantAdminSource {id:string;question:string;category:string;score:number;target_tab:string;target_focus:string;action_label:string;}
export interface AssistantAdminAction {label:string;tab:string;focus:string;record_id?:string;}
export interface AssistantCustomerResult {id:string;name:string;phone:string;type:string;course:string;topics:string[];status:string;date:string;}
export interface AssistantAdminAnswer {ok:true;answer:string;model:string;sources:AssistantAdminSource[];actions:AssistantAdminAction[];suggestions:string[];customer_results?:AssistantCustomerResult[];provider_called:boolean;remaining?:number;provider_notice?:string;}
export interface AssistantKnowledgeTestResult {ok:true;answer:string;model:string;sources:AssistantAdminSource[];actions:AssistantKnowledgeAction[]|AssistantAdminAction[];provider_called:boolean;needs_training?:boolean;confidence?:number;}
export interface ParsedAssistantDraft {scope:AssistantKnowledgeScope;question:string;aliases:string[];answer:string;keywords:string[];category:string;response_mode:AssistantResponseMode;match_mode:AssistantMatchMode;actions:AssistantKnowledgeAction[];target_tab:string;target_focus:string;action_label:string;needs_clarification:boolean;clarification_message:string;}
export interface AssistantTelegramStatus {configured:{token:boolean;owner:boolean;webhook_secret:boolean};connected:boolean;bot:null|{id:string;username:string;name:string};webhook:null|{url:string;pending_updates:number;last_error_date:number;last_error_message:string;allowed_updates:string[]};expected_url:string;error:string;}

const url=`${String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')}/functions/v1/assistant-admin`;
async function call<T>(action:string,payload:Record<string,unknown>={}):Promise<T>{const token=getAdminSessionToken();if(!token)throw new Error('نشست مدیریت معتبر نیست');const response=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});const body=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok){if(response.status===401)clearAdminSession();throw new Error(String(body.error||'عملیات دستیار انجام نشد'))}return body as T}
export const assistantAdminList=():Promise<AssistantAdminData>=>call('list');
export const assistantAdminSave=(item:Partial<AssistantAdminItem>,scope:AssistantKnowledgeScope='public')=>call<{item:AssistantAdminItem;scope:AssistantKnowledgeScope}>('save',{item,scope});
export const assistantAdminDelete=(id:string,scope:AssistantKnowledgeScope='public')=>call<{ok:true}>('delete',{id,scope,confirm:true});
export const assistantAdminSettings=(settings:AssistantSettings&{admin_block_message?:string})=>call<{settings:AssistantSettings}>('settings',{settings});
export const assistantAdminUnansweredStatus=(id:number,status:AssistantUnanswered['status'])=>call<{ok:true}>('unanswered_status',{id,status});
export const assistantAdminImport=(items:Array<Partial<AssistantAdminItem>>)=>call<{ok:true;imported:number}>('batch_import',{items});
export const assistantAdminGenerate=(question:string)=>call<AssistantAdminAnswer>('generate_admin',{question});
export const assistantAdminTestKnowledge=(question:string,scope:AssistantKnowledgeScope)=>call<AssistantKnowledgeTestResult>('test_knowledge',{question,scope});
export const assistantAdminParseInstruction=(instruction:string,scope:AssistantKnowledgeScope)=>call<{ok:true;draft:ParsedAssistantDraft}>('parse_instruction',{instruction,scope});
export const assistantAdminTelegramStatus=()=>call<{ok:true;status:AssistantTelegramStatus}>('telegram_status');
export const assistantAdminTelegramRepair=()=>call<{ok:true;status:AssistantTelegramStatus}>('telegram_repair');
