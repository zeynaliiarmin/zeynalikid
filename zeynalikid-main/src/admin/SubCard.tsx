// ============================================================================
// SubCard — کارت فرم/سفارش پنل مدیریت (بازنویسی کامل)
//
// چرا این فایل ساخته شد:
// نسخه قبلی SubCard/LazySubCard/PhoneAction به‌صورت function declaration داخل
// بدنه AdminPanel تعریف شده بودند. در هر رندر AdminPanel یک component type
// «جدید» ساخته می‌شد و React کل زیردرخت را unmount/remount می‌کرد. نتیجه:
// - بسته‌شدن کیبورد موبایل هنگام لمس فیلد بعدی
// - پرش اسکرول
// - ریست تب داخلی به «اطلاعات فرزند»
// - بسته‌شدن فرم باز
// راه‌حل واقعی: انتقال به ماژول مستقل + React.memo + propهای پایدار.
// همه رنگ‌ها از توکن‌های --zkad-* گرفته می‌شوند (بدون رنگ hardcoded).
// ============================================================================

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminPopover from './AdminPopover';
import {
  digits, p2e, fmtWhen, statusTone, subTime, needsReminder, logChange, normRange, growthStatus,
} from './adminUtils';
import { generateFormImage } from '../utils/exportFormToImage';
import { productVectorIcon, BoxIcon } from '../components/Icons';
import {
  ZkChevronUpIcon, ZkChevronDownIcon, ZkCheckIcon, ZkCloseIcon, ZkCameraIcon, ZkDocIcon,
  ZkMoneyIcon, ZkCalendarIcon, ZkPillIcon, ZkStethoscopeIcon, ZkCardIcon, ZkCopyIcon,
  ZkTrashIcon, ZkCoursesIcon, ZkBellIcon, ZkTruckIcon, ZkDownloadIcon, ZkPhoneIcon,
} from './adminIcons';

export type SubTabId = 'parent' | 'course' | 'manage' | 'corrective';

export type SubCardProps = {
  sub: any;
  statusOptions?: string[];
  getStatus?: (x: any) => string;
  onStatusChange?: (id: any, status: string) => void;
  groupCount?: number;
  isChild?: boolean;
  allSubs?: any[];
  onOpenRelated?: (r: any) => void;
  forceOpen?: boolean;
  selectedIds?: Set<any>;
  toggleSelect?: (id: any) => void;
  /** آیا کارت باز است (کنترل‌شده از AdminPanel) */
  isOpen?: boolean;
  /** تغییر کارت باز */
  onToggleOpen?: (id: any) => void;
  /** به‌روزرسانی لیست فرم‌ها */
  setSubs: (updater: any) => void;
  /** تنظیمات سایت (برای لیست محصولات) */
  cfg: any;
  /** آپلود/حذف فایل‌ها — از App تزریق می‌شود */
  uploadPdfFile: (f: File, folder: string) => Promise<string>;
  deleteStoredFile: (url: string) => Promise<any>;
  deleteStoredImage: (url: string) => Promise<any>;
  deleteStoredTonguePhoto?: (url: string) => Promise<any>;
  /** ذخیره بلادرنگ در Supabase */
  isSupabaseConfigured: boolean;
  updateSubmission: (id: any, data: any) => Promise<any>;
};

const CORRECTIVE_LABELS: Record<string, string> = {
  height: 'قد (سانتیمتر)', weight: 'وزن (کیلوگرم)', appetite: 'اشتها', sleep: 'خواب',
  activity: 'فعالیت', exercise: 'ورزش', puberty: 'بلوغ', waterIntake: 'مصرف آب',
  snacks: 'تنقلات', parentsHeight: 'قد والدین', allergies: 'حساسیت‌ها', diseases: 'بیماری‌ها',
  medications: 'داروها', temperament: 'طبع', childName: 'نام فرزند', age: 'سن',
  additionalNotes: 'توضیحات اضافی',
};

const TABS: [SubTabId, string, string][] = [
  ['parent', '۱. اطلاعات فرزند', 'اطلاعات فرزند'],
  ['course', '۲. دوره، ارسال و پرداخت', 'دوره و پرداخت'],
  ['manage', '۳. مدیریت و پیگیری', 'مدیریت'],
  ['corrective', '۴. اصلاحی', 'اصلاحی'],
];

// نمایش جنسیت — مقادیر جدید male/female و رکوردهای قدیمی «پسر»/«دختر» هر دو پشتیبانی می‌شوند
const genderLabel = (g: any): string => {
  const v = String(g ?? '').trim();
  if (v === 'male' || v === 'پسر' || v === 'boy') return 'پسر';
  if (v === 'female' || v === 'دختر' || v === 'girl') return 'دختر';
  return '—';
};

const CONSULT_STATUSES = ['مشاوره اولیه', 'مشاوره شده', 'اصلاحی', 'ثبتی', 'پیگیری', 'پیگیری آخر ماه'];

const copyText = async (value: string) => {
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
    throw new Error('no clipboard');
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = value; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
      return true;
    } catch { return false; }
  }
};

// ---------------------------------------------------------------------------
// PhoneAction — شماره تماس + Popover عملیات (تماس، واتساپ، روبیکا، کپی)
// ---------------------------------------------------------------------------
export const PhoneAction = memo(function PhoneAction({ sub, phone, whatsappOnly = false, label }: {
  sub?: any; phone: any; whatsappOnly?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const raw = String(phone || '');
  const close = useCallback(() => setOpen(false), []);

  if (!raw) return <span className="zkad-mut">—</span>;

  const cc = sub?.cc || sub?.shipping?.phoneCc || '';
  const isIran = cc === '+98' || raw.startsWith('+98') || raw.startsWith('0098') || raw.startsWith('09');
  const waDigits = digits(raw.startsWith('+') || raw.startsWith('00') ? raw : `${cc}${raw}`);

  if (whatsappOnly) {
    return (
      <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="zkad-phone-link t-ok">
        {label || raw}
      </a>
    );
  }

  return (
    <AdminPopover
      open={open}
      onClose={close}
      width={244}
      ariaLabel="عملیات شماره تماس"
      trigger={
        <button
          type="button"
          className="zkad-phone-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        >
          <ZkPhoneIcon size={12} />
          <span className="zkad-phone-num">{label || raw}</span>
        </button>
      }
    >
      <div className="zkad-pop-head" dir="ltr">{raw}</div>
      <a href={`tel:${raw}`} className="zkad-pop-item" role="menuitem" onClick={close}>
        <ZkPhoneIcon size={14} /> تماس تلفنی
      </a>
      <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="zkad-pop-item t-ok" role="menuitem" onClick={close}>
        <span className="zkad-pop-dot t-ok" /> واتساپ
      </a>
      {isIran && (
        <a href={`https://rubika.ir/${waDigits}`} target="_blank" rel="noreferrer" className="zkad-pop-item t-warn" role="menuitem" onClick={close}>
          <span className="zkad-pop-dot t-warn" /> روبیکا
        </a>
      )}
      <button
        type="button"
        className="zkad-pop-item"
        role="menuitem"
        onClick={async () => {
          const ok = await copyText(raw);
          if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1400); }
          close();
        }}
      >
        <ZkCopyIcon size={14} /> {copied ? 'کپی شد' : 'کپی شماره'}
      </button>
    </AdminPopover>
  );
});

