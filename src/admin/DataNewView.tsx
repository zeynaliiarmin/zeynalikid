// «فرم‌ها و دوره‌ها — نمای کاربر» — کاملاً در سطح ماژول تا هویت کامپوننت پایدار بماند.
// (تعریف داخل بدنه AdminPanel باعث remount زیردرخت در هر ست‌استیت والد می‌شد:
//  تب جزئیات ریست می‌شد، مودال بسته نمی‌شد، انتخاب پیگیری ثبت نمی‌شد و صفحه می‌پرید.)
// چیدمان کارت بسته (طبق درخواست مالک):
//  سطر۱: نام راست · کد پیگیری چپ (کلیک = کپی)
//  سطر۲: چک‌باکس انتخاب راست · شماره تماس وسط (بدون کادر؛ کلیک = تماس/واتساپ/روبیکا/کپی) · وضعیت چپ
//  سطر۳: تاریخ راست · دکمه جزئیات وسط · تگ‌ها (ناقص/مشاوره‌شده/تبِ مخالف) چپ
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Modal } from '../app/appSupport';
import SubCard from './SubCard';
import AdminPopover from './AdminPopover';
import { digits, faNum, fmtWhen } from './adminUtils';
import { ZkCheckIcon, ZkTrashIcon, ZkFilterIcon, ZkResetIcon, ZkPhoneIcon, ZkCopyIcon } from './adminIcons';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

type NvTab = 'consult' | 'course' | 'users';

