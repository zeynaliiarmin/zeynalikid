// مدیر مشاورین و لینک‌های ارجاع — کارت اختصاصی در پنل مدیریت
// شامل: لیست مشاورین، کد لینک ارجاع (۳ حرفی از نام انگلیسی، قابل ویرایش)،
//       عکس (با استفاده مجدد از «درباره ما» یا آپلود جدا)، نمایش عکس،
//       اطلاعات بانکی و کیف پول اختصاصی، و کلید نمایش انتخاب مشاور در ثبت‌نام.
import React, { useState } from 'react';
import { makeReferralCode } from '../utils/referral';
import { ZkPlusIcon, ZkArrowUpIcon, ZkArrowDownIcon } from './adminIcons';

const Checklist = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
  </label>
);

export default function ConsultantsEditor(props: any) {
  const { T, S, editCfg, setEditCfg, setSave, uid, fileToData, deleteStoredImage, AdminBtn, Box } = props;
  const draft: any = editCfg || {};
  const consultants: any[] = draft.consultants || [];
  const referral = draft.referral || {};

  const setConsultants = (arr: any[]) => setEditCfg({ ...draft, consultants: arr });
  const chg = (i: number, k: string, v: any) => { const a = [...consultants]; a[i] = { ...a[i], [k]: v }; setConsultants(a); };
  const move = (i: number, dir: -1 | 1) => { const a = [...consultants]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setConsultants(a); };
  const add = () => setConsultants([...consultants, { id: 'cons' + uid(), name: '', nameEn: '', title: '', titleEn: '', desc: '', descEn: '', photoUrl: '', aboutPhotoUrl: '', useAboutPhoto: false, showPhoto: true, active: true, referralCode: '' }]);
  const remove = (i: number) => { const a = [...consultants]; const removed = a[i]; if (removed?.photoUrl && !removed.aboutPhotoUrl) { try { deleteStoredImage(removed.photoUrl); } catch {} } setConsultants(a.filter((_: any, j: number) => j !== i)); };
  const setReferral = (patch: any) => setEditCfg({ ...draft, referral: { ...referral, ...patch } });

  const showPhotoToggle = (i: number) => {
    const c = consultants[i];
    const a = [...consultants];
    // اگر «استفاده از عکس دربارهٔ ما» فعال شود، عکس از aboutPhotoUrl می‌آید؛ در غیر این صورت photoUrl جدا
    a[i] = { ...c, useAboutPhoto: !c.useAboutPhoto };
    setConsultants(a);
  };

  return (
    <Box title="مشاورین و لینک‌های ارجاع">
      <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>
        برای هر مشاور یک لینک ارجاع اختصاصی و کوتاه بسازید. نام انگلیسی مشاور برای ساخت کد الزامی است؛ کد از ۳ حرف اولِ نام انگلیسی ساخته می‌شود و قابل تغییر است. وقتی مخاطب از این لینک وارد سایت شود، کارت مشاور در صفحهٔ هوم نمایش داده می‌شود و اطلاعات بانکی/کیف پول همان مشاور در مرحلهٔ پرداخت در نظر گرفته می‌شود.
      </p>

      {/* تنظیمات سراسری ارجاع */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, padding: 10, background: T.soft, borderRadius: 10 }}>
        <Checklist label="نمایش انتخاب مشاور در روند ثبت‌نام" value={referral.showConsultantSelection === true} onChange={(v) => setReferral({ showConsultantSelection: v })} />
        <Checklist label="نمایش دکمه‌های CTA صفحهٔ اصلی" value={referral.home?.showCta !== false} onChange={(v) => setReferral({ home: { ...(referral.home || {}), showCta: v } })} />
      </div>

      {consultants.length === 0 && <p style={{ fontSize: 12, color: T.mut }}>هنوز مشاوری ثبت نشده است. دکمهٔ «افزودن مشاور» را بزنید.</p>}

      {consultants.map((c: any, i: number) => (
        <div key={c.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 12, marginBottom: 12, background: T.badge }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <b style={{ color: T.ttl, fontSize: 13 }}>{i + 1}. {c.name || 'بدون نام'}</b>
            <Checklist label="فعال" value={c.active !== false} onChange={(v) => chg(i, 'active', v)} />
          </div>

          {/* نام (فارسی + انگلیسی الزامی) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={S.lbl}>نام (فارسی) *</label><input style={S.inp} defaultValue={c.name || ''} onBlur={(e) => chg(i, 'name', e.target.value.trim())} /></div>
            <div><label style={S.lbl}>Name (English) *</label><input dir="ltr" style={S.inp} defaultValue={c.nameEn || ''} onBlur={(e) => chg(i, 'nameEn', e.target.value.trim())} placeholder="مثلاً Ali" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div><label style={S.lbl}>سمت (فارسی)</label><input style={S.inp} defaultValue={c.title || ''} onBlur={(e) => chg(i, 'title', e.target.value.trim())} /></div>
            <div><label style={S.lbl}>Role (English)</label><input dir="ltr" style={S.inp} defaultValue={c.titleEn || ''} onBlur={(e) => chg(i, 'titleEn', e.target.value.trim())} /></div>
          </div>
          <div style={{ marginTop: 8 }}><label style={S.lbl}>توضیحات (فارسی)</label><textarea style={S.ta} rows={2} defaultValue={c.desc || ''} onBlur={(e) => chg(i, 'desc', e.target.value)} /></div>
          <div style={{ marginTop: 8 }}><label style={S.lbl}>Description (English)</label><textarea dir="ltr" style={S.ta} rows={2} defaultValue={c.descEn || ''} onBlur={(e) => chg(i, 'descEn', e.target.value)} /></div>

          {/* عکس */}
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}` }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>عکس مشاور</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Checklist label="استفاده از عکس «درباره ما» (بدون آپلود دوباره)" value={c.useAboutPhoto === true} onChange={() => showPhotoToggle(i)} />
              <Checklist label="نمایش عکس در اطلاعات مشاور" value={c.showPhoto !== false} onChange={(v) => chg(i, 'showPhoto', v)} />
            </div>
            {c.useAboutPhoto ? (
              <div style={{ marginTop: 6, fontSize: 11, color: T.mut }}>عکس از «درباره ما» استفاده می‌شود. برای انتخاب، به کارت مشاورین در تنظیمات-درباره ما مراجعه کنید.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async (e) => { const f = e.target.files?.[0]; if (f) chg(i, 'photoUrl', await fileToData(f, c.photoUrl, 'consultants')); }} />
                  {c.photoUrl && <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={async () => { await deleteStoredImage(c.photoUrl); chg(i, 'photoUrl', ''); }}>حذف</button>}
                </div>
                {c.photoUrl && <img src={c.photoUrl} alt="consultant" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${T.brd}`, marginTop: 6 }} />}
              </>
            )}
          </div>

          {/* لینک ارجاع */}
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}` }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>لینک ارجاع اختصاصی</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={S.lbl}>کد لینک (کوتاه، یکتا)</label>
                <input dir="ltr" style={{ ...S.inp, fontFamily: 'monospace' }} defaultValue={c.referralCode || ''} onBlur={(e) => chg(i, 'referralCode', e.target.value.trim().toLowerCase())} placeholder="مثلاً ali" />
              </div>
              <button type="button" style={{ ...AdminBtn(), padding: '8px 12px' }} onClick={() => chg(i, 'referralCode', makeReferralCode(c.nameEn))}>ساخت خودکار</button>
            </div>
            {!c.nameEn && <div style={{ fontSize: 10.5, color: T.warn || '#B45309', marginTop: 5 }}>نام انگلیسی را پر کنید تا کد لینک ساخته شود.</div>}
            {c.referralCode && <div style={{ fontSize: 10.5, color: T.mut, marginTop: 5 }} dir="ltr">لینک: {`${window.location.origin}/?ad=${c.referralCode}`}</div>}
          </div>

          {/* اطلاعات بانکی و کیف پول اختصاصی */}
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}` }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: T.ttl, marginBottom: 6 }}>اطلاعات بانکی و کیف پول (نمایش در پرداخت)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={S.lbl}>نام بانک</label><input style={S.inp} defaultValue={c.bank?.name || ''} onBlur={(e) => chg(i, 'bank', { ...(c.bank || {}), name: e.target.value }) } /></div>
              <div><label style={S.lbl}>شماره کارت</label><input dir="ltr" style={S.inp} defaultValue={c.bank?.card || ''} onBlur={(e) => chg(i, 'bank', { ...(c.bank || {}), card: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 8 }}><label style={S.lbl}>شماره شبا (IR…)</label><input dir="ltr" style={S.inp} defaultValue={c.bank?.iban || ''} onBlur={(e) => chg(i, 'bank', { ...(c.bank || {}), iban: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div><label style={S.lbl}>نام کیف پول رمزارز</label><input style={S.inp} defaultValue={c.wallet?.name || ''} onBlur={(e) => chg(i, 'wallet', { ...(c.wallet || {}), name: e.target.value })} /></div>
              <div><label style={S.lbl}>نماد (مثلاً USDT)</label><input dir="ltr" style={S.inp} defaultValue={c.wallet?.symbol || ''} onBlur={(e) => chg(i, 'wallet', { ...(c.wallet || {}), symbol: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 8 }}><label style={S.lbl}>آدرس کیف پول</label><input dir="ltr" style={S.inp} defaultValue={c.wallet?.address || ''} onBlur={(e) => chg(i, 'wallet', { ...(c.wallet || {}), address: e.target.value })} /></div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={i === 0} onClick={() => move(i, -1)}><ZkArrowUpIcon size={13} /></button>
            <button type="button" style={{ ...AdminBtn(), padding: '6px 10px' }} disabled={i === consultants.length - 1} onClick={() => move(i, 1)}><ZkArrowDownIcon size={13} /></button>
            <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => remove(i)}>حذف</button>
          </div>
        </div>
      ))}

      <button type="button" style={AdminBtn()} onClick={add}><ZkPlusIcon size={13} /> افزودن مشاور</button>
      <div style={{ marginTop: 14 }}>
        <button type="button" style={S.btn} onClick={() => setSave(draft)}>ذخیره تغییرات</button>
      </div>
    </Box>
  );
}
