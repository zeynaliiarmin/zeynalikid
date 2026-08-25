const clean=(value)=>String(value||'').trim().toLowerCase();
const normalizedTitle=(value)=>String(value||'').replace(/[^a-zA-Zآ-ی]/gi,'').toLowerCase();

export function findReferralTab(tabs,code){
 const active=(Array.isArray(tabs)?tabs:[]).filter(tab=>tab?.active!==false);const value=clean(code);if(!value)return null;
 return active.find(tab=>clean(tab?.shortCode)===value)
  ||active.find(tab=>clean(tab?.id)===value)
  ||active.find(tab=>String(tab?.id||'').replace(/[^a-z]/gi,'').charAt(0).toLowerCase()===value)
  ||active.find(tab=>value.length>=2&&normalizedTitle(tab?.title).startsWith(value))
  ||null;
}

const activeCourseCount=(tab)=>(Array.isArray(tab?.courses)?tab.courses:[]).filter(course=>course?.active!==false).length;

/** Parse base, compact tab, and compact direct-course referral forms from live settings. */
export function parseServerReferral(rawInput,consultants,tabs){
 const raw=clean(rawInput);if(!raw)return null;
 const codes=(Array.isArray(consultants)?consultants:[])
  .filter(item=>item?.active!==false)
  .map(item=>clean(item?.referralCode)).filter(Boolean).sort((a,b)=>b.length-a.length);
 for(const code of codes){
  if(!raw.startsWith(code))continue;
  let tail=raw.slice(code.length).replace(/^[-_]+/,'');
  if(!tail)return{code,canonical:code};
  // A complete tab alias wins first, allowing future alphanumeric short codes.
  const exactTab=findReferralTab(tabs,tail);
  if(exactTab){const tabCode=clean(exactTab.shortCode)||tail;return{code,tabCode,canonical:`${code}${tabCode}`}}
  // Try the longest possible tab prefix before a numeric course index.
  for(let split=tail.length-1;split>=1;split--){
   const requestedTab=tail.slice(0,split);const numericTail=tail.slice(split);if(!/^\d+$/.test(numericTail))continue;
   const courseIndex=Number(numericTail);const tab=findReferralTab(tabs,requestedTab);
   if(!tab||!Number.isSafeInteger(courseIndex)||courseIndex<1||courseIndex>activeCourseCount(tab))continue;
   const tabCode=clean(tab.shortCode)||requestedTab;
   return{code,tabCode,courseIndex,canonical:`${code}${tabCode}${courseIndex}`};
  }
 }
 return null;
}