const ChipGroup = ({ label, options, val, set }: { label: string; options: string[]; val: string; set: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return <section className={`zkad-filter-card ${open ? 'zkad-filter-open' : ''}`}><button type="button" className="zkad-filter-card-head" onClick={() => setOpen(v => !v)}><span>{label}</span><small>{val}</small><b>{open ? '⌃' : '⌄'}</b></button>{open && <div className="zkad-chiprow">{options.map(o => <button type="button" key={o} className={`zkad-chip ${val === o ? 'on' : ''}`} onClick={() => { set(o); setOpen(false); }}>{o}</button>)}</div>}</section>;
};

// شماره تماس — متن ساده بدون کادر؛ کلیک → منوی فشرده (نصف اندازه قبل)
function NvPhoneBtn({ T, raw, sub, onCopy }: { T: any; raw: string; sub?: any; onCopy: (v: string) => void }) {
  const [popOpen, setPopOpen] = useState(false);
  const closePop = useCallback(() => setPopOpen(false), []);
  if (!raw || raw === '+') return <span style={{ color: T.mut }}>—</span>;
  const cc = String(sub?.cc || sub?.shipping?.phoneCc || '');
  const wa = digits(raw.startsWith('+') || raw.startsWith('00') ? raw : `${cc}${raw}`);
  const isIran = cc === '+98' || raw.startsWith('+98') || raw.startsWith('0098') || raw.startsWith('09');
  const item: CSSProperties = { padding: '5px 8px', fontSize: 11.5, gap: 5, borderRadius: 8 };
  return (
    <AdminPopover open={popOpen} onClose={closePop} width={122} ariaLabel={T.en ? 'Phone actions' : 'عملیات شماره تماس'}
      trigger={<button type="button" dir="ltr" aria-haspopup="menu" aria-expanded={popOpen} title={T.en ? 'Call / WhatsApp / Rubika / Copy' : 'تماس · واتساپ · روبیکا · کپی'}
        onClick={(ev) => { ev.stopPropagation(); setPopOpen(v => !v); }}
        style={{ background: 'none', border: 0, padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, fontSize: 10.5, color: T.txt, direction: 'ltr', letterSpacing: '.2px' }}>
        {raw}
      </button>}>
      <div dir="ltr" style={{ fontSize: 11.5, fontWeight: 900, padding: '6px 8px 4px', textAlign: 'center', fontFamily: 'ui-monospace,Menlo,monospace' }}>{raw}</div>
      <a href={`tel:${raw}`} style={item} className="zkad-pop-item" role="menuitem" onClick={closePop}><ZkPhoneIcon size={12}/> {T.en ? 'Call' : 'تماس'}</a>
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={item} className="zkad-pop-item t-ok" role="menuitem" onClick={closePop}><span className="zkad-pop-dot t-ok"/> واتساپ</a>
      {isIran && <a href={`https://rubika.ir/${wa}`} target="_blank" rel="noreferrer" style={item} className="zkad-pop-item t-warn" role="menuitem" onClick={closePop}><span className="zkad-pop-dot t-warn"/> روبیکا</a>}
      <button type="button" style={item} className="zkad-pop-item" role="menuitem" onClick={() => { onCopy(raw); closePop(); }}><ZkCopyIcon size={12}/> {T.en ? 'Copy' : 'کپی'}</button>
    </AdminPopover>
  );
}

export default function DataNewViewPanel({ app }: { app: any }) {
  const { T, subs, filteredAll, statusOptions, getStatus, getPay, changeStatus, changeConsultStatus,
    selectedIds, setSelectedIds, toggleSelectAll, clearSelection, setSubs, setMsg, setMsgType,
    nvTab, setNvTab, nvQ, setNvQ, nvPhone, setNvPhone, subCardIO, setNvCounts } = app;
  const modalSubRaw = app.modalSub;
  // زیرمجموعه زنده: با هر patch در لیست، مقادیر مودال هم تازه بمانند (تیک‌ها/سوئیچ‌ها برنگردند)
  const modalSub = modalSubRaw ? ((subs as any[]).find((x: any) => String(x.id) === String((modalSubRaw as any).id)) || modalSubRaw) : null;
  const setModalSub = app.setModalSub;
  const [modalTab, setModalTab] = useState<'parent' | 'course' | undefined>(undefined);
  const [nvFs, setNvFs] = useState<{ stat: string; pay: string; date: string; uStat: string }>({ stat: 'همه', pay: 'همه', date: '', uStat: 'همه' });
  const payOptions = ['همه', 'پرداخت‌شده', 'در انتظار پرداخت', 'بدون پرداخت'];
  const consultStatuses = ['مشاوره اولیه', 'پیگیری', 'مشاوره شده', 'ناقص'];

  const nvCopy = useCallback((value: string) => {
    if (!value) return;
    const okMsg = () => { setMsg(T.en ? 'Copied to clipboard' : 'کپی شد ✓'); setMsgType('ok'); };
    (async () => {
      try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); okMsg(); return; } } catch { /* fallthrough */ }
      try { const el = document.createElement('textarea'); el.value = value; el.style.position = 'fixed'; el.style.opacity = '0'; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); okMsg(); }
      catch { setMsg(T.en ? 'Copy failed' : 'کپی نشد'); setMsgType('err'); }
    })();
  }, [setMsg, setMsgType, T]);
  const openDetails = (head: any, kind: 'consult' | 'course') => { setModalTab(kind === 'consult' ? 'parent' : 'course'); setModalSub(head); };
  const closeModal = () => { setModalSub(null); setModalTab(undefined); };

  const dataUserByPhone: any = {};
  const dataUserOrder: string[] = [];
  {
    const seen: any = {};
    for (const x of subs) {
      if ((x as any).type !== 'user') continue;
      const k = digits(String((x as any).fullPhone || ''));
      if (!k) continue;
      const prev = seen[k];
      if (!prev || String(prev.date || '') + String(prev.time || '') < String(x.date || '') + String(x.time || '')) seen[k] = x;
    }
    for (const k of Object.keys(seen)) { dataUserByPhone[k] = seen[k]; dataUserOrder.push(k); }
  }
  const dataName = (k: string, head: any) => {
    const cands = [head?.pName, head?.fullName, head?.childName, head?.userName, dataUserByPhone[k]?.fullName];
    return cands.map((v: any) => String(v || '').trim()).filter((v: string) => v && v !== 'والدین')[0] || 'بدون نام';
  };
  const dataCode = (k: string, head: any) => String(dataUserByPhone[k]?.code || head?.userCode || head?.trackingCode || '');
  const nvIds = (items: any[]) => items.map((x: any) => x.id);
  const nvAllSel = (ids: any[]) => ids.length > 0 && ids.every((id: any) => selectedIds.has(id));
  const nvToggleIds = (ids: any[]) => setSelectedIds((prev: any) => { const n = new Set(prev); const all = ids.length > 0 && ids.every((id: any) => n.has(id)); ids.forEach((id: any) => { if (all) n.delete(id); else n.add(id); }); return n; });
  const dataGroups = () => {
    const byPhone: any = {};
    for (const x of filteredAll) {
      if ((x as any).type !== 'consultation' && (x as any).type !== 'course') continue;
      const k = digits(String((x as any).fullPhone || ''));
      if (!k) continue;
      (byPhone[k] = byPhone[k] || []).push(x);
    }
    const out: { key: string; items: any[] }[] = [];
    for (const k of Object.keys(byPhone)) {
      const sorted = [...byPhone[k]].sort((a: any, b: any) => (String(b.date || '') + String(b.time || '') > String(a.date || '') + String(a.time || '') ? 1 : -1));
      out.push({ key: k, items: sorted });
    }
    out.sort((a, b) => (String(b.items[0].date || '') + String(b.items[0].time || '') > String(a.items[0].date || '') + String(a.items[0].time || '') ? 1 : -1));
    return out;
  };
  const dataGroupsCached = dataGroups();
  const consultCards = dataGroupsCached.filter((g) => g.items.some((x: any) => x.type === 'consultation'));
  const courseCards = dataGroupsCached.filter((g) => g.items.some((x: any) => x.type === 'course'));
  const q = nvQ.trim().toLowerCase();
  const nvMatchesHead = (head: any, kind: 'consult' | 'course') => {
    if (nvFs.date && !String(head?.date || '').includes(nvFs.date)) return false;
    if (kind === 'consult' && nvFs.stat !== 'همه' && String(head?.consultationStatus || 'مشاوره اولیه') !== nvFs.stat) return false;
    if (kind === 'course') { if (nvFs.stat !== 'همه' && getStatus(head) !== nvFs.stat) return false; if (nvFs.pay !== 'همه' && getPay(head) !== nvFs.pay) return false; }
    return true;
  };
  const filterCards = (arr: typeof consultCards, kind: 'consult' | 'course') => arr.filter((g) => {
    if (!nvMatchesHead(g.items[0], kind)) return false;
    if (!q) return true;
    const head = g.items[0];
    return dataName(g.key, head).toLowerCase().includes(q) || digits(g.key).includes(q.replace(/\D/g, '')) || dataCode(g.key, head).toLowerCase().includes(q);
  });
  const consultList = filterCards(consultCards, 'consult');
  const courseList = filterCards(courseCards, 'course');
  const usersList = dataUserOrder.filter((k) => {
    const u = dataUserByPhone[k] || {};
    if (nvFs.date && !String(u.date || '').includes(nvFs.date)) return false;
    if (nvFs.uStat !== 'همه') { const st = (u.status === 'active' || u.phoneConfirmed) ? 'تأییدشده' : 'در انتظار'; if (st !== nvFs.uStat) return false; }
    if (!q) return true;
    return String(u.fullName || '').toLowerCase().includes(q) || digits(k).includes(q.replace(/\D/g, '')) || String(u.code || '').toLowerCase().includes(q);
  });
  useEffect(() => {
    if (typeof setNvCounts !== 'function') return;
    const next = [{ shown: consultList.length, total: consultCards.length }, { shown: courseList.length, total: courseCards.length }, { shown: usersList.length, total: dataUserOrder.length }];
    setNvCounts((prev: any) => (prev && prev.length === 3 && prev.every((pv: any, i: number) => pv && pv.shown === next[i].shown && pv.total === next[i].total)) ? prev : next);
  }, [consultList.length, courseList.length, usersList.length, consultCards.length, courseCards.length, dataUserOrder.length, setNvCounts]);
  const nvListIds = () => {
    if (nvTab === 'users') return usersList.map((k: any) => dataUserByPhone[k]?.id).filter(Boolean);
    const src = nvTab === 'consult' ? consultList : courseList; const out: any[] = []; src.forEach((g: any) => g.items.forEach((x: any) => out.push(x.id))); return out;
  };

  const codeChip = (code: string) => (
    <button type="button" onClick={(ev) => { ev.stopPropagation(); nvCopy(String(code || '')); }}
      title={T.en ? 'Click to copy the tracking code' : 'کلیک برای کپی کد پیگیری'}
      style={{ background: 'none', border: 0, padding: 0, color: T.accText, fontFamily: 'monospace', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline dotted 1px', textUnderlineOffset: 2, direction: 'ltr' }}>
      {code || '—'}
    </button>
  );

  const card = (g: { key: string; items: any[] }, kind: 'consult' | 'course') => {
    const head = g.items.find((x: any) => x.type === kind) || g.items[0];
    const otherType = kind === 'consult' ? 'course' : 'consultation';
    const hasOther = g.items.some((x: any) => x.type === otherType);
    const statLbl = kind === 'consult' ? (head.consultationStatus || 'مشاوره اولیه') : getStatus(head);
    const phoneRaw = String(head.fullPhone || head.pPhone || ('+' + g.key));
    const incomplete = String(head.consultationStatus || '') === 'ناقص' || String(head.orderStatus || '') === 'ناقص';
    const consulted = kind === 'consult' && String(head.consultationStatus || '') === 'مشاوره شده';
    const advisorName = String(head.advisor?.name || head.consultedBy || '');
    const hi = head.priority === 'high';
    return (
      <div key={kind + g.key} id={'nvc-' + g.key} style={{ border: `1px solid ${nvPhone === g.key ? T.acc : T.brd}`, borderRadius: 9, background: T.card, boxShadow: nvPhone === g.key ? `0 0 0 3px ${T.acc}33` : 'none', margin: '0 0 4px', padding: '1px 8px 2px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto auto', alignItems: 'center', gap: 7, minHeight: 19 }}>
          <input type="checkbox" checked={nvAllSel(nvIds(g.items))} onChange={() => nvToggleIds(nvIds(g.items))} onClick={(ev) => ev.stopPropagation()} style={{ width: 12, height: 12, accentColor: T.acc, cursor: 'pointer', margin: 0 }} />
          <b style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, lineHeight: 1.3, color: hi ? '#b91c1c' : T.txt, textAlign: 'start' }}>{hi && <span title="اولویت زیاد" style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block', marginInlineEnd: 5, boxShadow: '0 0 6px rgba(220,38,38,.6)', verticalAlign: 'middle' }} />}{dataName(g.key, head)}</b>
          <NvPhoneBtn T={T} raw={phoneRaw} sub={head} onCopy={nvCopy} />
          <select value={statLbl} onClick={(ev) => ev.stopPropagation()} onChange={(e) => { if (kind === 'consult') changeConsultStatus(head.id, e.target.value); else changeStatus(head.id, e.target.value); }}
            style={{ background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 6, padding: '0 4px', height: 18, fontFamily: 'inherit', fontSize: 9.5, fontWeight: 600, outline: 'none', cursor: 'pointer', maxWidth: 106 }}>
            {(kind === 'consult' ? consultStatuses : statusOptions).map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, borderTop: `1px dashed ${T.brd}`, paddingTop: 1, minHeight: 15, fontSize: 9.5, flexWrap: 'wrap' }}>
          {codeChip(dataCode(g.key, head))}
          <span style={{ color: T.mut }}>{fmtWhen(head)}</span>
          <button type="button" className="zkad-toolbtn" style={{ fontSize: 9, padding: '0 6px', height: 15, lineHeight: '14px', cursor: 'pointer' }} onClick={() => openDetails(head, kind)}>{T.en ? 'Details' : 'جزئیات'}</button>
          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', marginInlineStart: 'auto', alignItems: 'center' }}>
            {incomplete && <span className="zkad-tag t-warn" style={{ fontSize: 8.5, padding: '0 5px', lineHeight: 1.4 }}>ناقص</span>}
            {consulted && <span className="zkad-tag t-ok" style={{ fontSize: 8.5, padding: '0 5px', lineHeight: 1.4 }}>{advisorName ? `مشاوره شده توسط ${advisorName}` : 'مشاوره شده'}</span>}
            {hasOther && (
              <button type="button" className="zkad-tag t-info" style={{ fontSize: 8.5, cursor: 'pointer', border: 0, background: `${T.acc}14`, color: T.accText, padding: '0 5px', borderRadius: 999, lineHeight: 1.4 }}
                title={T.en ? 'Open this person in the other tab' : 'بازکردن همین کاربر در تب دیگر'}
                onClick={() => { setNvTab(otherType === 'course' ? 'course' : 'consult'); setNvPhone(g.key); setTimeout(() => { const el = document.getElementById('nvc-' + g.key); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); }}>
                {kind === 'consult' ? (T.en ? 'Course ✓' : 'ثبت دوره هم کرده') : (T.en ? 'Consult ✓' : 'مشاوره هم داده')}
              </button>
            )}
          </span>
        </div>
      </div>
    );
  };

  const usersCard = (k: string) => {
    const u = dataUserByPhone[k] || {};
    const grp = dataGroupsCached.find((g) => g.key === k);
    const hasConsult = !!grp?.items.some((x: any) => x.type === 'consultation');
    const hasCourse = !!grp?.items.some((x: any) => x.type === 'course');
    const verified = u.status === 'active' || u.phoneConfirmed;
    const uName = String(u.fullName || '').trim() === 'والدین' ? 'بی‌نام' : String(u.fullName || '—');
    return (
      <div key={'u' + k} style={{ border: `1px solid ${T.brd}`, borderRadius: 9, background: T.card, boxShadow: 'none', marginBottom: 4, padding: '1px 8px 2px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto auto', alignItems: 'center', gap: 7, minHeight: 19 }}>
          <input type="checkbox" checked={nvAllSel([u.id])} onChange={() => nvToggleIds([u.id])} style={{ width: 12, height: 12, accentColor: T.acc, cursor: 'pointer', margin: 0 }} aria-label={T.en ? 'Select user' : 'انتخاب کاربر'} />
          <b style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, lineHeight: 1.3, color: T.txt, textAlign: 'start' }}>{uName}</b>
          <span><NvPhoneBtn T={T} raw={String(u.fullPhone || ('+' + k))} sub={u} onCopy={nvCopy} /></span>
          {codeChip(String(u.code || ''))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, borderTop: `1px dashed ${T.brd}`, paddingTop: 1, minHeight: 15, fontSize: 9, flexWrap: 'wrap' }}>
          <span className={`zkad-tag ${verified ? 't-ok' : 't-warn'}`} style={{ fontSize: 8.5, padding: '0 5px', lineHeight: 1.4 }}>{verified ? (T.en ? 'Verified' : 'تأییدشده') : (T.en ? 'Pending' : 'در انتظار')}</span>
          {hasConsult && <span className="zkad-tag t-warn" style={{ fontSize: 8.5, padding: '0 5px', lineHeight: 1.4 }}>فرم مشاوره</span>}
          {hasCourse && <span className="zkad-tag t-info" style={{ fontSize: 8.5, padding: '0 5px', lineHeight: 1.4 }}>ثبت دوره</span>}
          <span style={{ color: T.mut, marginInlineStart: 'auto' }}>{String(u.date || '')}{u.time ? ' · ' + String(u.time) : ''}</span>
        </div>
      </div>
    );
  };

  const section = (title: string, note: string, list: typeof consultList, kind: 'consult' | 'course') => (
    <section className="zkad-panel-card" style={{ marginBottom: 10, padding: '8px 10px' }}>
      <h3 style={{ fontSize: 12.5, color: T.ttl, margin: '0 0 2px', fontWeight: 800 }}>{title} <small style={{ color: T.mut, fontWeight: 600 }}>({faNum(list.length)})</small></h3>
      <div style={{ fontSize: 10.5, color: T.mut, marginBottom: 3, lineHeight: 1.5 }}>{note}</div>
      {list.length ? list.map((g) => card(g, kind)) : <div className="zkad-empty" style={{ padding: '20px 12px' }}><p>{T.en ? 'Nothing here yet.' : 'موردی نیست.'}</p></div>}
    </section>
  );
  const usersSection = () => (
    <section className="zkad-panel-card" style={{ marginBottom: 10, padding: '8px 10px' }}>
      <h3 style={{ fontSize: 12.5, color: T.ttl, margin: '0 0 2px', fontWeight: 800 }}>{T.en ? 'Panel registrations' : 'ثبت‌نام‌های پنل'} <small style={{ color: T.mut, fontWeight: 600 }}>({faNum(usersList.length)})</small></h3>
      <div style={{ fontSize: 10.5, color: T.mut, marginBottom: 3, lineHeight: 1.5 }}>{T.en ? 'Every account created on the portal (phone + tracking code).' : 'هر حسابی که در پنل کاربر ساخته شده (شماره تماس + کد پیگیری).'}</div>
      {usersList.length ? usersList.map((k) => usersCard(k)) : <div className="zkad-empty" style={{ padding: '20px 12px' }}><p>{T.en ? 'Nothing here yet.' : 'موردی نیست.'}</p></div>}
    </section>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 9 }}>
        <div className="zkad-seg" style={{ display: 'flex', gap: 6, padding: 4, background: T.inp, borderRadius: 12, border: `1px solid ${T.brd}` }}>
          {(['consult', 'course', 'users'] as const).map((t) => (
            <button key={t} type="button" onClick={async () => setNvTab(t)}
              style={{ padding: '6px 11px', borderRadius: 8, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', gap: 4, background: nvTab === t ? T.acc : 'transparent', color: nvTab === t ? '#fff' : T.mut }}>
              {t === 'consult' ? (T.en ? 'Consultations' : 'درخواست مشاوره') : t === 'course' ? (T.en ? 'Courses' : 'ثبت دوره') : (T.en ? 'Signups' : 'ثبت‌نام پنل')}<small style={{ opacity: .85, marginInlineStart: 5, fontSize: 10.5 }}>({faNum(t === 'consult' ? consultList.length : t === 'course' ? courseList.length : usersList.length)})</small>
            </button>
          ))}
        </div>
        <input style={{ background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 8, padding: '6px 10px', fontFamily: 'inherit', fontSize: 11.5, width: '100%', maxWidth: 320, outline: 'none' }}
          placeholder={T.en ? 'Search name / phone / code…' : 'جستجوی نام / شماره / کد…'} value={nvQ} onChange={(e) => setNvQ(e.target.value)} />
        <span className="zkad-tag" style={{ fontSize: 11 }}>{T.en ? 'Users' : 'کاربران'}: {faNum(nvTab === 'users' ? usersList.length : (nvTab === 'consult' ? consultList.length : courseList.length))}</span>
        <button type="button" className="zkad-toolbtn" onClick={() => toggleSelectAll(nvListIds())} title={T.en ? 'Select all cards in this list' : 'انتخاب همه کارت‌های همین فهرست'}><ZkCheckIcon size={13}/> {T.en ? 'Select all' : 'انتخاب همه'} ({faNum(nvListIds().length)})</button>
        {selectedIds.size > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.accText, fontWeight: 800 }}>{faNum(selectedIds.size)} {T.en ? 'selected' : 'انتخاب‌شده'}
          {/* فقط وکتور سطل — بدون متن/عنوان */}
          <button type="button" className="zkad-toolbtn zkad-selected-delete" aria-label={T.en ? 'Delete selected' : 'حذف انتخاب‌شده‌ها'} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px' }}
            onClick={async () => { if (!(await zkConfirm(T.en ? `Move ${selectedIds.size} selected items to the trash?` : `حذف ${faNum(selectedIds.size)} مورد انتخاب‌شده؟ (به سطل بازیافت منتقل می‌شوند)`))) return; setSubs((prev: any) => prev.filter((x: any) => !selectedIds.has(x.id))); clearSelection(); setMsg(T.en ? 'Moved to trash' : 'به سطل بازیافت منتقل شد'); setMsgType('ok'); }}>
            <ZkTrashIcon size={15}/>
          </button>
        </span>}
      </div>
      <details className="zkad-nvfilters" style={{ margin: '2px 0 12px' }}>
        <summary style={{ cursor: 'pointer', fontSize: 11.5, fontWeight: 800, color: T.mut, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `1px solid ${T.brd}`, borderRadius: 10, background: T.inp, userSelect: 'none' }}><ZkFilterIcon size={13}/> {T.en ? 'Filters' : 'فیلترها'}{((nvTab === 'consult' && nvFs.stat !== 'همه') || (nvTab === 'course' && (nvFs.stat !== 'همه' || nvFs.pay !== 'همه')) || (nvTab === 'users' && nvFs.uStat !== 'همه')) || nvFs.date ? <span className="zkad-tag t-warn" style={{ fontSize: 9.5 }}>{T.en ? 'ON' : 'فعال'}</span> : null}</summary>
        <div style={{ padding: '12px 4px 2px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          {nvTab === 'consult' && <ChipGroup label="وضعیت مشاوره" options={consultStatuses} val={nvFs.stat} set={v => setNvFs(f => ({ ...f, stat: v }))} />}
          {nvTab === 'course' && <><ChipGroup label="وضعیت سفارش" options={statusOptions} val={nvFs.stat} set={v => setNvFs(f => ({ ...f, stat: v }))} /><ChipGroup label="پرداخت" options={payOptions} val={nvFs.pay} set={v => setNvFs(f => ({ ...f, pay: v }))} /></>}
          {nvTab === 'users' && <ChipGroup label="وضعیت حساب" options={['همه', 'تأییدشده', 'در انتظار']} val={nvFs.uStat} set={v => setNvFs(f => ({ ...f, uStat: v }))} />}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 800, color: T.mut }}>{T.en ? 'Date contains' : 'شامل تاریخ'}<input dir="ltr" placeholder="1405-06-10" value={nvFs.date} onChange={(e) => setNvFs(f => ({ ...f, date: e.target.value }))} style={{ background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 9, padding: '8px 10px', fontFamily: 'inherit', fontSize: 12, width: 150, outline: 'none' }} /></label>
          <button type="button" className="zkad-toolbtn" onClick={() => setNvFs({ stat: 'همه', pay: 'همه', date: '', uStat: 'همه' })}><ZkResetIcon size={13}/> {T.en ? 'Reset' : 'بازنشانی فیلترها'}</button>
        </div>
      </details>
      {nvTab === 'users' ? usersSection() : nvTab === 'consult'
        ? section(T.en ? 'Consultation requests' : 'درخواست‌های مشاوره', T.en ? 'One card per user. Each card shows when the same person also registered a course.' : 'هر کارت = یک کاربر؛ اگر همین شخص دوره هم ثبت کرده باشد، روی کارت مشخص است.', consultList, 'consult')
        : section(T.en ? 'Course registrations' : 'ثبت‌نام دوره‌ها', T.en ? 'One card per user. Each card shows when the same person also sent a consultation.' : 'هر کارت = یک کاربر؛ اگر همین شخص مشاوره هم داده باشد، روی کارت مشخص است.', courseList, 'course')}
      {modalSub && <Modal T={T} onClose={closeModal} max={640}><SubCard sub={modalSub} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} allSubs={subs} onOpenRelated={setModalSub} forceOpen selectedIds={selectedIds} toggleSelect={app.toggleSelect} defaultTab={modalTab} {...subCardIO} /></Modal>}
    </div>
  );
}
