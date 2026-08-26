import {useEffect,useMemo,useRef,useState} from 'react';
import type {DynamicRecord} from '../app/AppContext';
import {fetchAssistantData,generateAssistantAnswer,type AssistantAction,type AssistantPublicData,type AssistantSuggestion} from '../lib/assistantApi';
import GuideHeadsetIcon from './GuideHeadsetIcon';
import './assistant-widget.css';

type Message={role:'assistant'|'user';text:string;actions?:AssistantAction[];suggestions?:AssistantSuggestion[]};

export default function AssistantWidget({T,lang}:{T:DynamicRecord;lang:'fa'|'en'}){
 const [data,setData]=useState<AssistantPublicData|null>(null),[open,setOpen]=useState(false),[input,setInput]=useState(''),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const endRef=useRef<HTMLDivElement|null>(null),inputRef=useRef<HTMLInputElement|null>(null);const en=lang==='en';
 useEffect(()=>{let alive=true;fetchAssistantData().then(value=>{if(alive){setData(value);setMessages([{role:'assistant',text:value.settings.welcome_message,suggestions:value.settings.suggested_questions}])}}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{if(open){setTimeout(()=>inputRef.current?.focus(),100);setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),80)}},[open,messages.length,busy]);
 const initialSuggestions=useMemo(()=>data?.settings.suggested_questions?.length?data.settings.suggested_questions:(data?.knowledge||[]).slice(0,4).map(item=>({question:item.question,label:item.question,path:item.link_url||''})),[data]);
 if(!data?.settings.enabled)return null;
 const ask=async(value=input)=>{const question=value.trim();if(question.length<2||busy)return;setInput('');setError('');setMessages(current=>[...current,{role:'user',text:question}]);setBusy(true);try{const result=await generateAssistantAnswer(question);setMessages(current=>[...current,{role:'assistant',text:result.answer,actions:result.actions,suggestions:result.suggestions?.length?result.suggestions:initialSuggestions}])}catch(reason){const message=String((reason as Error)?.message||'دستیار موقتاً در دسترس نیست.');setError(message);setMessages(current=>[...current,{role:'assistant',text:message,suggestions:initialSuggestions}])}finally{setBusy(false)}};
 return <>
  <button type="button" className="zka-launch" aria-label={en?'Open site guide':'بازکردن راهنمای سایت'} aria-expanded={open} onClick={()=>setOpen(value=>!value)} style={{background:T.grad||T.acc,boxShadow:T.shadowMedium||T.neuOut}}><GuideHeadsetIcon size={29}/></button>
  {open&&<section className="zka-panel" role="dialog" aria-modal="false" aria-label={en?'Site guide':'راهنمای سایت'} style={{background:T.pop||T.card,borderColor:T.brd,boxShadow:T.shadowStrong||'0 24px 70px rgba(0,0,0,.25)'}}>
   <header className="zka-head" style={{background:T.grad||T.acc}}><GuideHeadsetIcon size={31}/><button type="button" aria-label={en?'Close':'بستن'} onClick={()=>setOpen(false)}>×</button></header>
   <div className="zka-messages" role="log" aria-live="polite">
    {messages.map((message,index)=><div key={index} className={`zka-turn ${message.role}`}><div className={`zka-message ${message.role}`} style={message.role==='assistant'?{background:T.soft,color:T.txt}:{background:T.acc,color:'#fff'}}>{message.text}</div>{message.actions?.length?<div className="zka-actions">{message.actions.map(action=><a key={`${action.path}-${action.label}`} href={action.path} style={{borderColor:T.acc,color:T.acc}}>{action.label}</a>)}</div>:null}{message.role==='assistant'&&message.suggestions?.length?<div className="zka-next" aria-label="پرسش‌های پیشنهادی">{message.suggestions.map(item=><button type="button" key={`${index}-${item.question}`} onClick={()=>ask(item.question)} style={{borderColor:T.brd,color:T.txt}}>{item.label||item.question}</button>)}</div>:null}</div>)}
    {busy&&<div className="zka-turn assistant"><div className="zka-message assistant zka-typing" style={{background:T.soft,color:T.txt}}><i/><i/><i/></div></div>}
    <div ref={endRef}/>
   </div>
   {messages.length===0&&initialSuggestions.length>0&&<div className="zka-next zka-initial">{initialSuggestions.map(item=><button type="button" key={item.question} onClick={()=>ask(item.question)}>{item.label||item.question}</button>)}</div>}
   <form className="zka-form" onSubmit={event=>{event.preventDefault();ask()}}><input ref={inputRef} value={input} maxLength={500} onChange={event=>setInput(event.target.value)} placeholder={en?'Type your question…':'سؤال خود را بنویسید…'} style={{borderColor:T.brd,background:T.inp,color:T.txt}}/><button type="submit" aria-label="ارسال سؤال" disabled={input.trim().length<2||busy} style={{background:T.grad||T.acc}}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
   <footer style={{color:T.mut}}>{data.settings.disclaimer}<br/><span>{en?'Do not enter phone numbers or private medical details.':'شماره تماس یا اطلاعات پزشکی خصوصی وارد نکنید.'}</span>{error&&<span className="zka-sr-only">{error}</span>}</footer>
  </section>}
 </>;
}
