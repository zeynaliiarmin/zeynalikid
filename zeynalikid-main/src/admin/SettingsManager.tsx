// ============================================================================
// SettingsManager — بازطراحی کامل «تنظیمات» (رفع fg / پرش صفحه)
//
// مشکل قبلی: هر تغییر، کل AdminPanel را re-render می‌کرد (setEditCfg) و
// SettingsEditor با فراخوانی مستقیم رندر می‌شد → lag / fg / پرش صفحه.
//
// معماری جدید:
//   - کامپوننت مستقل با رندر JSX (قوانین hooks رعایت می‌شود)
//   - state محلی draft (کپی از editCfg) — تغییرات فقط همین کامپوننت را
//     re-render می‌کند، نه کل AdminPanel
//   - ذخیره با دکمه (setSave(draft))
//   - همهٔ قابلیت‌ها و ویژگی‌های قبلی ۱:۱ حفظ شده‌اند
// ============================================================================
import React, { useState, useCallback } from 'react';
import { getCountryFlag } from '../utils/phone';
import { ZkCloseIcon, ZkArrowUpIcon, ZkArrowDownIcon, ZkPlusIcon, ZkTrashIcon, ZkCheckCircleIcon, ZkXCircleIcon, ZkBellIcon, ZkUploadIcon } from './adminIcons';

interface Props {
  T: any; S: any; AdminBtn: () => any; Box: any; Field: any;
  StableAdminInput: any; StableAdminTextarea: any;
  editCfg: any; setSave: (next: any) => void;
  fileToData: (f: File, oldUrl?: string, folder?: string) => Promise<string>;
  deleteStoredImage: (u?: string) => Promise<void>;
  PROFILE_PHOTO: string; TH: any;
  p2e: (v: string) => string;
  uid: () => number;
}

