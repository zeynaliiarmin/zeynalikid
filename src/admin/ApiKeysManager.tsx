import { useEffect, useState } from 'react';
import {
  adminCreateApiKey,
  adminListApiKeys,
  adminRevokeApiKey,
  adminListPendingApprovals,
  adminApprovePending,
  adminRejectPending,
  adminListApiAuditLogs,
  type ApiKeyInfo,
  type PendingApproval,
  type ApiAuditLog,
} from '../lib/adminApi';

type Props = {
  T: any;
  S: any;
  AdminBtn: () => any;
  Box: any;
};

const SCOPE_OPTIONS: Array<{ id: string; label: string; desc: string }> = [
  { id: 'reviews', label: 'نظرات', desc: 'اضافه/ویرایش/حذف نظرات دستی' },
  { id: 'faqs', label: 'سوالات متداول', desc: 'FAQ دستی' },
  { id: 'courses', label: 'دوره‌ها', desc: 'اضافه/ویرایش/حذف دوره' },
  { id: 'products', label: 'محصولات', desc: 'اضافه/ویرایش/حذف محصول' },
  { id: 'discounts', label: 'تخفیف‌ها', desc: 'تخفیف روی دوره' },
  { id: 'tags', label: 'تگ‌ها', desc: 'پرفروش/پرطرفدار/محبوب' },
  { id: 'featured', label: 'منتخب', desc: 'منتخب کردن دوره' },
  { id: 'articles', label: 'مقاله/ویدیو/پادکست', desc: 'محتوای آموزشی' },
  { id: 'stories', label: 'استوری/هایلایت', desc: 'استوری و هایلایت' },
  { id: 'parent_experiences', label: 'تجربه والدین', desc: 'تجربه والدین' },
  { id: 'multimedia', label: 'چندرسانه‌ای', desc: 'محتوای چند رسانه‌ای' },
  { id: 'banners', label: 'بنرها', desc: 'بنرهای سایت' },
  { id: 'seo', label: 'سئو', desc: 'تنظیمات سئو' },
  { id: 'all', label: 'همه دسترسی‌ها', desc: 'دسترسی کامل به همه موارد' },
];

const EXPIRY_OPTIONS = [
  { id: '1d', label: '1 روز' },
  { id: '7d', label: '7 روز' },
  { id: '30d', label: '30 روز (پیش‌فرض)' },
  { id: '90d', label: '90 روز' },
  { id: '365d', label: '1 سال' },
  { id: 'never', label: 'بدون انقضا' },
  { id: 'custom', label: 'تاریخ سفارشی' },
];

function formatDateFa(iso?: string | null): string {
  if (!iso) return 'بدون انقضا';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR') + ' ' + d.toLocaleTimeString('fa-IR', { hour:'2-digit', minute:'2-digit' });
  } catch { return iso || ''; }
}

