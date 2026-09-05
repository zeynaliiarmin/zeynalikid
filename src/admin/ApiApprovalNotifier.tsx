import { useEffect, useState } from 'react';
import { adminListPendingApprovals } from '../lib/adminApi';
import type { PendingApproval } from '../lib/adminApi';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

type Props = {
  T: any;
  onNavigateToSecurity: () => void;
};

export default function ApiApprovalNotifier({ T, onNavigateToSecurity }: Props) {
  const [pendings, setPendings] = useState<PendingApproval[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const res = await adminListPendingApprovals();
      const pendingOnly = (res.pending || []).filter(p=>p.status==='pending');
      setPendings(pendingOnly);
    } catch {}
  };

  useEffect(()=>{
    load();
    const iv = setInterval(load, 15000);
    return ()=>clearInterval(iv);
  }, []);

  const visible = pendings.filter(p=>!dismissed.has(p.id));

  if (visible.length===0) return null;

  const first = visible[0];
  const count = visible.length;

  return (
    <div style={{
      position:'fixed',
      top: 12,
      left:'50%',
      transform:'translateX(-50%)',
      zIndex: 7000,
      minWidth: 320,
      maxWidth: 480,
      width:'90%',
      background: T.pop || '#fff',
      border:`2px solid ${T.acc || '#0ea5e9'}`,
      borderRadius:16,
      boxShadow:'0 12px 40px rgba(0,0,0,.22)',
      padding:'14px 16px',
      animation:'fadeSlide .35s ease both',
      direction:'rtl',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
        <div style={{ flex:1, minWidth:0 }}>
          <b style={{ display:'block', fontSize:13.5, color:T.ttl || '#111', marginBottom:4 }}>
            {count===1 ? 'درخواست تایید عملیات گروهی' : `${count} درخواست تایید عملیات گروهی`}
          </b>
          <div style={{ fontSize:12, color:T.txt || '#333', lineHeight:1.8, marginBottom:8 }}>
            {first.operation_type==='bulk_delete' && `ایجنت درخواست حذف ${first.count} مورد از نوع ${first.resource_type} را دارد.`}
            {first.operation_type==='bulk_edit' && `ایجنت درخواست ویرایش ${first.count} مورد از نوع ${first.resource_type} را دارد.`}
            {first.operation_type==='bulk_add' && `ایجنت درخواست افزودن ${first.count} مورد از نوع ${first.resource_type} را دارد (بیش از 10 مورد).`}
            <br/>
            <span style={{ fontSize:11, color:T.mut }}>کلید: {first.api_key?.name || ''} <code style={{direction:'ltr'}}>{first.api_key?.key_prefix}</code></span>
            <br/>
            <span style={{ fontSize:11, color:'#d97706' }}>این درخواست تا {new Date(first.expires_at).toLocaleTimeString('fa-IR')} معتبر است. آیا شما قصد چنین کاری را دارید؟</span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              type="button"
              onClick={()=>{ onNavigateToSecurity(); }}
              style={{
                padding:'7px 14px',
                borderRadius:10,
                border:0,
                background: T.acc || '#0ea5e9',
                color:'#fff',
                fontWeight:800,
                fontSize:12,
                cursor:'pointer',
              }}
            >
              مشاهده و تایید در بخش امنیت
            </button>
            <button
              type="button"
              onClick={()=>setDismissed(prev=>new Set([...prev, first.id]))}
              style={{
                padding:'7px 12px',
                borderRadius:10,
                border:`1px solid ${T.brd || '#ddd'}`,
                background: T.card || '#f8fafc',
                color: T.mut || '#666',
                fontSize:11,
                cursor:'pointer',
              }}
            >
              بستن موقت
            </button>
          </div>
          {count>1 && (
            <div style={{ fontSize:10.5, color:T.mut, marginTop:8 }}>
              و {count-1} درخواست دیگر در انتظار تایید است.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={()=>setDismissed(prev=>new Set([...prev, ...visible.map(v=>v.id)]))}
          style={{
            background:'transparent',
            border:0,
            fontSize:16,
            cursor:'pointer',
            color:T.mut,
            padding:2,
            lineHeight:1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
