// EntryModeSettings — تنظیمات «صفحهٔ ورودی سایت»: پیگیری دوره یا پنل کاربر
// فایل مستقل src/admin/* — ویرایش روی editCfg انجام و با دکمهٔ ذخیرهٔ پنل اعمال میشود
import { useState } from 'react';

const OTP_MODES = [
  { id: 'test', label: 'حالت تست (نمایش کد — تا خرید پنل پیامکی)' },
  { id: 'live', label: 'پیامک واقعی (پس از اتصال پنل پیامکی)' },
  { id: 'off', label: 'بدون کد تأیید' },
] as const;

const SMS_PROVIDERS = [
  { id: 'kavenegar', label: 'کاوهنگار (Kavenegar)' },
  { id: 'smsir', label: 'SMS.ir' },
  { id: 'melipayamak', label: 'ملیپیامک (Melipayamak)' },
] as const;

export default function EntryModeSettings({ app }: { app: any }) {
  const { T, lang, setEditCfg, cfg } = app;
  const en = lang === 'en';
  const ec = cfg || {};
  const up: any = ec.userPortal || {};
  const [smsKey, setSmsKey] = useState(String(up.smsApiKey || ''));
  const [smsSender, setSmsSender] = useState(String(up.smsSender || ''));

  const set = (patch: any) => setEditCfg({ ...ec, ...patch });
  const setUp = (patch: any) => set({ userPortal: { ...up, smsApiKey: smsKey, smsSender, ...patch } });
  const seg = (val: string, options: { id: string; label: string }[], onChange: (v: string) => void) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800,
            border: `1.5px solid ${val === o.id ? T.acc : T.brd}`, background: val === o.id ? T.soft : T.card, color: val === o.id ? T.acc : T.mut }}>{o.label}</button>
      ))}
    </div>
  );
  const row = (title: string, children: any, hint?: string) => (
    <div style={{ border: `1px solid ${T.brd}`, borderRadius: 13, padding: 12, marginBottom: 10, background: T.card }}>
      <b style={{ display: 'block', fontSize: 13, color: T.txt, marginBottom: 8 }}>{title}</b>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.mut, marginTop: 8, lineHeight: 1.9 }}>{hint}</div>}
    </div>
  );
  const inp: any = { background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, width: '100%', outline: 'none', marginBottom: 8 };

  return (
    <div>
      {row(
        en ? 'Public entry page' : 'صفحهٔ ورودی سایت',
        seg(String(ec.entryMode || 'track'), [
          { id: 'track', label: en ? 'Course tracking (guest, no login)' : 'پیگیری دوره (بدون ورود — حالت فعلی)' },
          { id: 'user', label: en ? 'User portal (login required)' : 'پنل کاربر (ثبتنام/ورود اجباری)' },
        ], (v) => set({ entryMode: v })),
        en ? 'Only one mode can be active. In user-portal mode, course registration and consultations require sign-in; entries stay in “Forms & orders” with the new view, split into consultation and course sections.'
          : 'فقط یکی از دو حالت میتواند فعال باشد. در حالت «پنل کاربر»، ثبت دوره و مشاوره بدون ورود ممکن نیست؛ ثبتها در همان بخش «فرم‌ها و سفارشات» با نمای جدید (دو بخش جدا از مشاوره و دوره) دیده میشوند.'
      )}

      {row(
        en ? 'Verification code (SMS OTP)' : 'کد تأیید پیامکی (OTP)',
        <>
          {seg(String(up.otpMode || 'test'), OTP_MODES.map((m) => ({ id: m.id, label: m.label })), (v) => setUp({ otpMode: v }))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, color: T.mut, fontWeight: 700, display: 'block', marginBottom: 4 }}>{en ? 'SMS provider' : 'پنل پیامکی'}</label>
              <select style={inp} value={String(up.smsProvider || 'kavenegar')} onChange={(e) => setUp({ smsProvider: e.target.value })}>
                {SMS_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: T.mut, fontWeight: 700, display: 'block', marginBottom: 4 }}>{en ? 'Sender / line number' : 'شمارهٔ خط ارسال'}</label>
              <input dir="ltr" style={inp} value={smsSender} onChange={(e) => { setSmsSender(e.target.value); setUp({ smsSender: e.target.value }); }} placeholder="10004346" />
            </div>
          </div>
          <label style={{ fontSize: 11.5, color: T.mut, fontWeight: 700, display: 'block', marginBottom: 4 }}>{en ? 'API key (stored in settings — never exposed publicly)' : 'کلید API (فقط در تنظیمات ذخیره میشود — هرگز به عموم نمیرسد)'}</label>
          <input dir="ltr" style={inp} type="password" value={smsKey} onChange={(e) => { setSmsKey(e.target.value); setUp({ smsApiKey: e.target.value }); }} placeholder="••••••••" />
        </>,
        en ? 'Until the SMS panel is connected, keep «Test mode»: the code is shown on screen. When you buy the panel, set provider + key and switch to live.'
          : 'تا پنل پیامکی نخریدهاید، «حالت تست» بماند (کد روی صفحه نمایش داده میشود). بعد از خرید، پنل + کلید را وارد و حالت را «پیامک واقعی» کنید.'
      )}

      {row(
        en ? 'CAPTCHA (anti-bot)' : 'کپچا (ضد ربات)',
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.txt, fontWeight: 700, cursor: 'pointer' }}>
          <input className="zkad-switch" type="checkbox" checked={up.captchaEnabled === true} onChange={(e) => setUp({ captchaEnabled: e.target.checked })} />
          {en ? 'Enable Cloudflare Turnstile on registration' : 'فعالسازی Cloudflare Turnstile در فرم ثبتنام'}
        </label>,
        en ? 'Recommended to turn ON when live SMS is enabled (bots would burn SMS credits). Requires TURNSTILE_SECRET on the Edge Function.'
          : 'پیشنهاد: همزمان با فعالسازی پیامک واقعی روشن شود (رباتها اعتبار پیامک را میسوزانند). نیازمند TURNSTILE_SECRET در Edge Function است.'
      )}

      {row(
        en ? 'Real-name rule (applies everywhere in the project)' : 'قانون نام واقعی (در همهجای پروژه)',
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: T.txt, fontWeight: 700 }}>{en ? 'Min letters (Persian):' : 'حداقل حروف نام فارسی:'}</span>
          {[3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setUp({ minNameWords: n })}
              style={{ width: 40, height: 40, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 900,
                border: `1.5px solid ${Number(up.minNameWords) === n ? T.acc : T.brd}`, background: Number(up.minNameWords) === n ? T.soft : T.card, color: Number(up.minNameWords) === n ? T.acc : T.mut }}>{n}</button>
          ))}
        </div>,
        en ? 'Min 3 letters for Persian names, min 2 for English (when the site language is English). Applies to registration, consultation form and shipping form. Letters only — no digits, no repeated words.'
          : 'فارسی حداقل ۳ حرف (مثل «علی») و وقتی زبان سایت انگلیسی است حداقل ۲ حرف لاتین. در ثبتنام پنل، فرم مشاوره و فرم ارسال دوره اعمال میشود؛ بدون رقم و تکرار کلمه.'
      )}
      <button type="button" style={{ ...(T.btn || {}), background: T.acc, color: T.card === '#fff' ? '#fff' : '#fff', border: 0, borderRadius: 10, padding: '12px 20px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
        onClick={() => setEditCfg({ ...ec, userPortal: { ...up, smsApiKey: smsKey, smsSender } })}>
        {en ? 'Apply (then press Save)' : 'اعمال تغییرات (سپس ذخیره)'}
      </button>
    </div>
  );
}
