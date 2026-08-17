// مدیر مشاورین و لینک‌های ارجاع — کارت اختصاصی در پنل مدیریت
// هر مشاور یک تب دارد؛ درون تب هر مشاور: اطلاعات مشاور (بدون تب) + لینک ارجاع (بدون تب، همیشه باز) +
// تب «عکس مشاور» (پیش‌فرض بسته) + تب «اطلاعات بانکی و کیف پول» (پیش‌فرض بسته).
import React, { useState } from 'react';
import { makeReferralCode, suggestTabShortCode } from '../utils/referral';
import { ZkPlusIcon, ZkArrowUpIcon, ZkArrowDownIcon, ZkCloseIcon } from './adminIcons';

const Checklist = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
  </label>
);

// تب فرعی درون کارت هر مشاور
function SubTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 34, padding: '7px 14px', borderRadius: 999, border: `1px solid ${active ? 'var(--zk-primary, #0F766E)' : 'var(--zk-border)'}`,
        background: active ? 'var(--zk-primary-light, rgba(15,118,110,.12))' : 'transparent', color: active ? 'var(--zk-primary, #0F766E)' : 'var(--zk-text-muted)',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800,
      }}
    >
      {label}
    </button>
  );
}

export default function ConsultantsEditor(props: any) {
  const { T, S, editCfg, setEditCfg, setSave, uid, fileToData, deleteStoredImage, AdminBtn, Box } = props;
  const draft: any = editCfg || {};
  const consultants: any[] = draft.consultants || [];
  const referral = draft.referral || {};

  // تب فعال مشاور
  const [activeIdx, setActiveIdx] = useState(0);
  const [photoOpen, setPhotoOpen] = useState<Record<string, boolean>>({});
  const [bankOpen, setBankOpen] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = React.useRef<any>(0);

  const buildReferralLink = (code: string) => `${window.location.origin}/${code.trim()}`;
  // به‌روزرسانی مخفف تب (shortCode) - با ذخیره در courseTabs
  const setTabShortCode = (tabId: string, code: string) => {
    const tabs = Array.isArray(draft.courseTabs) ? draft.courseTabs : [];
    const v = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
    const next = tabs.map((t: any) => t.id === tabId ? { ...t, shortCode: v } : t);
    setEditCfg({ ...draft, courseTabs: next });
  };

  const copyReferralLink = (code: string) => {
    const link = buildReferralLink(code);
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link);
      else {
        const ta = document.createElement('textarea');
        ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
    } catch {}
    setCopiedId(code);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const setConsultants = (arr: any[]) => setEditCfg({ ...draft, consultants: arr });
  const chg = (i: number, k: string, v: any) => { const a = [...consultants]; a[i] = { ...a[i], [k]: v }; setConsultants(a); };
  const move = (i: number, dir: -1 | 1) => { const a = [...consultants]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setConsultants(a); };
  const add = () => { const a = [...consultants, { id: 'cons' + uid(), name: '', nameEn: '', title: '', titleEn: '', desc: '', descEn: '', photoUrl: '', aboutPhotoUrl: '', useAboutPhoto: false, showPhoto: true, active: true, referralCode: '' }]; setConsultants(a); setActiveIdx(a.length - 1); };
  const remove = (i: number) => { const a = [...consultants]; const removed = a[i]; if (removed?.photoUrl && !removed.aboutPhotoUrl) { try { deleteStoredImage(removed.photoUrl); } catch {} } const next = a.filter((_: any, j: number) => j !== i); setConsultants(next); setActiveIdx(Math.max(0, Math.min(activeIdx, next.length - 1))); };
  const setReferral = (patch: any) => setEditCfg({ ...draft, referral: { ...referral, ...patch } });
  const setReferralText = (k: string, v: string) => setReferral({ texts: { ...((referral.texts) || {}), [k]: v } });
  const toggleSubTab = (key: 'photo' | 'bank', id: string) => {
    if (key === 'photo') setPhotoOpen((m) => ({ ...m, [id]: !m[id] }));
    else setBankOpen((m) => ({ ...m, [id]: !m[id] }));
  };

  const active = consultants[activeIdx];

  return (
    <Box title="مشاورین و لینک‌های ارجاع">
      <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>
        برای هر مشاور یک لینک ارجاع اختصاصی و کوتاه بسازید. نام انگلیسی مشاور برای ساخت کد الزامی است؛ کد به‌صورت خودکار از ۲ حرف اولِ نام انگلیسی ساخته می‌شود و قابل تغییر است. وقتی مخاطب از این لینک وارد سایت شود، کارت مشاور در صفحهٔ هوم نمایش داده می‌شود و اطلاعات بانکی/کیف پول همان مشاور در مرحلهٔ پرداخت در نظر گرفته می‌شود.
      </p>
      <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: '#FEF3C7', border: '1px solid #F59E0B55', fontSize: 11.5, color: '#713F12', lineHeight: 1.8 }}>
        مدیریت کامل مشاورین، لینک‌های ارجاع، اطلاعات بانکی/کیف پول و عکس هر مشاور دقیقاً از همین بخش («مشاورین و لینک‌های ارجاع») انجام می‌شود. عکس هر مشاور را از تب «عکس مشاور» آپلود کنید.
      </div>

      {/* تنظیمات سراسری ارجاع */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, padding: 10, background: T.soft, borderRadius: 10 }}>
        <Checklist label="نمایش انتخاب مشاور در روند ثبت‌نام" value={referral.showConsultantSelection === true} onChange={(v) => setReferral({ showConsultantSelection: v })} />
        <Checklist label="نمایش دکمه‌های CTA صفحهٔ اصلی" value={referral.home?.showCta !== false} onChange={(v) => setReferral({ home: { ...(referral.home || {}), showCta: v } })} />
      </div>

      {/* ── متن‌های راهنمای قابل ویرایش در حالت لینک ارجاع ── */}
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: T.soft, border: `1px solid ${T.brd}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: T.ttl, marginBottom: 4 }}>متن‌های راهنمای قابل ویرایش (در حالت لینک ارجاع)</div>
        <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>هر کدام از این متن‌ها در صفحه‌ای که مشخص شده، وقتی مخاطب با لینک ارجاع وارد می‌شود نمایش داده می‌شود. اگر خالی باشد، متن پیش‌فرض سایت استفاده می‌شود.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={S.lbl}>پیام راهنما در صفحهٔ هوم (لینک پایه — فقط کد مشاور)</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.homeBase || ''} onBlur={(e) => setReferralText('homeBase', e.target.value)} /></div>
          <div><label style={S.lbl}>پیام راهنما در صفحهٔ هوم (لینک تب دوره)</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.homeTab || ''} onBlur={(e) => setReferralText('homeTab', e.target.value)} /></div>
          <div><label style={S.lbl}>پیام راهنما در صفحهٔ هوم (لینک دورهٔ مشخص)</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.homeCourse || ''} onBlur={(e) => setReferralText('homeCourse', e.target.value)} /></div>
          <div><label style={S.lbl}>پیام راهنما در صفحهٔ معرفی دوره‌ها (لینک تب دوره)</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.coursesTab || ''} onBlur={(e) => setReferralText('coursesTab', e.target.value)} /></div>
          <div><label style={S.lbl}>پیام راهنما در صفحهٔ معرفی دوره‌ها (لینک دورهٔ مشخص)</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.coursesCourse || ''} onBlur={(e) => setReferralText('coursesCourse', e.target.value)} /></div>
          <div><label style={S.lbl}>متن پیام پاپ‌آپ «درخواست مشاورهٔ مجدد»</label><textarea style={S.ta} rows={2} defaultValue={referral.texts?.popupTitle || ''} onBlur={(e) => setReferralText('popupTitle', e.target.value)} /></div>
          <div><label style={S.lbl}>عنوان دکمهٔ اصلی پاپ‌آپ (لینک پایه)</label><input style={S.inp} defaultValue={referral.texts?.popupPrimaryBase || ''} onBlur={(e) => setReferralText('popupPrimaryBase', e.target.value)} /></div>
          <div><label style={S.lbl}>عنوان دکمهٔ اصلی پاپ‌آپ (لینک تب دوره)</label><input style={S.inp} defaultValue={referral.texts?.popupPrimaryTab || ''} onBlur={(e) => setReferralText('popupPrimaryTab', e.target.value)} /></div>
          <div><label style={S.lbl}>عنوان دکمهٔ اصلی پاپ‌آپ (لینک دورهٔ مشخص)</label><input style={S.inp} defaultValue={referral.texts?.popupPrimaryCourse || ''} onBlur={(e) => setReferralText('popupPrimaryCourse', e.target.value)} /></div>
          <div><label style={S.lbl}>عنوان دکمهٔ «مجدداً درخواست مشاوره دارم»</label><input style={S.inp} defaultValue={referral.texts?.reconsultLabel || ''} onBlur={(e) => setReferralText('reconsultLabel', e.target.value)} /></div>
          <div><label style={S.lbl}>سؤال «به چه دلیلی مجدداً درخواست مشاوره دارید؟»</label><input style={S.inp} defaultValue={referral.texts?.reconsultQuestion || ''} onBlur={(e) => setReferralText('reconsultQuestion', e.target.value)} /></div>
        </div>
      </div>

      {consultants.length === 0 && <p style={{ fontSize: 12, color: T.mut }}>هنوز مشاوری ثبت نشده است. دکمهٔ «افزودن مشاور» را بزنید.</p>}

      {/* تب‌های مشاورین */}
      {consultants.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {consultants.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              style={{
                minHeight: 38, padding: '7px 14px', borderRadius: 999, border: `1px solid ${activeIdx === i ? 'var(--zk-primary, #0F766E)' : 'var(--zk-border)'}`,
                background: activeIdx === i ? 'var(--zk-primary-light, rgba(15,118,110,.12))' : 'transparent', color: activeIdx === i ? 'var(--zk-primary, #0F766E)' : 'var(--zk-text)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800,
              }}
            >
              {c.name || `مشاور ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* کارت مشاور فعال — key برای remount کامل با تغییر مشاور (رفع باگ نمایش اطلاعات مشاور قبلی) */}
      {active && (
        <div key={active.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 14, padding: 14, marginBottom: 12, background: T.badge }}>
          {/* اطلاعات مشاور — بدون تب، همیشه باز */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <b style={{ color: T.ttl, fontSize: 14 }}>{active.name || 'بدون نام'}</b>
            <Checklist label="فعال" value={active.active !== false} onChange={(v) => chg(activeIdx, 'active', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={S.lbl}>نام (فارسی) *</label><input style={S.inp} defaultValue={active.name || ''} onBlur={(e) => chg(activeIdx, 'name', e.target.value.trim())} /></div>
            <div><label style={S.lbl}>Name (English) *</label><input dir="ltr" style={S.inp} defaultValue={active.nameEn || ''} onBlur={(e) => chg(activeIdx, 'nameEn', e.target.value.trim())} placeholder="مثلاً Ali" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div><label style={S.lbl}>سمت (فارسی)</label><input style={S.inp} defaultValue={active.title || ''} onBlur={(e) => chg(activeIdx, 'title', e.target.value.trim())} /></div>
            <div><label style={S.lbl}>Role (English)</label><input dir="ltr" style={S.inp} defaultValue={active.titleEn || ''} onBlur={(e) => chg(activeIdx, 'titleEn', e.target.value.trim())} /></div>
          </div>
          <div style={{ marginTop: 8 }}><label style={S.lbl}>توضیحات (فارسی)</label><textarea style={S.ta} rows={2} defaultValue={active.desc || ''} onBlur={(e) => chg(activeIdx, 'desc', e.target.value)} /></div>
          <div style={{ marginTop: 8 }}><label style={S.lbl}>Description (English)</label><textarea dir="ltr" style={S.ta} rows={2} defaultValue={active.descEn || ''} onBlur={(e) => chg(activeIdx, 'descEn', e.target.value)} /></div>
          <div style={{ marginTop: 8 }}><label style={S.lbl}>متن معرفی در کادر مشاور (اختیاری — اگر خالی باشد از «توضیحات» استفاده می‌شود)</label><textarea style={S.ta} rows={3} defaultValue={active.introText || ''} onBlur={(e) => chg(activeIdx, 'introText', e.target.value)} placeholder="این متن بلندتر در کارت مشاور (هوم و صفحه دوره‌ها) نمایش داده می‌شود؛ مثل: خوشحالیم که با شما همراهیم؛ من مهناز مرسلی هستم و ..." /></div>

          {/* لینک ارجاع — بدون تب، همراه با اطلاعات باز می‌شود */}
          <div style={{ marginTop: 12, padding: '9px 11px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}` }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>لینک ارجاع اختصاصی</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={S.lbl}>کد لینک (کوتاه، یکتا)</label>
                <input dir="ltr" style={{ ...S.inp, fontFamily: 'monospace' }} defaultValue={active.referralCode || ''} onBlur={(e) => chg(activeIdx, 'referralCode', e.target.value.trim().toLowerCase())} placeholder="مثلاً ali" />
              </div>
              <button type="button" style={{ ...AdminBtn(), padding: '8px 12px' }} onClick={() => chg(activeIdx, 'referralCode', makeReferralCode(active.nameEn))}>ساخت خودکار</button>
            </div>
            {!active.nameEn && <div style={{ fontSize: 10.5, color: T.warn || '#B45309', marginTop: 5 }}>نام انگلیسی را پر کنید تا کد لینک ساخته شود.</div>}
            {active.referralCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <code dir="ltr" style={{ flex: 1, fontSize: 11.5, color: T.mut, background: T.badge, border: `1px solid ${T.brd}`, borderRadius: 8, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{buildReferralLink(active.referralCode)}</code>
                <button
                  type="button"
                  onClick={() => copyReferralLink(active.referralCode)}
                  aria-label="کپی لینک"
                  title="کپی لینک"
                  style={{ flexShrink: 0, minHeight: 34, padding: '0 12px', borderRadius: 9, border: `1px solid ${copiedId === active.referralCode ? '#16A34A' : T.brd}`, background: copiedId === active.referralCode ? '#16A34A' : T.soft, color: copiedId === active.referralCode ? '#fff' : T.acc, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, transition: 'all .2s ease', animation: copiedId === active.referralCode ? 'zk-copy-pop .3s ease' : undefined }}
                >
                  {copiedId === active.referralCode ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      کپی شد
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      کپی
                    </>
                  )}
                </button>
              </div>
            )}
            <style>{`@keyframes zk-copy-pop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
          </div>

          {/* تب‌های فرعی: عکس | بانک */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <SubTab active={!!photoOpen[active.id]} onClick={() => toggleSubTab('photo', active.id)} label="عکس مشاور" />
            <SubTab active={!!bankOpen[active.id]} onClick={() => toggleSubTab('bank', active.id)} label="اطلاعات بانکی و کیف پول" />
          </div>

          {/* تب عکس (پیش‌فرض بسته) */}
          {photoOpen[active.id] && (
            <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}`, animation: 'fadeSlide .25s ease both' }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>عکس مشاور</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Checklist label="نمایش عکس در اطلاعات مشاور" value={active.showPhoto !== false} onChange={(v) => chg(activeIdx, 'showPhoto', v)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async (e) => { const f = e.target.files?.[0]; if (f) chg(activeIdx, 'photoUrl', await fileToData(f, active.photoUrl, 'consultants')); }} />
                {active.photoUrl && <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={async () => { await deleteStoredImage(active.photoUrl); chg(activeIdx, 'photoUrl', ''); }}>حذف</button>}
              </div>
              {active.photoUrl && <img src={active.photoUrl} alt="consultant" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${T.brd}`, marginTop: 6 }} />}
            </div>
          )}

          {/* تب بانک و کیف پول (پیش‌فرض بسته) — ۳ حساب بانکی + ۲ کیف پول رمزارز */}
          {bankOpen[active.id] && (
            <div style={{ marginTop: 10, padding: '11px 12px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}`, animation: 'fadeSlide .25s ease both' }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>اطلاعات بانکی و کیف پول (نمایش در پرداخت)</div>

              {/* ۳ حساب بانکی */}
              <div style={{ fontWeight: 700, fontSize: 12, color: T.ttl, margin: '8px 0 6px' }}>حساب‌های بانکی (حداکثر ۳)</div>
              {(active.banks && active.banks.length ? active.banks : [{}]).slice(0, 3).map((bk: any, bi: number) => (
                <div key={bi} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 9, marginBottom: 8, background: T.badge }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 11.5, color: T.mut }}>حساب {bi + 1}</b>
                    <button type="button" style={{ ...AdminBtn(), marginLeft: 'auto', padding: '4px 10px', color: T.err }} onClick={() => { const arr = (active.banks || []).filter((_: any, j: number) => j !== bi); chg(activeIdx, 'banks', arr); }}>حذف</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={S.lbl}>نام بانک</label><input style={S.inp} defaultValue={bk.name || ''} onBlur={(e) => { const arr = (active.banks || []).length ? [...active.banks] : [{}]; arr[bi] = { ...(arr[bi] || {}), name: e.target.value }; chg(activeIdx, 'banks', arr); }} /></div>
                    <div><label style={S.lbl}>نام صاحب کارت/حساب</label><input style={S.inp} defaultValue={bk.holder || bk.accountName || ''} onBlur={(e) => { const arr = (active.banks || []).length ? [...active.banks] : [{}]; arr[bi] = { ...(arr[bi] || {}), holder: e.target.value }; chg(activeIdx, 'banks', arr); }} placeholder="مثلاً مهناز مرسلی" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div><label style={S.lbl}>شماره کارت</label><input dir="ltr" style={S.inp} defaultValue={bk.card || ''} onBlur={(e) => { const arr = (active.banks || []).length ? [...active.banks] : [{}]; arr[bi] = { ...(arr[bi] || {}), card: e.target.value }; chg(activeIdx, 'banks', arr); }} /></div>
                    <div><label style={S.lbl}>شماره شبا (IR…)</label><input dir="ltr" style={S.inp} defaultValue={bk.iban || ''} onBlur={(e) => { const arr = (active.banks || []).length ? [...active.banks] : [{}]; arr[bi] = { ...(arr[bi] || {}), iban: e.target.value }; chg(activeIdx, 'banks', arr); }} /></div>
                  </div>
                </div>
              ))}
              {(!active.banks || active.banks.length < 3) && (
                <button type="button" style={{ ...AdminBtn(), padding: '6px 12px' }} onClick={() => { const arr = (active.banks || []).length ? [...active.banks, {}] : [{}]; chg(activeIdx, 'banks', arr); }}>+ افزودن حساب بانکی</button>
              )}

              {/* ۲ کیف پول رمزارز */}
              <div style={{ fontWeight: 700, fontSize: 12, color: T.ttl, margin: '14px 0 6px' }}>کیف پول‌های رمزارز (حداکثر ۲)</div>
              {(active.wallets && active.wallets.length ? active.wallets : [{}]).slice(0, 2).map((w: any, wi: number) => (
                <div key={wi} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 9, marginBottom: 8, background: T.badge }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 11.5, color: T.mut }}>کیف پول {wi + 1}</b>
                    <button type="button" style={{ ...AdminBtn(), marginLeft: 'auto', padding: '4px 10px', color: T.err }} onClick={() => { const arr = (active.wallets || []).filter((_: any, j: number) => j !== wi); chg(activeIdx, 'wallets', arr); }}>حذف</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={S.lbl}>نام کیف پول رمزارز</label><input style={S.inp} defaultValue={w.name || ''} onBlur={(e) => { const arr = (active.wallets || []).length ? [...active.wallets] : [{}]; arr[wi] = { ...(arr[wi] || {}), name: e.target.value }; chg(activeIdx, 'wallets', arr); }} /></div>
                    <div><label style={S.lbl}>نماد (مثلاً USDT)</label><input dir="ltr" style={S.inp} defaultValue={w.symbol || ''} onBlur={(e) => { const arr = (active.wallets || []).length ? [...active.wallets] : [{}]; arr[wi] = { ...(arr[wi] || {}), symbol: e.target.value }; chg(activeIdx, 'wallets', arr); }} /></div>
                  </div>
                  <div style={{ marginTop: 8 }}><label style={S.lbl}>آدرس کیف پول</label><input dir="ltr" style={S.inp} defaultValue={w.address || ''} onBlur={(e) => { const arr = (active.wallets || []).length ? [...active.wallets] : [{}]; arr[wi] = { ...(arr[wi] || {}), address: e.target.value }; chg(activeIdx, 'wallets', arr); }} /></div>
                </div>
              ))}
              {(!active.wallets || active.wallets.length < 2) && (
                <button type="button" style={{ ...AdminBtn(), padding: '6px 12px' }} onClick={() => { const arr = (active.wallets || []).length ? [...active.wallets, {}] : [{}]; chg(activeIdx, 'wallets', arr); }}>+ افزودن کیف پول رمزارز</button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={activeIdx === 0} onClick={() => { const j = activeIdx - 1; const a = [...consultants]; [a[activeIdx], a[j]] = [a[j], a[activeIdx]]; setConsultants(a); setActiveIdx(j); }}><ZkArrowUpIcon size={13} /></button>
            <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={activeIdx === consultants.length - 1} onClick={() => { const j = activeIdx + 1; const a = [...consultants]; [a[activeIdx], a[j]] = [a[j], a[activeIdx]]; setConsultants(a); setActiveIdx(j); }}><ZkArrowDownIcon size={13} /></button>
            <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => remove(activeIdx)}>حذف</button>
          </div>
        </div>
      )}

      <button type="button" style={AdminBtn()} onClick={add}><ZkPlusIcon size={13} /> افزودن مشاور</button>

      {/* راهنمای لینک‌های گسترش‌یافته (نقشه راه) */}
      <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'rgba(15,118,110,0.06)', border: '1px solid var(--zk-border, #E5E0D8)' }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--zk-text, #1F2937)', marginBottom: 6 }}>راهنمای لینک‌های ارجاع گسترش‌یافته (نقشه راه)</div>
        <p style={{ fontSize: 11.5, color: 'var(--zk-text-muted, #6B7280)', lineHeight: 1.9, margin: '0 0 8px' }}>
          هر مشاور می‌تواند با اضافه‌کردن حروف/اعداد به انتهای لینک پایه، کاربر را مستقیماً به یک تب یا یک دوره خاص ببرد.
        </p>
        <ul style={{ fontSize: 11.5, color: 'var(--zk-text-muted, #6B7280)', lineHeight: 1.9, margin: '0 0 10px', paddingInlineStart: 18 }}>
          <li><b>لینک پایه</b> (مثال <code>/{active?.referralCode || 'code'}</code>): فقط صفحه اصلی + پیام راهنما.</li>
          <li><b>لینک تب</b> (مثال <code>/{active?.referralCode || 'code'}<span style={{color:'#0F766E'}}>t</span></code>): دکمه‌ها به «مشاهده دوره‌های آن تب» تغییر می‌کنند و تب مربوطه باز می‌شود.</li>
          <li><b>لینک دورهٔ مستقیم</b> (مثال <code>/{active?.referralCode || 'code'}<span style={{color:'#0F766E'}}>t1</span></code>): دکمه‌ها به «ثبت آن دوره» تغییر می‌کنند و کلیک روی آن مستقیماً روند ثبت‌نام را شروع می‌کند.</li>
        </ul>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--zk-text, #1F2937)', marginBottom: 6 }}>مخفف هر تب (قابل ویرایش):</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {(draft.courseTabs || []).filter((t: any) => t.active !== false).map((t: any) => {
            const sc = String(t.shortCode || suggestTabShortCode(t, draft.courseTabs || [])).toLowerCase();
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--zk-surface, #fff)', border: '1px solid var(--zk-border, #E5E0D8)', borderRadius: 10, padding: 8 }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--zk-text, #1F2937)' }}>{t.title}</div>
                <code dir="ltr" style={{ fontSize: 11, color: '#0F766E', background: 'rgba(15,118,110,.08)', padding: '3px 8px', borderRadius: 6 }}>/{active?.referralCode || 'code'}{sc}</code>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={4}
                  defaultValue={sc}
                  onBlur={(e) => setTabShortCode(t.id, e.target.value)}
                  style={{ width: 56, minHeight: 34, padding: '6px 8px', border: '1px solid var(--zk-border, #E5E0D8)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, textAlign: 'center' }}
                />
                <span style={{ fontSize: 10, color: 'var(--zk-text-muted, #6B7280)' }}>
                  {(t.courses || []).filter((c: any) => c.active !== false).length > 0
                    ? `۱-${(t.courses || []).filter((c: any) => c.active !== false).length} دوره`
                    : 'بدون دوره'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button type="button" style={S.btn} onClick={() => setSave(draft)}>ذخیره تغییرات</button>
      </div>
    </Box>
  );
}