export default function ApiKeysManager({ T, S, AdminBtn, Box }: Props) {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [newKeyInfo, setNewKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [formName, setFormName] = useState('');
  const [formScopes, setFormScopes] = useState<string[]>(['all']);
  const [formExpiry, setFormExpiry] = useState('30d');
  const [formCustomDate, setFormCustomDate] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'|'info'>('info');

  const [pendings, setPendings] = useState<PendingApproval[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys'|'pending'|'logs'>('keys');

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await adminListApiKeys();
      setKeys(res.api_keys);
    } catch (e:any) {
      setMsg(e.message || 'خطا در دریافت کلیدها');
      setMsgType('err');
    } finally { setLoadingKeys(false); }
  };

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await adminListPendingApprovals();
      setPendings(res.pending);
    } catch (e:any) {
      setMsg(e.message || 'خطا در دریافت درخواست‌ها');
      setMsgType('err');
    } finally { setLoadingPending(false); }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await adminListApiAuditLogs({ limit: 50 });
      setLogs(res.logs);
    } catch (e:any) {
      setMsg(e.message || 'خطا در دریافت لاگ‌ها');
      setMsgType('err');
    } finally { setLoadingLogs(false); }
  };

  useEffect(()=>{ loadKeys(); loadPending(); }, []);
  useEffect(()=>{ if (activeTab==='logs') loadLogs(); }, [activeTab]);

  // Poll pending every 15s for notifier + list
  useEffect(()=>{
    const iv = setInterval(()=>{ loadPending(); }, 15000);
    return ()=>clearInterval(iv);
  }, []);

  const toggleScope = (id: string) => {
    if (id==='all') {
      setFormScopes(['all']);
      return;
    }
    let next = formScopes.filter(s=>s!=='all');
    if (next.includes(id)) next = next.filter(s=>s!==id);
    else next = [...next, id];
    if (next.length===0) next = ['all'];
    setFormScopes(next);
  };

  const handleCreate = async () => {
    if (!formName.trim()) { setMsg('نام API الزامی است'); setMsgType('err'); return; }
    if (formExpiry==='custom' && !formCustomDate) { setMsg('تاریخ سفارشی را انتخاب کنید'); setMsgType('err'); return; }
    setCreating(true);
    setMsg('');
    try {
      const payload: any = { name: formName.trim(), scopes: formScopes };
      if (formExpiry==='custom') payload.expires_at = new Date(formCustomDate).toISOString();
      else payload.expires_in = formExpiry;
      const res = await adminCreateApiKey(payload);
      setNewKeyPlain(res.api_key);
      setNewKeyInfo(res.key_info as any);
      setMsg('API Key با موفقیت ساخته شد. فقط یک‌بار نمایش داده می‌شود!');
      setMsgType('ok');
      setFormName('');
      setFormScopes(['all']);
      setFormExpiry('30d');
      setFormCustomDate('');
      loadKeys();
    } catch (e:any) {
      setMsg(e.message || 'خطا در ساخت کلید');
      setMsgType('err');
    } finally { setCreating(false); }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`آیا از ابطال کلید "${name}" مطمئن هستید؟ تمام ایجنت‌هایی که از این کلید استفاده می‌کنند دسترسی‌شان قطع می‌شود.`)) return;
    try {
      await adminRevokeApiKey(id);
      setMsg(`کلید "${name}" باطل شد`);
      setMsgType('ok');
      loadKeys();
    } catch (e:any) {
      setMsg(e.message || 'خطا در ابطال');
      setMsgType('err');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('این درخواست گروهی تایید شود؟ ایجنت می‌تواند عملیات را اجرا کند.')) return;
    try {
      await adminApprovePending(id);
      setMsg('درخواست تایید شد. به ایجنت بگویید تایید شد.');
      setMsgType('ok');
      loadPending();
    } catch (e:any) {
      setMsg(e.message || 'خطا در تایید');
      setMsgType('err');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('دلیل رد (اختیاری):') || '';
    if (!confirm('این درخواست رد شود؟')) return;
    try {
      await adminRejectPending(id, reason);
      setMsg('درخواست رد شد');
      setMsgType('ok');
      loadPending();
    } catch (e:any) {
      setMsg(e.message || 'خطا در رد');
      setMsgType('err');
    }
  };

  const copyToClipboard = (text: string) => {
    try { navigator.clipboard.writeText(text); setMsg('کپی شد'); setMsgType('ok'); setTimeout(()=>setMsg(''),2000); } catch { alert(text); }
  };

  return (
    <div>
      {msg && (
        <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:10, fontSize:12.5, fontWeight:700, background: msgType==='err' ? `${T.err}18` : msgType==='ok' ? `${T.ok}18` : `${T.info}18`, border:`1px solid ${msgType==='err'?T.err:msgType==='ok'?T.ok:T.brd}`, color: msgType==='err'?T.err:msgType==='ok'?T.ok:T.txt }}>
          {msg}
        </div>
      )}

      {newKeyPlain && (
        <div style={{ marginBottom:16, padding:16, borderRadius:14, background:`${T.ok}12`, border:`2px solid ${T.ok}`, boxShadow:'0 4px 20px rgba(0,0,0,.08)' }}>
          <b style={{ display:'block', color:T.ok, marginBottom:6, fontSize:14 }}>🔑 کلید جدید - فقط یک‌بار نمایش داده می‌شود!</b>
          <p style={{ fontSize:11.5, color:T.mut, lineHeight:1.8, margin:'0 0 8px' }}>
            این کلید را کپی و در جای امن ذخیره کنید. در مراجعه بعدی به بخش امنیت، فقط نام و پیشوند نمایش داده می‌شود.
          </p>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', background:T.card, border:`1px solid ${T.brd}`, borderRadius:10, padding:'10px 12px' }}>
            <code style={{ direction:'ltr', flex:1, fontSize:13, wordBreak:'break-all', background:T.soft, padding:'6px 10px', borderRadius:8 }}>{newKeyPlain}</code>
            <button type="button" style={{ ...AdminBtn(), background:T.ok, color:'#fff', border:0 }} onClick={()=>copyToClipboard(newKeyPlain)}>کپی</button>
          </div>
          {newKeyInfo && (
            <div style={{ marginTop:10, fontSize:11, color:T.mut }}>
              نام: <b style={{color:T.txt}}>{newKeyInfo.name}</b> | پیشوند: <b style={{direction:'ltr'}}>{newKeyInfo.key_prefix}</b> | انقضا: {formatDateFa(newKeyInfo.expires_at)}
            </div>
          )}
          <button type="button" style={{ ...AdminBtn(), marginTop:10 }} onClick={()=>{ setNewKeyPlain(null); setNewKeyInfo(null); }}>بستن - ذخیره کردم</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button type="button" style={{ ...AdminBtn(), background: activeTab==='keys'?T.acc:T.card, color: activeTab==='keys'?'#fff':T.txt }} onClick={()=>{ setActiveTab('keys'); loadKeys(); }}>🔑 کلیدهای API ({keys.length})</button>
        <button type="button" style={{ ...AdminBtn(), background: activeTab==='pending'?T.acc:T.card, color: activeTab==='pending'?'#fff':T.txt }} onClick={()=>{ setActiveTab('pending'); loadPending(); }}>⏳ تاییدها ({pendings.filter(p=>p.status==='pending').length})</button>
        <button type="button" style={{ ...AdminBtn(), background: activeTab==='logs'?T.acc:T.card, color: activeTab==='logs'?'#fff':T.txt }} onClick={()=>{ setActiveTab('logs'); loadLogs(); }}>📜 لاگ‌ها</button>
      </div>

      {activeTab==='keys' && (
        <>
          <Box title="ساخت API Key جدید برای ایجنت‌ها">
            <p style={{ fontSize:11.5, color:T.mut, lineHeight:1.9, margin:'0 0 12px' }}>
              از این بخش می‌توانید برای هر ایجنت هوش مصنوعی یک کلید مجزا بسازید. کلید فقط یک‌بار نمایش داده می‌شود. بعد از آن فقط نام، پیشوند و وضعیت (فعال/منقضی/باطل‌شده) نمایش داده می‌شود. می‌توانید زمان انقضا تعیین کنید و بعد از انقضا یا حذف، دسترسی ایجنت قطع می‌شود. <b>این API کاملاً رایگان است</b> و از Edge Functions موجود استفاده می‌کند.
            </p>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label style={S.lbl}>نام کلید (مثلاً: Agent Content Bot)</label>
                <input style={S.inp} value={formName} onChange={e=>setFormName(e.target.value)} placeholder="نام قابل شناسایی برای این کلید" />
              </div>
              <div>
                <label style={S.lbl}>سطح دسترسی (Scope) - انتخابی</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8, marginTop:6 }}>
                  {SCOPE_OPTIONS.map(opt=>{
                    const checked = formScopes.includes(opt.id);
                    return (
                      <label key={opt.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', borderRadius:10, border:`1px solid ${checked?T.acc:T.brd}`, background: checked?`${T.acc}10`:T.card, cursor:'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleScope(opt.id)} style={{ marginTop:3 }} />
                        <div style={{ flex:1 }}>
                          <b style={{ display:'block', fontSize:12, color:T.txt }}>{opt.label}</b>
                          <small style={{ display:'block', fontSize:10.5, color:T.mut, lineHeight:1.6 }}>{opt.desc}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.lbl}>مدت اعتبار</label>
                  <select style={S.inp} value={formExpiry} onChange={e=>setFormExpiry(e.target.value)}>
                    {EXPIRY_OPTIONS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                {formExpiry==='custom' && (
                  <div>
                    <label style={S.lbl}>تاریخ انقضای سفارشی</label>
                    <input type="datetime-local" style={S.inp} value={formCustomDate} onChange={e=>setFormCustomDate(e.target.value)} />
                  </div>
                )}
              </div>
              <div>
                <button type="button" style={{ ...AdminBtn(), background:T.acc, color:'#fff', border:0, minWidth:140 }} disabled={creating} onClick={handleCreate}>
                  {creating ? 'در حال ساخت...' : '🔑 ساخت کلید جدید'}
                </button>
              </div>
            </div>
          </Box>

          <Box title={`کلیدهای موجود (${keys.length})`}>
            {loadingKeys ? <div style={{ padding:20, textAlign:'center', color:T.mut }}>در حال بارگذاری...</div> : keys.length===0 ? (
              <div style={{ padding:20, textAlign:'center', color:T.mut }}>هنوز کلیدی ساخته نشده است.</div>
            ) : (
              <div style={{ display:'grid', gap:10 }}>
                {keys.map(k=>{
                  const isExpired = k.status==='expired';
                  const isRevoked = k.status==='revoked';
                  const isActive = k.status==='active';
                  return (
                    <div key={k.id} style={{ border:`1px solid ${isRevoked?T.err:isExpired?'#f59e0b':T.brd}`, borderRadius:12, padding:12, background: isRevoked?`${T.err}08`:isExpired?'#fffbeb':T.card }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                        <b style={{ fontSize:13, color:T.txt }}>{k.name}</b>
                        <code style={{ direction:'ltr', fontSize:11, background:T.soft, padding:'2px 8px', borderRadius:6 }}>{k.key_prefix}••••••••</code>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:10, background: isActive?`${T.ok}18`:isExpired?'#fef3c7':`${T.err}18`, color: isActive?T.ok:isExpired?'#d97706':T.err, border:`1px solid ${isActive?T.ok:isExpired?'#f59e0b':T.err}` }}>
                          {isActive ? 'فعال' : isExpired ? 'منقضی' : 'باطل‌شده'}
                        </span>
                        <span style={{ marginInlineStart:'auto', fontSize:10.5, color:T.mut }}>{formatDateFa(k.created_at)} - انقضا: {formatDateFa(k.expires_at)}</span>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                        {(k.scopes||[]).map(s=><span key={s} style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:T.soft, border:`1px solid ${T.brd}`, color:T.mut }}>{s}</span>)}
                      </div>
                      <div style={{ display:'flex', gap:8, fontSize:11, color:T.mut, flexWrap:'wrap', alignItems:'center' }}>
                        <span>استفاده: {k.usage_count} بار</span>
                        {k.last_used_at && <span>آخرین استفاده: {formatDateFa(k.last_used_at)}</span>}
                        <span style={{ marginInlineStart:'auto' }}>
                          <button type="button" style={{ ...AdminBtn(), padding:'4px 10px', fontSize:11, color:T.err }} disabled={isRevoked} onClick={()=>handleRevoke(k.id, k.name)}>ابطال کلید</button>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Box>

          <Box title="مستندات API برای ایجنت‌ها">
            <div style={{ fontSize:12, lineHeight:1.9, color:T.txt }}>
              <p style={{ margin:'0 0 8px' }}><b>Base URL:</b> <code style={{ direction:'ltr', background:T.soft, padding:'2px 6px', borderRadius:6 }}>{typeof window !== 'undefined' ? (import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'') : ''}/functions/v1/content-api</code></p>
              <p style={{ margin:'0 0 8px' }}><b>Header:</b> <code style={{ direction:'ltr', background:T.soft, padding:'2px 6px', borderRadius:6 }}>Authorization: Bearer YOUR_API_KEY</code></p>
              <p style={{ margin:'0 0 8px' }}>عملیات مجاز: نظر، FAQ، دوره، محصول، تخفیف، تگ، منتخب، مقاله/ویدیو/پادکست، استوری/هایلایت، تجربه والدین، چندرسانه‌ای، بنر، سئو</p>
              <details style={{ marginTop:8 }}>
                <summary style={{ cursor:'pointer', fontWeight:800 }}>نمونه درخواست‌ها</summary>
                <pre style={{ direction:'ltr', textAlign:'left', background:'#0f172a', color:'#e2e8f0', padding:12, borderRadius:10, fontSize:11, overflowX:'auto', marginTop:8 }}>
{`// لیست نظرات
POST /content-api
{ "action": "list_reviews", "api_key": "sk_live_..." }

// ایجاد نظر
{ "action": "create_review", "review": { "reviewer_name": "علی", "comment": "عالی بود", "rating":5, "placements":["course_detail"] } }

// حذف گروهی (نیاز به تایید اگر >1)
{ "action": "bulk_delete_reviews", "ids": [1,2,3] }
// پاسخ: { requires_approval:true, pending_id:"..." }
// سپس ایجنت باید از شما بپرسد: آیا در پنل تایید کردید؟
// شما در تب تاییدها تایید می‌کنید
// ایجنت: { "action": "execute_pending", "pending_id":"..." }

// اضافه گروهی >10 نیاز به تایید
{ "action": "bulk_create_reviews", "items": [ {...}, {...} ] }`}
                </pre>
              </details>
            </div>
          </Box>
        </>
      )}

      {activeTab==='pending' && (
        <Box title={`درخواست‌های نیازمند تایید (${pendings.filter(p=>p.status==='pending').length} در انتظار)`}>
          {loadingPending ? <div style={{ padding:20, textAlign:'center', color:T.mut }}>در حال بارگذاری...</div> : pendings.length===0 ? (
            <div style={{ padding:20, textAlign:'center', color:T.mut }}>درخواستی وجود ندارد</div>
          ) : (
            <div style={{ display:'grid', gap:12 }}>
              {pendings.map(p=>{
                const isPending = p.status==='pending';
                const isExpired = p.status==='expired';
                return (
                  <div key={p.id} style={{ border:`1px solid ${isPending?T.acc:isExpired?'#f59e0b':T.brd}`, borderRadius:12, padding:12, background: isPending?`${T.acc}08`:T.card }}>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:10, background: p.operation_type==='bulk_delete'?`${T.err}18`:p.operation_type==='bulk_edit'?'#fef3c7':`${T.ok}18`, color: p.operation_type==='bulk_delete'?T.err:p.operation_type==='bulk_edit'?'#d97706':T.ok }}>
                        {p.operation_type==='bulk_delete'?'حذف گروهی':p.operation_type==='bulk_edit'?'ویرایش گروهی':'افزودن گروهی'} - {p.resource_type}
                      </span>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:8, background: isPending?`${T.acc}18`:isExpired?'#fef3c7':p.status==='approved'?`${T.ok}18`:`${T.err}18`, color: isPending?T.acc:isExpired?'#d97706':p.status==='approved'?T.ok:T.err }}>{p.status}</span>
                      <span style={{ fontSize:11, color:T.mut }}>تعداد: <b style={{color:T.txt}}>{p.count}</b></span>
                      <span style={{ fontSize:10, color:T.mut, marginInlineStart:'auto' }}>{formatDateFa(p.requested_at)} - انقضا: {formatDateFa(p.expires_at)}</span>
                    </div>
                    {p.api_key && <div style={{ fontSize:11, color:T.mut, marginBottom:6 }}>کلید: <b>{p.api_key.name}</b> <code style={{direction:'ltr'}}>{p.api_key.key_prefix}</code></div>}
                    {p.resource_ids && p.resource_ids.length>0 && (
                      <div style={{ fontSize:11, color:T.mut, marginBottom:6 }}>شناسه‌ها: <code style={{ wordBreak:'break-all' }}>{p.resource_ids.slice(0,20).join(', ')}{p.resource_ids.length>20?'...':''}</code></div>
                    )}
                    {p.payload && (
                      <details style={{ marginBottom:8 }}>
                        <summary style={{ cursor:'pointer', fontSize:11, color:T.mut }}>نمایش جزئیات payload</summary>
                        <pre style={{ background:T.soft, padding:8, borderRadius:8, fontSize:10, maxHeight:200, overflow:'auto', direction:'ltr', textAlign:'left' }}>{JSON.stringify(p.payload, null, 2).slice(0,2000)}</pre>
                      </details>
                    )}
                    {isPending && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button type="button" style={{ ...AdminBtn(), background:T.ok, color:'#fff', border:0 }} onClick={()=>handleApprove(p.id)}>✅ تایید</button>
                        <button type="button" style={{ ...AdminBtn(), background:T.err, color:'#fff', border:0 }} onClick={()=>handleReject(p.id)}>❌ رد</button>
                      </div>
                    )}
                    {p.decided_by && <div style={{ fontSize:10, color:T.mut, marginTop:6 }}>توسط: {p.decided_by} در {formatDateFa(p.decided_at)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </Box>
      )}

      {activeTab==='logs' && (
        <Box title="لاگ عملیات API">
          {loadingLogs ? <div style={{ padding:20, textAlign:'center', color:T.mut }}>در حال بارگذاری...</div> : logs.length===0 ? (
            <div style={{ padding:20, textAlign:'center', color:T.mut }}>لاگی وجود ندارد</div>
          ) : (
            <div style={{ display:'grid', gap:8 }}>
              {logs.map(l=>(
                <div key={l.id} style={{ border:`1px solid ${T.brd}`, borderRadius:10, padding:10, background: l.success?T.card:`${T.err}08`, fontSize:11 }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <b style={{ color:T.txt }}>{l.action}</b>
                    <span style={{ color:T.mut }}>{l.resource_type}{l.resource_id?` #${l.resource_id}`:''}</span>
                    <span style={{ fontSize:10, padding:'2px 6px', borderRadius:6, background: l.success?`${T.ok}18`:`${T.err}18`, color: l.success?T.ok:T.err }}>{l.success?'موفق':'ناموفق'}</span>
                    <span style={{ marginInlineStart:'auto', fontSize:10, color:T.mut }}>{formatDateFa(l.created_at)}</span>
                  </div>
                  {l.api_key && <div style={{ fontSize:10, color:T.mut, marginTop:4 }}>کلید: {l.api_key.name} <code>{l.api_key.key_prefix}</code></div>}
                  {l.ip && <div style={{ fontSize:10, color:T.mut }}>IP: {l.ip}</div>}
                </div>
              ))}
            </div>
          )}
        </Box>
      )}
    </div>
  );
}