export default function SettingsManager(props: Props) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, editCfg, setSave, fileToData, deleteStoredImage, PROFILE_PHOTO, TH, p2e, uid } = props;

  // ── draft محلی: کپی عمیق از editCfg — فقط با دکمهٔ ذخیره به settings واقعی می‌رود ──
  const [draft, setDraft] = useState<any>(() => {
    try { return JSON.parse(JSON.stringify(editCfg || {})); } catch { return { ...(editCfg || {}) }; }
  });
  const [subTab, setSubTab] = useState<'secondary' | 'primary' | 'layout' | 'translations'>('secondary');

  const up = useCallback((k: string, v: any) => setDraft((prev: any) => ({ ...prev, [k]: v })), []);
  const upNested = useCallback((path: string[], v: any) => setDraft((prev: any) => {
    const next = { ...prev };
    let cur: any = next;
    for (let i = 0; i < path.length - 1; i++) {
      if (!cur[path[i]] || typeof cur[path[i]] !== 'object') cur[path[i]] = {};
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = v;
    return next;
  }), []);

  const ff = draft.formFields || {};
  const arrKeys: [string, string][] = [['consultTopics', 'موضوعات مشاوره'], ['digestiveOptions', 'گزینه‌های گوارش'], ['appetiteOptions', 'گزینه‌های اشتها'], ['specialConditions', 'شرایط خاص'], ['timeSlots', 'بازه‌های تماس'], ['categories', 'دسته‌بندی‌ها']];
  const thTab = (id: 'secondary' | 'primary' | 'layout' | 'translations', label: string) => (
    <button type="button" onClick={() => setSubTab(id)} style={{ ...AdminBtn(), background: subTab === id ? T.soft : T.card, color: subTab === id ? T.acc : T.mut, boxShadow: subTab === id ? T.neuIn : T.neuOut }}>
      {label}
    </button>
  );

  // ── بخش‌های تکراری کوچک ──
  const Checklist = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );

  // ── لیست آرایه (مثل ArrEditor قدیمی ولی روی draft) ──
  const ArrList = ({ k, title }: { k: string; title: string }) => {
    const [inputVal, setInputVal] = useState('');
    const list: string[] = draft[k] || [];
    const addVal = () => { const v = p2e(inputVal).trim(); if (v) { up(k, [...list, v]); setInputVal(''); } };
    return (
      <Box title={title}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {list.map((x: string, i: number) => (
            <span key={`${k}-${i}-${String(x).slice(0, 10)}`} style={{ padding: '5px 8px', border: `1px solid ${T.brd}`, borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input style={{ background: 'transparent', border: 0, color: T.txt, fontSize: 16, width: 130 }} defaultValue={x} onBlur={(e) => { const val = p2e(e.target.value); const a = [...list]; a[i] = val; up(k, a); }} />
              <button type="button" className="zkad-iconbtn t-err" title="حذف مورد" onClick={() => up(k, list.filter((_: any, j: number) => j !== i))}><ZkCloseIcon size={13} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input style={S.inp} value={inputVal} onChange={(e) => setInputVal(p2e(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') addVal(); }} placeholder="مورد جدید" />
          <button type="button" style={AdminBtn()} onClick={addVal}>+</button>
        </div>
      </Box>
    );
  };

  // ── تب ۱: پروژه ثانویه (فرم مشاوره) ──
  const SecondaryTab = (
    <>
      <Box title="تنظیمات ظاهری (فرم مشاوره)">
        <label style={S.lbl}>تم</label>
        <select style={S.inp} value={draft.theme || 'light'} onChange={(e) => up('theme', e.target.value)}>
          {Object.values(TH).map((th: any) => <option key={th.id} value={th.id}>{th.name}</option>)}
        </select>
        {['siteTitle', 'browserTitle', 'specialistName', 'heroTitle', 'heroDesc', 'noticeText', 'phoneNote', 'submitBtnText', 'successMsg', 'successSubMsg', 'timeSlotLabel'].map((k) => (
          <Field key={k} label={k} value={draft[k] || ''} onChange={(v: string) => up(k, v)} ph="" />
        ))}
        <Checklist label="نمایش عکس متخصص در صفحه مشاوره" value={!!draft.showSpecialistPhoto} onChange={(v) => up('showSpecialistPhoto', v)} />
        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ ...S.inp, marginTop: 8 }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) up('photoUrl', await fileToData(f, draft.photoUrl, 'profile')); }} />
        <button type="button" style={{ ...AdminBtn(), marginTop: 8 }} onClick={async () => { await deleteStoredImage(draft.photoUrl); up('photoUrl', PROFILE_PHOTO); }}>بازگشت به عکس پیش‌فرض</button>
      </Box>

      <Box title="تنظیمات فیلدهای فرم مشاوره">
        {Object.keys(ff).map((k) => (
          <div key={k} style={{ borderBottom: `1px solid ${T.brd}`, padding: '8px 0' }}>
            <b>{k}</b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
              <input style={S.inp} defaultValue={ff[k].label} onBlur={(e) => upNested(['formFields', k, 'label'], e.target.value)} />
              <input style={S.inp} defaultValue={ff[k].placeholder} onBlur={(e) => upNested(['formFields', k, 'placeholder'], e.target.value)} />
            </div>
            <label style={{ marginInlineEnd: 12 }}><input type="checkbox" checked={ff[k].show !== false} onChange={(e) => upNested(['formFields', k, 'show'], e.target.checked)} /> نمایش</label>
            <label><input type="checkbox" checked={!!ff[k].required} onChange={(e) => upNested(['formFields', k, 'required'], e.target.checked)} /> اجباری</label>
            {k === 'age' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, background: T.soft, padding: 10, borderRadius: 12 }}>
                <div><label style={{ fontSize: 11, color: T.mut, display: 'block', marginBottom: 4 }}>حداقل سن مجاز (سال)</label>
                  <input type="number" style={{ ...S.inp, minHeight: 38, fontSize: 14 }} defaultValue={ff.age?.min ?? 2} onBlur={(e) => upNested(['formFields', 'age', 'min'], Number(p2e(e.target.value)) || 2)} /></div>
                <div><label style={{ fontSize: 11, color: T.mut, display: 'block', marginBottom: 4 }}>حداکثر سن مجاز (سال)</label>
                  <input type="number" style={{ ...S.inp, minHeight: 38, fontSize: 14 }} defaultValue={ff.age?.max ?? 17} onBlur={(e) => upNested(['formFields', 'age', 'max'], Number(p2e(e.target.value)) || 17)} /></div>
              </div>
            )}
          </div>
        ))}
      </Box>

      {arrKeys.map((x) => <ArrList key={x[0]} k={x[0]} title={x[1]} />)}

      <Box title="پیام‌های موفقیت و راهنما">
        <Field label="متن پیام موفقیت" value={draft.successMsg || ''} onChange={(v: string) => up('successMsg', v)} ph="" />
        <Field label="متن زیرِ پیام موفقیت" value={draft.successSubMsg || ''} onChange={(v: string) => up('successSubMsg', v)} ph="" />
        <Field label="متن دکمه ثبت فرم جدید" value={draft.newFormBtn || ''} onChange={(v: string) => up('newFormBtn', v)} ph="" />
        <Field label="متن دکمه ثبت مستقیم دوره" value={draft.directCourseBtn || ''} onChange={(v: string) => up('directCourseBtn', v)} ph="" />
      </Box>

      <Box title="ورود مهمان - محتوای عمومی">
        <label style={S.lbl}>طریقه مصرف عمومی برای مهمان (guestUsage)</label>
        <StableAdminTextarea style={S.ta} defaultValue={draft.guestUsage || ''} onCommit={(v: string) => up('guestUsage', v)} placeholder="متن طریقه مصرف عمومی..." rows={4} />
        <label style={{ ...S.lbl, marginTop: 10 }}>برنامه غذایی عمومی برای مهمان (guestMealPlan)</label>
        <StableAdminTextarea style={S.ta} defaultValue={draft.guestMealPlan || ''} onCommit={(v: string) => up('guestMealPlan', v)} placeholder="برنامه غذایی عمومی..." rows={4} />
      </Box>
    </>
  );

  // ── تب ۲: پروژه اصلی (دوره‌ها + پنل) ──
  const products = draft.products && typeof draft.products === 'object' && !Array.isArray(draft.products)
    ? draft.products : { showSection: true, list: Array.isArray(draft.products) ? draft.products : [] };
  const prodList: any[] = Array.isArray(products.list) ? products.list : [];
  const showSection = (products.showSection ?? draft.showProductsSection ?? draft.showProductsPage ?? true) !== false;
  const setProducts = (patch: any) => setDraft((prev: any) => ({ ...prev, products: { ...products, ...patch } }));

  const cleanupReceipts = async () => {
    if (!confirm('آیا از پاک‌سازی فیش‌های قدیمی‌تر از ۱ ماه مطمئن هستید؟ این عملیات قابل بازگشت نیست.')) return;
    try {
      const { adminCleanupReceiptsDryRun, adminCleanupReceiptsExecute } = await import('../lib/adminApi');
      const dry = await adminCleanupReceiptsDryRun();
      if (dry.targetFiles === 0) { alert('هیچ فیش قدیمی‌ای برای پاک‌سازی یافت نشد.'); return; }
      if (!confirm(`${dry.targetFiles} فیش قدیمی یافت شد. ادامه می‌دهید؟`)) return;
      const r = await adminCleanupReceiptsExecute();
      alert(`پاک‌سازی موفق بود.\nفایل‌های حذف‌شده: ${r.deleted}\nرکوردهای به‌روزرسانی‌شده: ${r.cleanedRows}`);
    } catch (e: any) {
      if (e?.status === 401) { alert('نشست ادمین معتبر نیست. لطفاً دوباره وارد شوید.'); } else { alert(e?.message || 'خطا در پاک‌سازی فیش‌ها.'); }
    }
  };

  const PrimaryTab = (
    <>
      <Box title="تنظیمات ظاهری (دوره‌ها + پنل)">
        <Field label="adminLoginText" value={draft.adminLoginText || ''} onChange={(v: string) => up('adminLoginText', v)} ph="" />
        <label style={S.lbl}>حداکثر حجم فیش واریزی (کیلوبایت)</label>
        <input style={S.inp} inputMode="numeric" type="number" min={100} max={1000} defaultValue={draft.imageCompressionKB || 500} onBlur={(e) => up('imageCompressionKB', Math.min(1000, Math.max(100, +p2e(e.target.value) || 500)))} />
        <p style={{ fontSize: 11, color: T.mut, margin: '4px 0 12px' }}>عکس‌های آپلودی به این حجم فشرده می‌شوند (بین ۱۰۰ تا ۱۰۰۰ کیلوبایت).</p>
        <button type="button" style={{ ...AdminBtn(), display: 'block', marginBottom: 12 }} onClick={cleanupReceipts}><ZkTrashIcon size={13} /> پاک‌سازی فیش‌های قدیمی (بیش از ۱ ماه)</button>
        <label style={S.lbl}>تعداد ارقام کد پیگیری</label>
        <select style={S.inp} value={draft.trackingDigitCount || 5} onChange={(e) => up('trackingDigitCount', parseInt(e.target.value))}>
          <option value={4}>۴ رقم (ZK1234)</option>
          <option value={5}>۵ رقم (ZK12345) — پیش‌فرض</option>
          <option value={6}>۶ رقم (ZK123456)</option>
          <option value={7}>۷ رقم (ZK1234567)</option>
          <option value={8}>۸ رقم (ZK12345678)</option>
        </select>
        <p style={{ fontSize: 12, color: T.mut, marginTop: 6, marginBottom: 12 }}>تغییر این مقدار فقط برای فرم‌های جدید اعمال می‌شود. فرم‌های قبلی با همان کد قبلی باقی می‌مانند.</p>
      </Box>

      <Box title="عکس زبان فرزند (صفحه اطلاعات فرزند)">
        <Checklist label="اجباری بودن بارگذاری عکس زبان" value={!!draft.isTonguePhotoRequired} onChange={(v) => up('isTonguePhotoRequired', v)} />
        <label style={S.lbl}>حداکثر حجم هر عکس (مگابایت)</label>
        <StableAdminInput style={S.inp} inputMode="numeric" type="number" min={1} max={15} defaultValue={draft.maxTonguePhotoSizeMB || 5} onCommit={(v: string) => up('maxTonguePhotoSizeMB', Math.min(15, Math.max(1, +p2e(v) || 5)))} numeric />
        <label style={{ ...S.lbl, marginTop: 10 }}>حداکثر تعداد عکس‌ها</label>
        <StableAdminInput style={S.inp} inputMode="numeric" type="number" min={1} max={10} defaultValue={draft.maxTonguePhotoCount || 3} onCommit={(v: string) => up('maxTonguePhotoCount', Math.min(10, Math.max(1, +p2e(v) || 3)))} numeric />
        <div style={{ marginTop: 10 }}>
          <Checklist label="نمایش متن راهنما زیر عنوان بخش" value={draft.showTonguePhotoHint !== false} onChange={(v) => up('showTonguePhotoHint', v)} />
        </div>
      </Box>

      <Box title="باکس معرفی کارشناس در صفحه دوره‌ها">
        <Checklist label="نمایش باکس کارشناس در صفحه معرفی دوره" value={draft.courseInstructor?.show !== false} onChange={(v) => upNested(['courseInstructor', 'show'], v)} />
        <label style={S.lbl}>نام کارشناس</label>
        <StableAdminInput style={{ ...S.inp, marginBottom: 10 }} defaultValue={draft.courseInstructor?.name || 'آرمین زینالی'} onCommit={(v: string) => upNested(['courseInstructor', 'name'], v)} />
        <label style={S.lbl}>توضیحات و سمت کارشناس</label>
        <StableAdminTextarea style={{ ...S.ta, minHeight: 60 }} defaultValue={draft.courseInstructor?.desc || 'متخصص رشد و تغذیه کودک و نوجوان، همراه خانواده‌ها در مسیر رشد سالم'} onCommit={(v: string) => upNested(['courseInstructor', 'desc'], v)} placeholder="متن سمت و تخصص کارشناس..." rows={3} />
      </Box>

      <Box title="مدیریت نمایش بخش محصولات">
        <Checklist label={showSection ? 'بخش محصولات فعال است (در منو و صفحه نمایش داده می‌شود)' : 'بخش محصولات غیرفعال است (در منو و صفحه پنهان است)'} value={showSection} onChange={(v) => { setProducts({ showSection: v }); up('showProductsSection', v); up('showProductsPage', v); }} />
        <p style={{ fontSize: 11, color: T.mut, marginTop: 8, lineHeight: 1.8 }}>این گزینه هم آیتم «محصولات» در منوی همبرگری و هم صفحه /products را کنترل می‌کند.</p>
      </Box>
      <Box title={`لیست محصولات (${prodList.length})`}>
        {prodList.map((it: any, i: number) => (
          <details key={it.id || i} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 10, marginBottom: 10, background: T.badge }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>{it.name || 'بدون نام'} {it.isVisible === false && '(مخفی)'}</span>
              <span style={{ fontSize: 10, color: it.isVisible !== false ? T.ok : T.err }}>{it.isVisible !== false ? <ZkCheckCircleIcon size={14} color={T.ok} /> : <ZkXCircleIcon size={14} color={T.err} />}</span>
            </summary>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Checklist label="نمایش محصول" value={it.isVisible !== false} onChange={(v) => { const a = [...prodList]; a[i] = { ...a[i], isVisible: v }; setProducts({ list: a }); }} />
                <span style={{ fontSize: 11, color: T.mut }}>ترتیب: {it.order || i + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, marginBottom: 8 }}>
                <StableAdminInput style={S.inp} defaultValue={it.icon || ''} onCommit={(v: string) => { const a = [...prodList]; a[i] = { ...a[i], icon: v }; setProducts({ list: a }); }} placeholder="آیکون" />
                <StableAdminInput style={S.inp} defaultValue={it.name || ''} onCommit={(v: string) => { const a = [...prodList]; a[i] = { ...a[i], name: v }; setProducts({ list: a }); }} placeholder="نام محصول" />
              </div>
              <label style={S.lbl}>توضیحات محصول</label>
              <StableAdminTextarea style={{ ...S.ta, marginBottom: 8, minHeight: 60 }} defaultValue={it.description || ''} onCommit={(v: string) => { const a = [...prodList]; a[i] = { ...a[i], description: v }; setProducts({ list: a }); }} placeholder="توضیحات کامل محصول..." rows={3} />
              <label style={S.lbl}>ویژگی‌ها (با | یا کاما یا خط جدید جدا کنید)</label>
              <textarea style={{ ...S.ta, marginBottom: 8, minHeight: 50 }} defaultValue={(it.features || []).join(' | ')} onBlur={(e) => { const feats = e.target.value.split(/[|,\n]/).map((s: string) => s.trim()).filter(Boolean); const a = [...prodList]; a[i] = { ...a[i], features: feats }; setProducts({ list: a }); }} placeholder="جذب سریع | مناسب برای رشد | ..." />
              <label style={S.lbl}>عکس محصول (آپلود یا لینک مستقیم)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                {it.image && <img src={it.image} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.brd}` }} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { const url = await fileToData(f, it.image, 'products'); const a = [...prodList]; a[i] = { ...a[i], image: url }; setProducts({ list: a }); } catch (err: any) { alert(err?.message || 'آپلود انجام نشد'); } } }} />
              </div>
              <StableAdminInput style={{ ...S.inp, marginBottom: 8 }} defaultValue={it.image || ''} onCommit={(v: string) => { const a = [...prodList]; a[i] = { ...a[i], image: v.trim() }; setProducts({ list: a }); }} placeholder="https://... یا لینک مستقیم عکس" />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="button" style={AdminBtn()} disabled={i === 0} onClick={() => { const a = [...prodList]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setProducts({ list: a.map((x, idx) => ({ ...x, order: idx + 1 })) }); }}><ZkArrowUpIcon size={13} /> بالا</button>
                <button type="button" style={AdminBtn()} disabled={i === prodList.length - 1} onClick={() => { const a = [...prodList]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setProducts({ list: a.map((x, idx) => ({ ...x, order: idx + 1 })) }); }}><ZkArrowDownIcon size={13} /> پایین</button>
                <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => setProducts({ list: prodList.filter((_: any, j: number) => j !== i) })}><ZkTrashIcon size={13} /> حذف</button>
                <button type="button" style={AdminBtn()} onClick={async () => { if (it.image) { try { await deleteStoredImage(it.image); } catch { } const a = [...prodList]; a[i] = { ...a[i], image: '' }; setProducts({ list: a }); } }}>حذف عکس</button>
              </div>
            </div>
          </details>
        ))}
        <button type="button" style={AdminBtn()} onClick={() => setProducts({ list: [...prodList, { id: 'p' + uid(), name: 'محصول جدید', title: 'محصول جدید', icon: '', description: 'توضیحات محصول جدید', features: ['ویژگی ۱', 'ویژگی ۲'], image: '', isVisible: true, order: prodList.length + 1, price: '' }] })}><ZkPlusIcon size={13} /> افزودن محصول جدید</button>
      </Box>

      <Box title="مدیریت کدهای کشور">
        {(draft.countryCodes || []).map((c: any, i: number) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '85px 1fr 80px 1.4fr 45px', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 20 }}>{getCountryFlag(c)}</span><StableAdminInput style={{ ...S.inp, flex: 1 }} defaultValue={c.flag} onCommit={(v: string) => { const a = [...(draft.countryCodes || [])]; a[i] = { ...a[i], flag: v }; up('countryCodes', a); }} /></div>
            <StableAdminInput style={S.inp} defaultValue={c.name} onCommit={(v: string) => { const a = [...(draft.countryCodes || [])]; a[i] = { ...a[i], name: v }; up('countryCodes', a); }} />
            <StableAdminInput style={S.inp} defaultValue={c.code} onCommit={(v: string) => { const a = [...(draft.countryCodes || [])]; a[i] = { ...a[i], code: p2e(v) }; up('countryCodes', a); }} />
            <StableAdminInput style={S.inp} defaultValue={c.regex} onCommit={(v: string) => { const a = [...(draft.countryCodes || [])]; a[i] = { ...a[i], regex: v }; up('countryCodes', a); }} />
            <button type="button" className="zkad-iconbtn t-err" title="حذف کشور" disabled={c.locked} onClick={() => up('countryCodes', (draft.countryCodes || []).filter((_: any, j: number) => j !== i))}><ZkCloseIcon size={13} /></button>
          </div>
        ))}
        <button type="button" style={AdminBtn()} onClick={() => up('countryCodes', [...(draft.countryCodes || []), { id: 'c' + uid(), name: 'کشور جدید', code: '+0', flag: '', regex: '^\\d{7,}$' }])}><ZkPlusIcon size={13} /> افزودن کشور</button>
      </Box>
    </>
  );

  // ── تب ۳: چیدمان صفحه اصلی و منوی همبرگری ──
  const homeLabels: Record<string, string> = { consult: 'ثبت درخواست مشاوره', courses: 'معرفی دوره‌ها', experience: 'تجربه والدین', licenses: 'مجوزها', contact: 'ارتباط با ما' };
  const menuLabels: Record<string, string> = { consult: 'فرم مشاوره', courses: 'معرفی دوره‌ها', experience: 'تجربه والدین', licenses: 'مجوزها', education: 'آموزش‌ها', faq: 'سوالات متداول', about: 'درباره ما', contact: 'ارتباط با ما', track: 'وارد کردن کد پیگیری' };
  const viewLabels: [string, string][] = [['home', 'صفحه اصلی (Home)'], ['courses', 'معرفی دوره‌ها'], ['child-info', 'اطلاعات فرزند'], ['course-shipping', 'اطلاعات ارسال'], ['course-payment', 'پرداخت'], ['course-confirm', 'تأیید ثبت‌نام'], ['course-done', 'اتمام ثبت‌نام'], ['track', 'پیگیری'], ['experience', 'تجربه والدین'], ['licenses', 'مجوزها'], ['education', 'آموزش‌ها'], ['about', 'درباره ما'], ['contact', 'ارتباط با ما'], ['admin-login', 'ورود پنل مدیریت'], ['admin', 'پنل مدیریت']];
  const contentOrderPages: [string, string][] = [['home', 'صفحه اصلی'], ['courses', 'معرفی دوره‌ها'], ['experience', 'تجربه والدین'], ['education', 'آموزش‌ها'], ['about', 'درباره ما']];
  const pco = draft.pageContentOrder || {};

  const LayoutSection = ({ title, items, labels, stateKey }: { title: string; items: any[]; labels: Record<string, string>; stateKey: 'homeLayout' | 'menuLayout' }) => (
    <Box title={title}>
      {items.map((it: any, i: number) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 10, background: T.soft, marginBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={it.show !== false} onChange={() => { const list = [...items]; list[i] = { ...list[i], show: !list[i].show }; up(stateKey, list); }} /> {labels[it.id] || it.id}
          </label>
          <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={i === 0} onClick={() => { const list = [...items]; const j = i - 1; if (j < 0) return; [list[i], list[j]] = [list[j], list[i]]; up(stateKey, list); }}><ZkArrowUpIcon size={13} /></button>
          <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={i === items.length - 1} onClick={() => { const list = [...items]; const j = i + 1; if (j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; up(stateKey, list); }}><ZkArrowDownIcon size={13} /></button>
        </div>
      ))}
    </Box>
  );

  const LayoutTab = (
    <>
      <LayoutSection title="چیدمان صفحه اصلی (میانبرهای هوم)" items={draft.homeLayout || []} labels={homeLabels} stateKey="homeLayout" />
      <Box title="مدل نمایش خدمات">
        <p style={{ fontSize: 11, color: T.mut, marginBottom: 8, lineHeight: 1.8 }}>تنظیمات تفکیکی هر صفحه در تب «خدمات» قابل ویرایش است.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label style={S.lbl}>صفحه اصلی</label><select style={S.inp} value={draft.servicesDisplayMode?.home || 'list'} onChange={(e) => upNested(['servicesDisplayMode', 'home'], e.target.value)}><option value="list">لیست</option><option value="carousel">کاروسل</option></select></div>
          <div><label style={S.lbl}>صفحه دوره‌ها</label><select style={S.inp} value={draft.servicesDisplayMode?.courses || 'list'} onChange={(e) => upNested(['servicesDisplayMode', 'courses'], e.target.value)}><option value="list">لیست</option><option value="carousel">کاروسل</option></select></div>
        </div>
      </Box>
      <LayoutSection title="چیدمان منوی همبرگری" items={draft.menuLayout || []} labels={menuLabels} stateKey="menuLayout" />
      <Box title="صفحات دارای منوی همبرگری">
        {viewLabels.map(([id, label]) => (
          <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 6px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={(draft.menuVisibility || {})[id] !== undefined ? !!((draft.menuVisibility || {})[id]) : true} onChange={() => { const cur = draft.menuVisibility || {}; up('menuVisibility', { ...cur, [id]: !(cur[id] !== undefined ? cur[id] : true) }); }} /> {label}
          </label>
        ))}
        <p style={{ fontSize: 11, color: T.mut, marginTop: 6 }}>در صفحاتی که این گزینه فعال باشد، آیکون منوی همبرگری نمایش داده می‌شود.</p>
      </Box>
      <Box title="ترتیب نمایش محتوا در صفحات">
        <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>برای هر صفحه مشخص کنید آیا محتوای سئوی انتهای صفحه نمایش داده شود یا نه، و ترتیب آن نسبت به بخش «ارتباط با ما» چگونه باشد.</p>
        {contentOrderPages.map(([id, label]) => {
          const cfgRow = pco[id] || { showIntro: true, order: 'contentFirst' };
          return (
            <div key={id} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 10, marginBottom: 8, background: T.soft }}>
              <b style={{ fontSize: 13, color: T.ttl, display: 'block', marginBottom: 8 }}>{label}</b>
              <Checklist label="نمایش محتوای سئو در این صفحه" value={cfgRow.showIntro !== false} onChange={(v) => upNested(['pageContentOrder', id], { ...cfgRow, showIntro: v })} />
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}><input type="radio" name={`order-${id}`} checked={cfgRow.order !== 'contactFirst'} onChange={() => upNested(['pageContentOrder', id], { ...cfgRow, order: 'contentFirst' })} /> اول محتوا، سپس ارتباط با ما</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}><input type="radio" name={`order-${id}`} checked={cfgRow.order === 'contactFirst'} onChange={() => upNested(['pageContentOrder', id], { ...cfgRow, order: 'contactFirst' })} /> اول ارتباط با ما، سپس محتوا</label>
              </div>
            </div>
          );
        })}
      </Box>
    </>
  );

  // ── تب ۴: مدیریت متن‌ها و ترجمه‌ها ──
  const TranslationsTab = (
    <>
      <Box title="عناوین کنار عکس پروفایل (دوزبانه)">
        <Field label="عنوان متخصص (فارسی)" value={draft.specialistTitle || ''} onChange={(v: string) => up('specialistTitle', v)} ph="" />
        <Field label="عنوان متخصص (انگلیسی)" value={draft.specialistTitleEn || ''} onChange={(v: string) => up('specialistTitleEn', v)} ph="" />
        <Field label="زیرعنوان خوش‌آمدگویی (فارسی)" value={draft.heroSubtitle || ''} onChange={(v: string) => up('heroSubtitle', v)} ph="" />
        <Field label="زیرعنوان خوش‌آمدگویی (انگلیسی)" value={draft.heroSubtitleEn || ''} onChange={(v: string) => up('heroSubtitleEn', v)} ph="" />
      </Box>
      <Box title="متن صفحه درباره ما (دوزبانه)">
        <label style={S.lbl}>متن فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.aboutText || ''} onCommit={(v: string) => up('aboutText', v)} placeholder="متن صفحه درباره ما به فارسی..." rows={3} />
        <label style={{ ...S.lbl, marginTop: 10 }}>متن انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.aboutTextEn || ''} onCommit={(v: string) => up('aboutTextEn', v)} placeholder="About us content in English..." rows={3} />
      </Box>
      <Box title="متن‌های سئو در انتهای صفحات (دوزبانه)">
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, color: T.ttl }}>معرفی دوره‌ها</summary>
          <label style={{ ...S.lbl, marginTop: 8 }}>متن کوتاه (بالای صفحه) — فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.coursesIntroText || ''} onCommit={(v: string) => up('coursesIntroText', v)} placeholder="متن سئوی کوتاه صفحه دوره‌ها به فارسی..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن کوتاه (بالای صفحه) — انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.coursesIntroTextEn || ''} onCommit={(v: string) => up('coursesIntroTextEn', v)} placeholder="Short SEO text for Courses page in English..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن کامل (پایین صفحه، بین FAQ و ارتباط) — فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.coursesSeoFullText || ''} onCommit={(v: string) => up('coursesSeoFullText', v)} placeholder="متن سئوی کامل پایین صفحه دوره‌ها به فارسی..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن کامل (پایین صفحه) — انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.coursesSeoFullTextEn || ''} onCommit={(v: string) => up('coursesSeoFullTextEn', v)} placeholder="Full SEO text for bottom of Courses page in English..." rows={3} />
        </details>
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, color: T.ttl }}>تجربه والدین</summary>
          <label style={{ ...S.lbl, marginTop: 8 }}>متن فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.experienceIntroText || ''} onCommit={(v: string) => up('experienceIntroText', v)} placeholder="متن سئوی صفحه تجربه والدین به فارسی..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.experienceIntroTextEn || ''} onCommit={(v: string) => up('experienceIntroTextEn', v)} placeholder="Parents' experience page SEO text in English..." rows={3} />
        </details>
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, color: T.ttl }}>آموزش‌ها</summary>
          <label style={{ ...S.lbl, marginTop: 8 }}>متن فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.educationIntroText || ''} onCommit={(v: string) => up('educationIntroText', v)} placeholder="متن سئوی صفحه آموزش‌ها به فارسی..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.educationIntroTextEn || ''} onCommit={(v: string) => up('educationIntroTextEn', v)} placeholder="Tutorials page SEO text in English..." rows={3} />
        </details>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, color: T.ttl }}>درباره ما</summary>
          <label style={{ ...S.lbl, marginTop: 8 }}>متن فارسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.aboutIntroText || ''} onCommit={(v: string) => up('aboutIntroText', v)} placeholder="متن سئوی صفحه درباره ما به فارسی..." rows={3} />
          <label style={{ ...S.lbl, marginTop: 8 }}>متن انگلیسی</label><StableAdminTextarea style={S.ta} defaultValue={draft.aboutIntroTextEn || ''} onCommit={(v: string) => up('aboutIntroTextEn', v)} placeholder="About page SEO text in English..." rows={3} />
        </details>
      </Box>
      <DailyTipsBox T={T} S={S} AdminBtn={AdminBtn} Box={Box} list={draft.dailyTips || []} setList={(arr: any[]) => up('dailyTips', arr)} uid={uid} />
      <Box title="مدیریت کلیدهای ترجمه (fa / en)">
        {(['fa', 'en'] as const).map((l) => (
          <details key={l} style={{ marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{l === 'fa' ? 'فارسی' : 'English'} ({Object.keys(draft.translations?.[l] || {}).length} کلید)</summary>
            {Object.keys(draft.translations?.[l] || {}).sort().map((k) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <label style={{ fontSize: 11, color: T.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k}>{k}</label>
                <input style={S.inp} defaultValue={draft.translations?.[l]?.[k] || ''} onBlur={(e) => upNested(['translations', l, k], e.target.value)} />
              </div>
            ))}
          </details>
        ))}
      </Box>
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {thTab('secondary', 'تنظیمات پروژه ثانویه (فرم مشاوره)')}
        {thTab('primary', 'تنظیمات پروژه اصلی (دوره‌ها + پنل)')}
        {thTab('layout', 'چیدمان صفحه اصلی و منوی همبرگری')}
        {thTab('translations', 'مدیریت متن‌ها و ترجمه‌ها')}
      </div>
      {subTab === 'secondary' && SecondaryTab}
      {subTab === 'primary' && PrimaryTab}
      {subTab === 'layout' && LayoutTab}
      {subTab === 'translations' && TranslationsTab}
      <button type="button" style={S.btn} onClick={() => setSave(draft)}>ذخیره تغییرات</button>
    </div>
  );
}

// نکات روزانه — کامپوننت کوچک با state محلی (رندر مستقل)
function DailyTipsBox(props: any) {
  const { T, S, AdminBtn, Box, list, setList, uid } = props;
  return (
    <Box title="مدیریت نکات روزانه (Daily Tips)">
      {list.map((tip: any, i: number) => (
        <div key={tip.id || i} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <textarea style={S.ta} rows={2} defaultValue={tip.fa || ''} onBlur={(e) => { const a = [...list]; a[i] = { ...a[i], fa: e.target.value }; setList(a); }} placeholder="نکته (فارسی)" />
            <textarea style={S.ta} rows={2} dir="ltr" defaultValue={tip.en || ''} onBlur={(e) => { const a = [...list]; a[i] = { ...a[i], en: e.target.value }; setList(a); }} placeholder="Tip (English)" />
          </div>
          <button type="button" style={{ ...AdminBtn(), color: T.err, marginTop: 6 }} onClick={() => setList(list.filter((_: any, j: number) => j !== i))}>حذف نکته</button>
        </div>
      ))}
      <button type="button" style={AdminBtn()} onClick={() => setList([...list, { id: 't' + uid(), fa: 'نکته جدید', en: 'New tip' }])}>افزودن نکته روزانه</button>
    </Box>
  );
}