// ---------------------------------------------------------------------------
// GrowthBox — تحلیل رشد WHO
// ---------------------------------------------------------------------------
export const GrowthBox = memo(function GrowthBox({ sub }: { sub: any }) {
  const nr = normRange(sub?.age, sub?.gender);
  const h = +p2e(sub?.height), w = +p2e(sub?.weight);
  if (!nr || (!h && !w)) return <div className="zkad-empty-note">اطلاعاتی برای تحلیل رشد وجود ندارد</div>;

  const row = (kind: 'h' | 'w') => {
    const isH = kind === 'h';
    const val = isH ? h : w;
    if (!val) return null;
    const min = isH ? nr.hMin : nr.wMin, med = isH ? nr.hMed : nr.wMed, max = isH ? nr.hMax : nr.wMax;
    const unit = isH ? 'cm' : 'kg';
    const st = growthStatus(val, min, med, max);
    const diff = Math.round((val - med) * 10) / 10;
    return (
      <div className="zkad-growth-item" key={kind}>
        <b>{isH ? 'قد' : 'وزن'}: {val} {unit}</b>
        <div className={`zkad-growth-status t-${st.tone}`}>وضعیت: {st.label}</div>
        <div className="zkad-mut">میانه WHO: {med} {unit} · بازه نرمال: {min} تا {max} {unit}</div>
        <div className={diff >= 0 ? 't-ok' : 't-err'}>اختلاف با میانه: {diff > 0 ? `+${diff}` : diff} {unit}</div>
      </div>
    );
  };

  return (
    <div className="zkad-growth">
      <b className="zkad-growth-title">تحلیل رشد بر اساس WHO</b>
      <div className="zkad-growth-grid">{row('h')}{row('w')}</div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// SubCard
// ---------------------------------------------------------------------------
function SubCardBase({
  sub, statusOptions = [], getStatus = (x: any) => x.orderStatus || 'جدید', onStatusChange,
  groupCount = 0, isChild = false, allSubs = [], onOpenRelated, forceOpen = false,
  selectedIds, toggleSelect, isOpen = false, onToggleOpen,
  setSubs, cfg, uploadPdfFile, deleteStoredFile, deleteStoredImage, deleteStoredTonguePhoto,
  isSupabaseConfigured, updateSubmission,
}: SubCardProps) {
  const open = forceOpen || isOpen;

  // تب داخلی: با state پایدار نگه داشته می‌شود؛ چون کامپوننت دیگر remount نمی‌شود
  // نیازی به بازیابی از sessionStorage در هر رندر نیست، اما برای بازگشت بین صفحات حفظ می‌شود.
  const [subTab, setSubTabRaw] = useState<SubTabId>(() => {
    try {
      const v = sessionStorage.getItem(`zk_admin_form_tab_${sub.id}`) as SubTabId | null;
      return v && TABS.some(t => t[0] === v) ? v : 'parent';
    } catch { return 'parent'; }
  });
  const setSubTab = useCallback((tab: SubTabId) => {
    setSubTabRaw(tab);
    try { sessionStorage.setItem(`zk_admin_form_tab_${sub.id}`, tab); } catch { /* noop */ }
  }, [sub.id]);

  const [trackCopied, setTrackCopied] = useState(false);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const [selectedConsultIdx, setSelectedConsultIdx] = useState(0);

  const copyTracking = useCallback(async () => {
    const ok = await copyText(String(sub.trackingCode || ''));
    if (ok) { setTrackCopied(true); setTimeout(() => setTrackCopied(false), 1800); }
  }, [sub.trackingCode]);

  const mark = useCallback(() => {
    onToggleOpen?.(sub.id);
    if (sub.unread) setSubs((s: any[]) => s.map(x => x.id === sub.id ? { ...x, unread: false, isNew: false } : x));
  }, [onToggleOpen, sub.id, sub.unread, setSubs]);

  // پیگیری‌ها: ۳ تیک سبز → «آخر ماه»، هر miss → «پیگیری»
  const fu = useCallback((i: number) => {
    const slots = [...(sub.followUps || [null, null, null, null, null])];
    slots[i] = slots[i] === null || slots[i] === undefined ? 'done' : slots[i] === 'done' ? 'miss' : null;
    let cat = sub.category;
    let cs = sub.consultationStatus;
    const doneCount = slots.filter(x => x === 'done').length;
    const hasMiss = slots.some(x => x === 'miss');
    if (hasMiss) { cat = 'پیگیری'; cs = 'پیگیری'; }
    else if (doneCount >= 3) { cat = 'آخر ماه'; cs = 'پیگیری آخر ماه'; }
    else if (cat === 'آخر ماه' || cs === 'پیگیری آخر ماه') { cat = 'پیگیری'; cs = 'پیگیری'; }
    setSubs((s: any[]) => s.map(x => x.id === sub.id
      ? { ...x, followUps: slots, category: cat, consultationStatus: cs, changeHistory: logChange(x, `ثبت پیگیری مرحله ${i + 1}`) }
      : x));
  }, [sub.followUps, sub.category, sub.consultationStatus, sub.id, setSubs]);

  // یکپارچه‌سازی خودکار بر اساس شماره تماس
  const myPhone = digits(sub.fullPhone || '');

  const allSamePhone = useMemo(() => {
    if (!myPhone) return [sub];
    return allSubs.filter((x: any) => digits(x.fullPhone || '') === myPhone).sort((a: any, b: any) => subTime(b) - subTime(a));
  }, [allSubs, myPhone, sub]);

  const courseRecords = useMemo(() => {
    const list = allSamePhone.filter((x: any) => x.type === 'course' || x.course || x.shipping || x.payment);
    return list.length ? list : [sub];
  }, [allSamePhone, sub]);

  const consultRecords = useMemo(() => {
    const list = allSamePhone.filter((x: any) => x.type === 'consultation' || (x.topics && x.topics.length > 0));
    return list.length ? list : [sub];
  }, [allSamePhone, sub]);

  const activeCourseRecord = courseRecords[selectedCourseIdx] || courseRecords[0] || sub;
  const activeConsultRecord = consultRecords[selectedConsultIdx] || consultRecords[0] || sub;

  const relatedSubs = useMemo(() => {
    if (!myPhone) return [];
    return allSubs.filter((x: any) => x.id !== sub.id && digits(x.fullPhone || '') === myPhone).sort((a: any, b: any) => subTime(b) - subTime(a));
  }, [allSubs, sub.id, myPhone]);

  const hasConsultation = allSamePhone.some((x: any) => x.type === 'consultation' || (x.topics && x.topics.length > 0));
  const hasCourseRegistration = allSamePhone.some((x: any) => x.type === 'course' || x.course || x.shipping || x.payment);

  // مغایرت اطلاعات فرزند بین فرم مشاوره و ثبت دوره
  const childDiffs = useMemo(() => {
    const diffs: any[] = [];
    const c1 = consultRecords[0], c2 = courseRecords[0];
    if (!c1 || !c2 || c1.id === c2.id) return diffs;
    if (c1.age && c2.age && String(c1.age).trim() !== String(c2.age).trim()) diffs.push({ label: 'سن فرزند', oldVal: `${c1.age} سال (مشاوره)`, newVal: `${c2.age} سال (دوره)` });
    if (c1.gender && c2.gender && c1.gender !== c2.gender) diffs.push({ label: 'جنسیت', oldVal: genderLabel(c1.gender), newVal: genderLabel(c2.gender) });
    if (c1.height && c2.height && String(c1.height).trim() !== String(c2.height).trim()) diffs.push({ label: 'قد', oldVal: `${c1.height} cm`, newVal: `${c2.height} cm` });
    if (c1.weight && c2.weight && String(c1.weight).trim() !== String(c2.weight).trim()) diffs.push({ label: 'وزن', oldVal: `${c1.weight} kg`, newVal: `${c2.weight} kg` });
    if (c1.appetite && c2.appetite && c1.appetite !== c2.appetite) diffs.push({ label: 'وضعیت اشتها', oldVal: c1.appetite, newVal: c2.appetite });
    if (c1.disease && c2.disease && String(c1.disease).trim() !== String(c2.disease).trim()) diffs.push({ label: 'بیماری خاص', oldVal: c1.disease, newVal: c2.disease });
    return diffs;
  }, [consultRecords, courseRecords]);

  // به‌روزرسانی فیلد با مسیر نقطه‌ای دو سطحی + ذخیره بلادرنگ
  const updateField = useCallback((targetRecordId: any, fieldPath: string, val: any, logText?: string) => {
    setSubs((list: any[]) => list.map(x => {
      if (x.id !== targetRecordId && x.id !== sub.id) return x;
      const updated: any = { ...x };
      if (fieldPath.includes('.')) {
        const parts = fieldPath.split('.');
        if (parts.length === 2) updated[parts[0]] = { ...(updated[parts[0]] || {}), [parts[1]]: val };
      } else {
        updated[fieldPath] = val;
      }
      if (logText) updated.changeHistory = logChange(x, logText);
      if (isSupabaseConfigured) {
        updateSubmission(x.id, updated).catch((err: any) => console.warn('Update submission in Supabase failed', err));
      }
      return updated;
    }));
  }, [setSubs, sub.id, isSupabaseConfigured, updateSubmission]);

  // ویرایش فیلد ساده روی خود فرم (بدون Supabase مستقیم — setSubs خودش sync می‌کند)
  const patchSelf = useCallback((patch: any, logText?: string) => {
    setSubs((list: any[]) => list.map(x => x.id === sub.id
      ? { ...x, ...patch, ...(logText ? { changeHistory: logChange(x, logText) } : {}) }
      : x));
  }, [setSubs, sub.id]);

  const status = getStatus(sub);
  const selected = !!selectedIds?.has(sub.id);

  const downloadDossier = useCallback(async () => {
    try {
      const fmt = (localStorage.getItem('zkid_form_image_format') === 'jpg' ? 'jpg' : 'webp') as 'webp' | 'jpg';
      const blob = await generateFormImage(sub, fmt);
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `پرونده_${String(sub.pName || sub.fullPhone || sub.id).replace(/\s+/g, '_')}.${fmt}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 800);
    } catch { alert('خطا در ساخت تصویر پرونده'); }
  }, [sub]);

  return (
    <article className={`zkad-sub ${sub.unread || sub.isNew ? 'is-unread' : ''} ${sub.priority === 'high' ? 'is-priority' : ''} ${open ? 'is-open' : ''}`}>
      {/* ================= HEADER ================= */}
      {/* Header کاملاً از Content جدا است: فقط دکمهٔ عنوان باز/بسته می‌کند،
          عملیات سریع (چک‌باکس، کد رهگیری، حذف) کلیک را stopPropagation می‌کنند. */}
      <header className="zkad-sub-head">
        <label className="zkad-sub-check" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelect?.(sub.id)}
            aria-label="انتخاب فرم"
          />
        </label>

        <button type="button" className="zkad-sub-title" onClick={mark} aria-expanded={open}>
          <span className="zkad-sub-name">
            {needsReminder(sub) && <span className="zkad-remind" title="بیش از ۳ روز بدون پیگیری"><ZkBellIcon size={14} /></span>}
            <b>{sub.pName || sub.shipping?.receiver || '—'}</b>
          </span>
          <span className="zkad-sub-meta">
            <span className={`zkad-tag t-${statusTone(status)}`}>{status}</span>
            <span className="zkad-sub-time">{fmtWhen(sub)}</span>
          </span>
        </button>

        <div className="zkad-sub-quick" onClick={e => e.stopPropagation()}>
          <PhoneAction sub={sub} phone={sub.fullPhone || sub.shipping?.phone || sub.pPhone || ''} />
          {sub.trackingCode && (
            <button
              type="button"
              className={`zkad-track ${trackCopied ? 'is-copied' : ''}`}
              onClick={copyTracking}
              title="کپی کد رهگیری"
            >
              <span className="zkad-mono">{sub.trackingCode}</span>
              {trackCopied ? <ZkCheckIcon size={12} /> : <ZkCopyIcon size={12} />}
            </button>
          )}
          <button
            type="button"
            className="zkad-iconbtn t-err"
            title="حذف فرم"
            onClick={() => { if (confirm('این فرم به سطل بازیافت منتقل شود؟')) setSubs((s: any[]) => s.filter(x => x.id !== sub.id)); }}
          >
            <ZkTrashIcon size={15} />
          </button>
          <button type="button" className="zkad-iconbtn" onClick={mark} aria-label={open ? 'بستن' : 'باز کردن'}>
            {open ? <ZkChevronUpIcon size={15} /> : <ZkChevronDownIcon size={15} />}
          </button>
        </div>

        {(isChild || groupCount > 0 || sub.similarTo || sub.editHistory?.length > 0 || sub.priority === 'high') && (
          <div className="zkad-sub-flags">
            {isChild && <span className="zkad-tag t-warn">فرم تکراری</span>}
            {groupCount > 0 && <span className="zkad-tag t-info">{groupCount} فرم دیگر با این شماره</span>}
            {sub.similarTo && <span className="zkad-tag t-mut">مشابه</span>}
            {sub.editHistory?.length > 0 && <span className="zkad-tag t-mut">ادیت شده</span>}
            {sub.priority === 'high' && <span className="zkad-tag t-err">اولویت زیاد</span>}
          </div>
        )}
      </header>

      {/* ================= CONTENT ================= */}
      {open && (
        <div className="zkad-sub-body">
          <div className="zkad-subtabs" role="tablist">
            {TABS.map(([id, label, short]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={subTab === id}
                className={`zkad-subtab ${subTab === id ? 'is-active' : ''}`}
                onClick={e => { e.stopPropagation(); setSubTab(id); }}
              >
                <span className="zkad-subtab-full">{label}</span>
                <span className="zkad-subtab-short">{short}</span>
              </button>
            ))}
          </div>

          {/* ---------- تب ۱: اطلاعات فرزند ---------- */}
          {subTab === 'parent' && (
            <div className="zkad-pane">
              <div className="zkad-origin">
                <div className="zkad-origin-tags">
                  <span className="zkad-mut">مبدأ ثبت اطلاعات:</span>
                  {hasConsultation && <span className="zkad-tag t-info"><ZkDocIcon size={12} /> درخواست مشاوره</span>}
                  {hasCourseRegistration && <span className="zkad-tag t-acc"><ZkCoursesIcon size={12} /> ثبت دوره</span>}
                  {!hasConsultation && !hasCourseRegistration && (
                    <span className="zkad-tag t-mut">{sub.type === 'course' ? 'ثبت دوره' : 'درخواست مشاوره'}</span>
                  )}
                </div>
                <div className="zkad-origin-side">
                  {sub.date && <span className="zkad-mut">تاریخ ثبت: {sub.date} {sub.time || ''}</span>}
                  <button type="button" className="zkad-btn sm" onClick={downloadDossier} title="دانلود تصویر پرونده">
                    <ZkDownloadIcon size={12} /> دانلود پرونده
                  </button>
                </div>
              </div>

              {childDiffs.length > 0 && (
                <div className="zkad-alert t-warn">
                  <div className="zkad-alert-title">تفاوت اطلاعات فرزند بین فرم مشاوره و ثبت دوره شناسایی شد:</div>
                  <div className="zkad-diff-grid">
                    {childDiffs.map((d: any, idx: number) => (
                      <div key={idx} className="zkad-diff">
                        <span className="zkad-mut">{d.label}: </span>
                        <s>{d.oldVal}</s>
                        <span className="zkad-diff-arrow">←</span>
                        <b>{d.newVal}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {consultRecords.length > 1 && (
                <div className="zkad-switcher">
                  <span className="zkad-mut">نسخه اطلاعات فرزند:</span>
                  <div className="zkad-switcher-list">
                    {consultRecords.map((cr: any, idx: number) => (
                      <button
                        key={cr.id || idx}
                        type="button"
                        className={`zkad-chip ${selectedConsultIdx === idx ? 'is-active' : ''}`}
                        onClick={() => setSelectedConsultIdx(idx)}
                      >
                        فرم {idx + 1}{cr.date ? `: ${cr.date}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <dl className="zkad-facts">
                <div><dt>سن</dt><dd>{activeConsultRecord.age || sub.age || '—'}</dd></div>
                <div><dt>جنسیت</dt><dd>{genderLabel(activeConsultRecord.gender || sub.gender)}</dd></div>
                <div><dt>قد</dt><dd>{activeConsultRecord.height || sub.height || '—'}</dd></div>
                <div><dt>وزن</dt><dd>{activeConsultRecord.weight || sub.weight || '—'}</dd></div>
              </dl>

              <GrowthBox sub={activeConsultRecord} />

              <dl className="zkad-facts wide">
                <div>
                  <dt>والد</dt>
                  <dd className="zkad-fact-inline">
                    {activeConsultRecord.pName || sub.pName || '—'}
                    <PhoneAction sub={activeConsultRecord} phone={activeConsultRecord.fullPhone || sub.fullPhone} />
                  </dd>
                </div>
                <div><dt>موضوعات مشاوره</dt><dd>{(activeConsultRecord.topics || sub.topics || []).join('، ') || '—'}</dd></div>
                <div><dt>دسته</dt><dd>{activeConsultRecord.category || sub.category || '—'}</dd></div>
                <div><dt>مشکل گوارشی</dt><dd>{(Array.isArray(activeConsultRecord.digest) ? activeConsultRecord.digest.join('، ') : activeConsultRecord.digest) || (Array.isArray(sub.digest) ? sub.digest.join('، ') : sub.digest) || '—'}</dd></div>
                <div><dt>وضعیت اشتها</dt><dd>{activeConsultRecord.appetite || sub.appetite || '—'}</dd></div>
                <div><dt>بیماری خاص</dt><dd>{activeConsultRecord.disease || sub.disease || '—'}</dd></div>
                <div><dt>شرایط خاص</dt><dd>{(Array.isArray(activeConsultRecord.specials) ? activeConsultRecord.specials.join('، ') : activeConsultRecord.specials) || (Array.isArray(sub.specials) ? sub.specials.join('، ') : sub.specials) || '—'}</dd></div>
              </dl>

              {(activeConsultRecord.notes || sub.notes) && (
                <div className="zkad-note">
                  <b>توضیحات تکمیلی والد:</b> {activeConsultRecord.notes || sub.notes}
                </div>
              )}

              {(activeConsultRecord.voice_note_url || sub.voice_note_url) && (
                <div className="zkad-media">
                  <div className="zkad-media-title">یادداشت صوتی ارسالی والد</div>
                  <audio controls src={activeConsultRecord.voice_note_url || sub.voice_note_url} className="zkad-audio" />
                </div>
              )}

              {(activeConsultRecord.tonguePhotos || sub.tonguePhotos || []).length > 0 && (
                <div className="zkad-media">
                  <div className="zkad-media-head">
                    <b><ZkCameraIcon size={14} /> عکس‌های زبان ({(activeConsultRecord.tonguePhotos || sub.tonguePhotos || []).length})</b>
                    <button
                      type="button"
                      className="zkad-btn sm t-err"
                      onClick={async () => {
                        if (!confirm('همه عکس‌های زبان این فرم حذف شوند؟ این عملیات قابل بازگشت نیست.')) return;
                        try {
                          for (const url of (activeConsultRecord.tonguePhotos || sub.tonguePhotos || [])) await deleteStoredTonguePhoto?.(url);
                          setSubs((list: any[]) => list.map(x => {
                            if (x.id === sub.id || x.id === activeConsultRecord.id) {
                              const updated = { ...x, tonguePhotos: [], changeHistory: logChange(x, 'حذف عکس‌های زبان') };
                              if (isSupabaseConfigured) updateSubmission(x.id, updated).catch(() => { });
                              return updated;
                            }
                            return x;
                          }));
                        } catch { alert('حذف عکس‌های زبان انجام نشد.'); }
                      }}
                    >
                      حذف عکس‌های زبان
                    </button>
                  </div>
                  <div className="zkad-thumbs">
                    {(activeConsultRecord.tonguePhotos || sub.tonguePhotos || []).map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`عکس زبان ${i + 1}`} /></a>
                    ))}
                  </div>
                </div>
              )}

              {relatedSubs.length > 0 && (
                <details className="zkad-details">
                  <summary><ZkDocIcon size={13} /> تمام فرم‌ها و سفارشات ثبت‌شده با این شماره ({relatedSubs.length})</summary>
                  <div className="zkad-related-list">
                    {relatedSubs.map((r: any) => (
                      <button key={r.id} type="button" className="zkad-related" onClick={e => { e.stopPropagation(); onOpenRelated?.(r); }}>
                        <span className="zkad-related-top">
                          <span className="zkad-tag t-mut">{r.type === 'course' ? 'ثبت‌نام دوره' : 'فرم مشاوره'}</span>
                          {r.trackingCode && <span className="zkad-mono">{r.trackingCode}</span>}
                          <span className="zkad-mut">{r.date} {r.time}</span>
                          <span className="zkad-related-cta">مشاهده</span>
                        </span>
                        <span className="zkad-related-sub">
                          سن {r.age || '—'} / {genderLabel(r.gender)} / {r.course?.title ? `دوره: ${r.course.title}` : 'بدون دوره'}
                          {r.editHistory?.length > 0 && ` · ${r.editHistory.length} نسخه ویرایش`}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ---------- تب ۲: دوره، ارسال و پرداخت ---------- */}
          {subTab === 'course' && (
            <div className="zkad-pane">
              {courseRecords.length > 1 && (
                <div className="zkad-switcher">
                  <span className="zkad-mut">انتخاب سفارش دوره:</span>
                  <div className="zkad-switcher-list">
                    {courseRecords.map((cr: any, idx: number) => (
                      <button
                        key={cr.id || idx}
                        type="button"
                        className={`zkad-chip ${selectedCourseIdx === idx ? 'is-active' : ''}`}
                        onClick={() => setSelectedCourseIdx(idx)}
                      >
                        سفارش {idx + 1}: {cr.course?.title || 'دوره'}{cr.date ? ` (${cr.date})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* دوره */}
              <section className="zkad-block">
                <div className="zkad-block-head">
                  <b><ZkCoursesIcon size={15} /> اطلاعات دوره و پکیج</b>
                  <span className="zkad-mut">{activeCourseRecord.course?.title ? 'دوره ثبت‌شده' : 'ثبت دوره توسط ادمین'}</span>
                </div>
                <div className="zkad-grid two">
                  <label className="zkad-f">
                    <span>عنوان دوره</span>
                    <input
                      className="zkad-input"
                      defaultValue={activeCourseRecord.course?.title || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'course.title', e.target.value, `ویرایش عنوان دوره به ${e.target.value}`)}
                      placeholder="مثال: تک دوره رشد قد"
                    />
                  </label>
                  <label className="zkad-f">
                    <span>هزینه دوره (تومان)</span>
                    <input
                      className="zkad-input"
                      inputMode="numeric"
                      defaultValue={activeCourseRecord.course?.price || activeCourseRecord.payment?.amount || ''}
                      onBlur={e => {
                        const val = parseInt(p2e(e.target.value).replace(/\D/g, ''));
                        if (!isNaN(val)) {
                          updateField(activeCourseRecord.id, 'course.price', val);
                          updateField(activeCourseRecord.id, 'payment.amount', val, `ثبت هزینه دوره: ${val.toLocaleString()} تومان`);
                        }
                      }}
                      placeholder="مثلاً 2500000"
                    />
                  </label>
                </div>
                {activeCourseRecord.course?.features?.length > 0 && (
                  <div className="zkad-note sm"><b>ویژگی‌های پکیج:</b> {(activeCourseRecord.course.features || []).join('، ')}</div>
                )}
              </section>

              {/* ارسال */}
              <section className="zkad-block">
                <div className="zkad-block-head">
                  <b><ZkTruckIcon size={15} /> اطلاعات ارسال و مقصد</b>
                  <span className="zkad-mut">مقصد: {activeCourseRecord.shipping?.dest === 'intl' ? 'خارج از کشور' : 'ایران'}</span>
                </div>
                <div className="zkad-grid three">
                  <label className="zkad-f">
                    <span>شهر یا کشور مقصد</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.shipping?.city || activeCourseRecord.shipping?.country || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'shipping.city', e.target.value, `ویرایش شهر/کشور ارسال: ${e.target.value}`)}
                      placeholder="تهران، تبریز..." />
                  </label>
                  <label className="zkad-f">
                    <span>روش ارسال / باربری</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.shipping?.method || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'shipping.method', e.target.value, `ویرایش روش ارسال: ${e.target.value}`)}
                      placeholder="چاپار، ماهکس، تیپاکس..." />
                  </label>
                  <label className="zkad-f">
                    <span>کد پستی</span>
                    <input className="zkad-input" dir="ltr" inputMode="numeric" defaultValue={activeCourseRecord.shipping?.postalCode || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'shipping.postalCode', p2e(e.target.value).trim(), `ویرایش کد پستی: ${e.target.value}`)}
                      placeholder="1234567890" />
                  </label>
                </div>
                <div className="zkad-grid two">
                  <label className="zkad-f">
                    <span>زمان تخمینی تحویل</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.shipping?.estimatedDelivery || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'shipping.estimatedDelivery', e.target.value, `ویرایش زمان تحویل: ${e.target.value}`)}
                      placeholder="حدود ۴۸ ساعت تا ۵ روز کاری" />
                  </label>
                  <label className="zkad-f">
                    <span>نام گیرنده مرسوله</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.shipping?.receiver || activeCourseRecord.pName || activeConsultRecord.pName || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'shipping.receiver', e.target.value, `ویرایش نام گیرنده: ${e.target.value}`)}
                      placeholder="نام گیرنده" />
                  </label>
                </div>
                <label className="zkad-f">
                  <span>آدرس پستی کامل</span>
                  <textarea className="zkad-textarea" defaultValue={activeCourseRecord.shipping?.address || ''}
                    onBlur={e => updateField(activeCourseRecord.id, 'shipping.address', e.target.value, 'ویرایش آدرس پستی')}
                    placeholder="استان، شهر، خیابان، پلاک، واحد..." />
                </label>
                {(activeCourseRecord.shipping?.phone || activeCourseRecord.shipping?.whatsapp) && (
                  <div className="zkad-inline-row">
                    {activeCourseRecord.shipping.phone && (
                      <span>شماره تماس گیرنده: <PhoneAction sub={activeCourseRecord} phone={(activeCourseRecord.shipping.phoneCc || '') + activeCourseRecord.shipping.phone} /></span>
                    )}
                    {activeCourseRecord.shipping.whatsapp && (
                      <span>واتساپ گیرنده: <PhoneAction sub={activeCourseRecord} phone={(activeCourseRecord.shipping.whatsappCc || '') + activeCourseRecord.shipping.whatsapp} whatsappOnly /></span>
                    )}
                  </div>
                )}
              </section>

              {/* پرداخت */}
              <section className="zkad-block t-pay">
                <div className="zkad-block-head">
                  <b><ZkCardIcon size={15} /> اطلاعات پرداخت و فیش واریزی</b>
                  <span className={`zkad-tag ${activeCourseRecord.payment?.receipt ? 't-ok' : activeCourseRecord.payment?.receiptText ? 't-info' : 't-warn'}`}>
                    {activeCourseRecord.payment?.receipt ? 'فیش دارد' : activeCourseRecord.payment?.receiptText ? 'متن پیامک دارد' : 'بدون فیش آنلاین'}
                  </span>
                </div>

                {activeCourseRecord.payment?.receipt && (
                  <div className="zkad-receipt">
                    <a href={activeCourseRecord.payment.receipt} target="_blank" rel="noreferrer" title="مشاهده بزرگ فیش">
                      <img src={activeCourseRecord.payment.receipt} alt="فیش واریزی" />
                    </a>
                    <div className="zkad-receipt-info">
                      <div className="t-ok"><ZkCheckIcon size={12} /> فیش واریزی آپلود شده</div>
                      <a href={activeCourseRecord.payment.receipt} target="_blank" rel="noreferrer" className="zkad-link">مشاهده تصویر کامل فیش ↗</a>
                    </div>
                    <button
                      type="button"
                      className="zkad-btn sm t-err"
                      onClick={async () => {
                        if (!confirm('آیا از حذف کامل این فیش واریزی مطمئن هستید؟')) return;
                        try {
                          await deleteStoredImage(activeCourseRecord.payment.receipt);
                          updateField(activeCourseRecord.id, 'payment', { ...(activeCourseRecord.payment || {}), receipt: '', receipt_image: '', receiptDeletedAt: new Date().toISOString() }, 'حذف فیش واریزی توسط ادمین');
                        } catch { alert('خطا در حذف فیش.'); }
                      }}
                    >
                      <ZkTrashIcon size={12} /> حذف فیش
                    </button>
                  </div>
                )}

                <label className="zkad-f">
                  <span>متن پیامک یا شرح واریز</span>
                  <textarea className="zkad-textarea" defaultValue={activeCourseRecord.payment?.receiptText || ''}
                    onBlur={e => updateField(activeCourseRecord.id, 'payment.receiptText', e.target.value, 'ویرایش متن پیامک واریزی')}
                    placeholder="متن پیامک بانک، شماره پیگیری، ارجاع..." />
                </label>

                <div className="zkad-grid two">
                  <label className="zkad-f">
                    <span><ZkMoneyIcon size={12} /> مبلغ پرداخت‌شده (تومان)</span>
                    <input className="zkad-input" inputMode="numeric"
                      defaultValue={activeCourseRecord.payment?.amount || activeCourseRecord.course?.price || ''}
                      onBlur={e => { const val = parseInt(p2e(e.target.value).replace(/\D/g, '')); if (!isNaN(val)) updateField(activeCourseRecord.id, 'payment.amount', val, `ویرایش مبلغ پرداختی به ${val.toLocaleString()} تومان`); }}
                      placeholder="مثلاً 2500000" />
                  </label>
                  <label className="zkad-f">
                    <span><ZkCalendarIcon size={12} /> تاریخ پرداخت</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.payment?.paidAt || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'payment.paidAt', p2e(e.target.value).trim(), `ویرایش تاریخ پرداخت به ${e.target.value}`)}
                      placeholder="مثلاً 1404/05/20" />
                  </label>
                  <label className="zkad-f">
                    <span>نام بانک / درگاه واریزی</span>
                    <input className="zkad-input" defaultValue={activeCourseRecord.payment?.bank?.name || activeCourseRecord.payment?.bankName || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'payment.bankName', e.target.value, `ویرایش نام بانک به ${e.target.value}`)}
                      placeholder="بانک ملی، بلوبانک، تتر..." />
                  </label>
                  <label className="zkad-f">
                    <span>کد پیگیری / شماره ارجاع</span>
                    <input className="zkad-input" dir="ltr" defaultValue={activeCourseRecord.payment?.trackingCode || activeCourseRecord.trackingCode || ''}
                      onBlur={e => updateField(activeCourseRecord.id, 'payment.trackingCode', p2e(e.target.value).trim(), `ویرایش کد پیگیری پرداخت: ${e.target.value}`)}
                      placeholder="کد ارجاع فیش" />
                  </label>
                </div>

                <div className="zkad-actions">
                  <span className="zkad-actions-label">وضعیت تایید پرداخت:</span>
                  <button
                    type="button"
                    className="zkad-btn t-ok solid"
                    onClick={() => {
                      updateField(activeCourseRecord.id, 'payment', { ...(activeCourseRecord.payment || {}), verified: true, status: 'paid' });
                      onStatusChange?.(activeCourseRecord.id, 'پرداخت‌شده');
                    }}
                  >
                    <ZkCheckIcon size={12} /> تایید پرداخت
                  </button>
                  <button
                    type="button"
                    className="zkad-btn t-warn"
                    onClick={() => {
                      updateField(activeCourseRecord.id, 'payment', { ...(activeCourseRecord.payment || {}), verified: false, status: 'pending' });
                      onStatusChange?.(activeCourseRecord.id, 'در انتظار پرداخت');
                    }}
                  >
                    در انتظار پرداخت
                  </button>
                </div>
              </section>

              {activeCourseRecord.editHistory?.length > 0 && (
                <details className="zkad-details">
                  <summary>مشاهده اطلاعات اولیه و تاریخچه ویرایش دوره ({activeCourseRecord.editHistory.length} نسخه)</summary>
                  {activeCourseRecord.editHistory.map((h: any, i: number) => (
                    <pre key={i} className="zkad-pre">{`نسخه ${i + 1} — ${h.date || ''} ${h.time || ''}\n${JSON.stringify(h.data, null, 2)}`}</pre>
                  ))}
                </details>
              )}
            </div>
          )}

          {/* ---------- تب ۳: مدیریت و پیگیری ---------- */}
          {subTab === 'manage' && (
            <div className="zkad-pane">
              <div className="zkad-grid two">
                <label className="zkad-f">
                  <span>وضعیت سفارش</span>
                  <select className="zkad-input" value={status} onChange={e => onStatusChange?.(sub.id, e.target.value)}>
                    {statusOptions.map((x: string) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <div className="zkad-f">
                  <span>یادآور</span>
                  <button
                    type="button"
                    className={`zkad-btn full ${sub.followReminder ? 't-warn solid' : ''}`}
                    onClick={() => patchSelf({ followReminder: !sub.followReminder }, !sub.followReminder ? 'فعال‌سازی یادآور پیگیری' : 'غیرفعال‌سازی یادآور پیگیری')}
                  >
                    <ZkBellIcon size={13} /> {sub.followReminder ? 'یادآور فعال است' : 'یادآور پیگیری'}
                  </button>
                </div>
              </div>

              <div className="zkad-grid two">
                {(sub.type === 'consultation' || activeConsultRecord.type === 'consultation') && (
                  <label className="zkad-f">
                    <span>وضعیت مشاوره</span>
                    <select
                      className="zkad-input"
                      value={sub.consultationStatus || activeConsultRecord.consultationStatus || 'مشاوره اولیه'}
                      onChange={e => {
                        const val = e.target.value;
                        setSubs((list: any[]) => list.map(x => (x.id === sub.id || x.id === activeConsultRecord.id)
                          ? { ...x, consultationStatus: val, consultationStatusChangedAt: new Date().toISOString(), changeHistory: logChange(x, `تغییر وضعیت مشاوره به ${val}`) }
                          : x));
                      }}
                    >
                      {CONSULT_STATUSES.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                )}
                <div className="zkad-f">
                  <span>پیگیری‌ها (۵ مرحله)</span>
                  <div className="zkad-fu">
                    {[0, 1, 2, 3, 4].map(i => {
                      const st = (sub.followUps || [])[i];
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`zkad-fu-btn ${st === 'done' ? 'is-done' : st === 'miss' ? 'is-miss' : ''}`}
                          title={`پیگیری مرحله ${i + 1}`}
                          onClick={() => fu(i)}
                        >
                          {st === 'done' ? <ZkCheckIcon size={12} /> : st === 'miss' ? <ZkCloseIcon size={12} /> : <span>{i + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {sub.changeHistory?.length > 0 && (
                <details className="zkad-details">
                  <summary>تاریخچه تغییرات ({sub.changeHistory.length})</summary>
                  <ul className="zkad-history">
                    {sub.changeHistory.map((h: any, i: number) => <li key={i}><span className="zkad-mut">{h.at} — {h.by}:</span> {h.what}</li>)}
                  </ul>
                </details>
              )}

              <label className="zkad-f">
                <span>یادداشت مدیر (خصوصی)</span>
                <textarea className="zkad-textarea" defaultValue={sub.adminNotes || ''}
                  onBlur={e => { if (sub.adminNotes !== e.target.value) patchSelf({ adminNotes: e.target.value }, 'ویرایش یادداشت مدیر'); }}
                  placeholder="یادداشت داخلی — به کاربر نمایش داده نمی‌شود" />
              </label>

              <label className="zkad-f">
                <span>طریقه مصرف (در صفحه پیگیری به کاربر نمایش داده می‌شود)</span>
                <textarea className="zkad-textarea" defaultValue={sub.usageInstructions || ''}
                  onBlur={e => { if (sub.usageInstructions !== e.target.value) patchSelf({ usageInstructions: e.target.value }, 'ویرایش طریقه مصرف'); }}
                  placeholder="مثلاً: روزی یک پیمانه بعد از صبحانه..." />
              </label>

              <label className="zkad-f">
                <span>برنامه غذایی (در صفحه پیگیری به کاربر نمایش داده می‌شود)</span>
                <textarea className="zkad-textarea" defaultValue={sub.mealPlan || ''}
                  onBlur={e => { if (sub.mealPlan !== e.target.value) patchSelf({ mealPlan: e.target.value }, 'ویرایش برنامه غذایی'); }}
                  placeholder="برنامه غذایی هفتگی..." />
              </label>

              <label className="zkad-switch-row">
                <input className="zkad-display-check" type="checkbox" checked={!!sub.showMealPlan}
                  onChange={e => patchSelf({ showMealPlan: e.target.checked }, e.target.checked ? 'فعال‌سازی نمایش برنامه غذایی' : 'غیرفعال‌سازی نمایش برنامه غذایی')} />
                <span>نمایش برنامه غذایی در صفحه پیگیری</span>
              </label>

              {/* PDFها */}
              {([
                { key: 'usagePdfUrl', title: 'فایل PDF طریقه مصرف (اختیاری)', folder: 'usage-pdf', log: 'طریقه مصرف' },
                { key: 'mealPdfUrl', title: 'فایل PDF برنامه غذایی (اختیاری)', folder: 'meal-pdf', log: 'برنامه غذایی' },
              ] as const).map(f => (
                <div className="zkad-file" key={f.key}>
                  <div className="zkad-file-title"><ZkDocIcon size={13} /> {f.title}</div>
                  <div className="zkad-file-row">
                    <label className="zkad-btn sm">
                      <input type="file" accept="application/pdf" hidden onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try {
                          const url = await uploadPdfFile(file, f.folder);
                          if (sub[f.key]) await deleteStoredFile(sub[f.key]);
                          patchSelf({ [f.key]: url }, `آپلود فایل PDF ${f.log}`);
                        } catch (err: any) { alert(err?.message || 'آپلود فایل انجام نشد.'); }
                        e.target.value = '';
                      }} />
                      {sub[f.key] ? 'جایگزینی فایل' : 'انتخاب فایل PDF'}
                    </label>
                    {sub[f.key] && (
                      <>
                        <a href={sub[f.key]} target="_blank" rel="noreferrer" className="zkad-link t-ok"><ZkCheckIcon size={11} /> مشاهده فایل فعلی</a>
                        <button type="button" className="zkad-btn sm t-err" onClick={async () => {
                          if (!confirm(`فایل PDF ${f.log} حذف شود؟`)) return;
                          await deleteStoredFile(sub[f.key]);
                          patchSelf({ [f.key]: '' }, `حذف فایل PDF ${f.log}`);
                        }}>حذف</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* طریقه مصرف محصولات */}
              <details className="zkad-details">
                <summary>
                  <ZkPillIcon size={13} /> طریقه مصرف محصولات ({Object.values(sub.productUsage || {}).filter((u: any) => u && u.enabled).length} فعال)
                </summary>
                {(cfg?.products?.list || []).map((pr: any) => {
                  const u = (sub.productUsage || {})[pr.id] || {};
                  const setU = (k: string, v: any) => patchSelf({ productUsage: { ...(sub.productUsage || {}), [pr.id]: { ...u, [k]: v } } }, `ویرایش طریقه مصرف ${pr.name}`);
                  const ProdIcon = productVectorIcon(pr.icon);
                  return (
                    <div key={pr.id} className={`zkad-product ${u.enabled ? 'is-on' : ''}`}>
                      <label className="zkad-switch-row">
                        <input type="checkbox" checked={!!u.enabled} onChange={e => setU('enabled', e.target.checked)} />
                        <span className="zkad-product-name">
                          {ProdIcon ? <ProdIcon size={15} /> : (pr.icon || <BoxIcon size={13} />)} {pr.name}
                        </span>
                      </label>
                      {u.enabled && (
                        <div className="zkad-product-body">
                          <div className="zkad-grid two">
                            <label className="zkad-f"><span>مقدار مصرف</span><input className="zkad-input" defaultValue={u.dosage || ''} onBlur={e => setU('dosage', e.target.value)} placeholder="یک پیمانه" /></label>
                            <label className="zkad-f"><span>زمان مصرف</span><input className="zkad-input" defaultValue={u.time || ''} onBlur={e => setU('time', e.target.value)} placeholder="بعد از صبحانه" /></label>
                            <label className="zkad-f"><span>ساعت مصرف</span><input className="zkad-input" defaultValue={u.hour || ''} onBlur={e => setU('hour', e.target.value)} placeholder="۸ صبح" /></label>
                            <label className="zkad-f"><span>با چی بخوره</span><input className="zkad-input" defaultValue={u.withWhat || ''} onBlur={e => setU('withWhat', e.target.value)} placeholder="با شیر" /></label>
                          </div>
                          <label className="zkad-f">
                            <span>توضیحات تکمیلی این محصول</span>
                            <textarea className="zkad-textarea sm" defaultValue={u.note || ''} onBlur={e => setU('note', e.target.value)} />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </details>

              <label className="zkad-switch-row">
                <input className="zkad-display-check" type="checkbox" checked={!!sub.showCorrectiveTab}
                  onChange={e => patchSelf({ showCorrectiveTab: e.target.checked }, e.target.checked ? 'فعال‌سازی نمایش اصلاحی' : 'غیرفعال‌سازی نمایش اصلاحی')} />
                <span>نمایش تب «اصلاحی» به کاربر در صفحه پیگیری</span>
              </label>

              <label className="zkad-f">
                <span><ZkStethoscopeIcon size={13} /> اطلاعات اصلاحی (قابل مشاهده در صفحه پیگیری)</span>
                <textarea className="zkad-textarea" defaultValue={sub.corrective || ''}
                  onBlur={e => { if (sub.corrective !== e.target.value) patchSelf({ corrective: e.target.value }, 'ویرایش اطلاعات اصلاحی'); }}
                  placeholder="اطلاعات اصلاحی..." />
              </label>

              <label className="zkad-f">
                <span>نکات قابل مشاهده توسط کاربر</span>
                <textarea className="zkad-textarea" defaultValue={sub.userNotes || ''}
                  onBlur={e => { if (sub.userNotes !== e.target.value) patchSelf({ userNotes: e.target.value }, 'ویرایش نکات قابل مشاهده کاربر'); }}
                  placeholder="مواردی که کاربر در صفحه پیگیری می‌بیند..." />
              </label>

              <div className="zkad-actions">
                <button type="button" className="zkad-btn" onClick={() => patchSelf({ priority: sub.priority === 'high' ? 'normal' : 'high' }, sub.priority === 'high' ? 'تغییر اولویت به عادی' : 'تغییر اولویت به زیاد')}>
                  {sub.priority === 'high' ? 'حذف اولویت زیاد' : 'تعیین اولویت زیاد'}
                </button>
                <button type="button" className="zkad-btn t-err" onClick={() => { if (confirm('این فرم به سطل بازیافت منتقل شود؟')) setSubs((s: any[]) => s.filter(x => x.id !== sub.id)); }}>
                  <ZkTrashIcon size={12} /> حذف فرم
                </button>
              </div>
            </div>
          )}

          {/* ---------- تب ۴: اصلاحی ---------- */}
          {subTab === 'corrective' && (
            <div className="zkad-pane">
              {sub.correctiveData && typeof sub.correctiveData === 'object' ? (
                <>
                  <h4 className="zkad-pane-title"><ZkDocIcon size={14} /> اطلاعات اصلاحی تکمیل‌شده توسط کاربر</h4>
                  <dl className="zkad-facts wide">
                    {Object.entries(sub.correctiveData)
                      .filter(([k, v]) => !['_trackingCodeRaw', '_phoneRaw', 'submittedAt'].includes(k) && v)
                      .map(([k, v]) => (
                        <div key={k}><dt>{CORRECTIVE_LABELS[k] || k}</dt><dd>{String(v)}</dd></div>
                      ))}
                    {sub.correctiveData.submittedAt && (
                      <div><dt>تاریخ ثبت</dt><dd>{new Date(sub.correctiveData.submittedAt).toLocaleString('fa-IR')}</dd></div>
                    )}
                  </dl>
                  <button
                    type="button"
                    className="zkad-btn full"
                    onClick={async () => {
                      let text = 'اطلاعات اصلاحی:\n\n';
                      Object.entries(sub.correctiveData)
                        .filter(([k, v]) => !['_trackingCodeRaw', '_phoneRaw', 'submittedAt'].includes(k) && v)
                        .forEach(([k, v]) => { text += `${CORRECTIVE_LABELS[k] || k}: ${v}\n`; });
                      if (sub.correctiveData.submittedAt) text += `\nتاریخ ثبت: ${new Date(sub.correctiveData.submittedAt).toLocaleString('fa-IR')}\n`;
                      if (sub.course) text += `\nدوره تهیه‌شده: ${sub.course.title || '—'}\n`;
                      if (sub.course?.price) text += `هزینه دوره: ${Number(sub.course.price).toLocaleString()} تومان\n`;
                      const ok = await copyText(text);
                      alert(ok ? 'اطلاعات اصلاحی کپی شد.' : 'کپی انجام نشد.');
                    }}
                  >
                    <ZkCopyIcon size={13} /> کپی اطلاعات اصلاحی
                  </button>
                </>
              ) : (
                <div className="zkad-empty-note">کاربر هنوز فرم اصلاحی را تکمیل نکرده است.</div>
              )}

              {sub.editHistory?.length > 0 && (
                <details className="zkad-details">
                  <summary>تاریخچه ویرایش‌های قبلی ({sub.editHistory.length} نسخه)</summary>
                  {sub.editHistory.map((h: any, i: number) => (
                    <pre key={i} className="zkad-pre">{`نسخه ${i + 1} — تاریخ: ${h.date || ''} ${h.time || ''}\n${JSON.stringify(h.data, null, 2)}`}</pre>
                  ))}
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const SubCard = memo(SubCardBase);
export default SubCard;

// ---------------------------------------------------------------------------
// LazySubCard — رندر تنبل با IntersectionObserver
// ---------------------------------------------------------------------------
export const LazySubCard = memo(function LazySubCard(props: SubCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '240px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // اگر کارت باز است، همیشه رندر شود (حتی خارج از دید) تا حالت باز از دست نرود
  const shouldRender = visible || props.isOpen || props.forceOpen;

  return (
    <div ref={ref} className="zkad-sub-slot">
      {shouldRender ? <SubCard {...props} /> : <div className="zkad-sub-skeleton" />}
    </div>
  );
});
