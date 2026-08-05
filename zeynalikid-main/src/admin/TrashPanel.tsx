import { useEffect, useState } from 'react';
import { isSupabaseConfigured, fetchDeletedSubmissions, restoreSubmission, permanentDeleteSubmission, permanentDeleteMultipleSubmissions } from '../lib/supabase';

const SK={subs:'zkid_submissions_v2', trash:'zkid_trash_v1'};
const getLS=(k:string,f:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
const setLS=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const digitsOf=(s:any)=>String(s??'').replace(/\D/g,'');

export default function TrashPanel({T,S,AdminBtn,onRestored,refreshKey}:{T:any,S:any,AdminBtn:()=>any,onRestored:(sub:any)=>void,refreshKey:number}){
 const [deletedSubs,setDeletedSubs]=useState<any[]>([]);
 const [selectedIds,setSelectedIds]=useState<Set<string|number>>(new Set());
 const [loading,setLoading]=useState(false);

 useEffect(()=>{let alive=true;const load=async()=>{setLoading(true);try{if(isSupabaseConfigured){const data=await fetchDeletedSubmissions();if(alive)setDeletedSubs(data||[])}else{if(alive)setDeletedSubs(getLS(SK.trash,[]))}}catch(e){console.error('Error loading deleted submissions:',e);if(alive)setDeletedSubs(getLS(SK.trash,[]))}finally{if(alive)setLoading(false)}};load();return()=>{alive=false}},[refreshKey]);

 const handleRestore=async(id:string|number)=>{const sub=deletedSubs.find(s=>s.id===id);if(!sub)return;try{if(isSupabaseConfigured){await restoreSubmission(id)}else{setLS(SK.trash,getLS(SK.trash,[]).filter((x:any)=>x.id!==id));const subs=getLS(SK.subs,[]);const {deleted_at,...clean}=sub;setLS(SK.subs,[...subs,clean])}setDeletedSubs(prev=>prev.filter(s=>s.id!==id));setSelectedIds(prev=>{const n=new Set(prev);n.delete(id);return n});onRestored(sub)}catch(e){console.error('Error restoring submission:',e)}};

 const handlePermanentDelete=async(id:string|number)=>{if(!confirm('آیا از حذف دائمی این فرم مطمئن هستید؟ این عملیات قابل بازگشت نیست.'))return;try{if(isSupabaseConfigured){await permanentDeleteSubmission(id)}else{setLS(SK.trash,getLS(SK.trash,[]).filter((x:any)=>x.id!==id))}setDeletedSubs(prev=>prev.filter(s=>s.id!==id))}catch(e){console.error('Error deleting submission permanently:',e)}};

 const handlePermanentDeleteMultiple=async()=>{if(selectedIds.size===0)return;if(!confirm('آیا از حذف دائمی فرم‌های انتخاب‌شده مطمئن هستید؟ این عملیات قابل بازگشت نیست.'))return;const ids=Array.from(selectedIds);try{if(isSupabaseConfigured){await permanentDeleteMultipleSubmissions(ids)}else{setLS(SK.trash,getLS(SK.trash,[]).filter((x:any)=>!selectedIds.has(x.id)))}setDeletedSubs(prev=>prev.filter(s=>!selectedIds.has(s.id)));setSelectedIds(new Set())}catch(e){console.error('Error deleting multiple submissions permanently:',e)}};

 const download=(name:string,content:string,type='text/plain;charset=utf-8')=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)};
 const rows=deletedSubs.map(s=>({نام:s.pName||'',شماره:s.fullPhone||'',کد_پیگیری:s.trackingCode||'',دوره:s.course?.title||'بدون دوره',تاریخ_ثبت:s.date||'',تاریخ_حذف:s.deleted_at?new Date(s.deleted_at).toLocaleDateString('fa-IR'):''}));
 const exportExcel=()=>{const keys=Object.keys(rows[0]||{نام:'',شماره:'',کد_پیگیری:'',دوره:'',تاریخ_ثبت:'',تاریخ_حذف:''});const html=`<html><meta charset="utf-8"><body><table border="1"><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${String((r as any)[k]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;download('zeynalikid-trash-export.xls',html,'application/vnd.ms-excel;charset=utf-8')};
 const exportPhones=()=>download('trash-phones.txt',deletedSubs.map(s=>s.fullPhone).filter(Boolean).join('\n'));
 const exportWhatsApp=()=>{const links=deletedSubs.map(s=>digitsOf(s.fullPhone||'')).filter(Boolean).map(n=>`<p><a href="https://wa.me/${n}">${n}</a></p>`).join('');download('trash-whatsapp-links.html',`<html><meta charset="utf-8"><body>${links}</body></html>`,'text/html;charset=utf-8')};

 return <div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
   <h3 style={{color:T.err,margin:0}}>🗑️ سطل آشغال ({deletedSubs.length})</h3>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <button style={AdminBtn()} onClick={exportExcel}>خروجی Excel</button>
    <button style={AdminBtn()} onClick={exportPhones}>خروجی شماره‌ها</button>
    <button style={AdminBtn()} onClick={exportWhatsApp}>خروجی واتساپ</button>
    {selectedIds.size>0&&<button style={{...AdminBtn(),color:T.err,borderColor:T.err}} onClick={handlePermanentDeleteMultiple}>حذف دائمی انتخاب‌شده‌ها ({selectedIds.size})</button>}
   </div>
  </div>
  {loading?<div style={{textAlign:'center',color:T.mut,padding:40}}>در حال بارگذاری...</div>
  :deletedSubs.length===0?<div style={{textAlign:'center',color:T.mut,padding:40}}>سطل آشغال خالی است.</div>
  :<div style={{display:'grid',gap:10}}>
   {deletedSubs.map(sub=><div key={sub.id} style={{border:`1px solid ${T.err}`,background:T.badge,borderRadius:14,padding:12}}>
    <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
     <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={e=>{const n=new Set(selectedIds);if(e.target.checked)n.add(sub.id);else n.delete(sub.id);setSelectedIds(n)}}/>
     <div style={{flex:1,minWidth:120}}>
      <b>{sub.pName||'بدون نام'}</b>
      <span style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:`${T.err}18`,color:T.err,border:`1px solid ${T.err}55`,marginInlineStart:8}}>حذف‌شده</span>
     </div>
     <div style={{color:T.mut,fontSize:11,whiteSpace:'nowrap'}}>حذف: {sub.deleted_at?new Date(sub.deleted_at).toLocaleDateString('fa-IR'):'—'}</div>
     <button style={{...AdminBtn(),color:T.ok,borderColor:T.ok}} onClick={()=>handleRestore(sub.id)}>بازیابی</button>
     <button style={{...AdminBtn(),color:T.err,borderColor:T.err}} onClick={()=>handlePermanentDelete(sub.id)}>حذف دائمی</button>
    </div>
    <div style={{fontSize:12,color:T.mut,marginTop:6,direction:'ltr',textAlign:'right'}}>{sub.fullPhone||'—'} | {sub.trackingCode||'—'} | {sub.course?.title||'بدون دوره'}</div><div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:4}}>{sub.payment?.receiptDeletedAt&&<span style={{color:T.mut,fontSize:11}}>🗑️ فیش حذف شده: {new Date(sub.payment.receiptDeletedAt).toLocaleDateString('fa-IR')}</span>}{sub.payment?.amount&&<span style={{color:T.mut,fontSize:11}}>💰 {Number(sub.payment.amount).toLocaleString()} تومان</span>}{sub.payment?.paidAt&&<span style={{color:T.mut,fontSize:11}}>📅 {sub.payment.paidAt}</span>}</div>
   </div>)}
  </div>}
 </div>
}
