// ============================================================================
// ContentManager — بازطراحی کامل «محتوا و صفحات» (رفع پرش صفحه / fg)
//
// مشکلات قبلی که این بازطراحی حل می‌کند:
//   1) هر keystroke کل settings را بازسازی می‌کرد → کل صفحه محتوا (چند صد
//      عنصر) هر بار re-render می‌شد → lag / fg
//   2) فیلدهای defaultValue بدون state محلی هنگام re-render مقدارشان
//      بازنویسی می‌شد → از دست رفتن متن / پرش فوکوس
//   3) همه‌چیز در یک تابع بزرگ وابسته به AdminPanel بود
//
// معماری جدید:
//   - state محلی برای هر بخش (فقط همان بخش re-render می‌شود)
//   - ذخیره‌سازی با دکمه (هر آیتم + «ذخیره همه») — نه خودکار در هر تایپ
//   - key پایدار (id) برای آیتم‌ها و <details>
//   - فیلدها با defaultValue + onBlur (بدون re-render هنگام تایپ)
// ============================================================================
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { getMediaDestinations, MEDIA_DESTINATIONS, migrateMediaItem, type MediaDestination } from '../utils/mediaPlacement';
import { canonicalizeMediaInput, extractDirectMediaUrl } from '../utils/mediaInput';

interface Props {
  T: any; S: any; AdminBtn: () => any; Box: any; Field: any;
  StableAdminInput: any; StableAdminTextarea: any;
  cfg: any; setSave: (next: any) => void | Promise<any>;
  fileToData: (f: File, oldUrl?: string, folder?: string) => Promise<string>;
  p2e: (v: string) => string;
  uid: () => number;
}

// تبدیل محتوای قدیمی آموزش‌ها (متن/عکس) به «مقاله» — بدون از دست دادن هیچ داده‌ای:
// متن → مقاله با همان body؛ عکس → مقاله که لینک تصویرش به آرایه images منتقل می‌شود.
function normalizeEduItem(item: any): any {
  const it = { ...item };
  if (it.type === 'text') {
    it.type = 'article';
    if (!Array.isArray(it.images)) it.images = [];
  } else if (it.type === 'image') {
    it.type = 'article';
    const imgUrl = extractDirectMediaUrl(it.externalCode || it.internalCode || it.imageUrl || it.url, 'image');
    if (!Array.isArray(it.images) || !it.images.length) {
      it.images = imgUrl ? [{ id: 'aimg0', url: imgUrl, position: 0 }] : [];
    }
  }
  if (!Array.isArray(it.images)) it.images = [];
  return it;
}

const MEDIA_CATEGORIES: [string, string][] = [
  ['education', 'آموزش‌ها'],
  ['parent-experience', 'تجربه والدین'],
  ['growth', 'رشد قد'],
  ['appetite', 'بی‌اشتهایی'],
  ['intelligence', 'هوش'],
];

// تبدیل ارقام فارسی/عربی به انگلیسی برای فیلد عددی «شمارش شروع بازدید»
const faToEn = (s: string) => String(s || '')
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function ContentManager(props: Props) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, cfg, setSave, fileToData, p2e, uid } = props;

  // ── state محلی: کپی از cfg — فقط با دکمه ذخیره به settings واقعی می‌رود ──
  const [customPlatforms, setCustomPlatforms] = useState<any[]>(() =>
    Array.isArray(cfg.customPlatforms) ? cfg.customPlatforms :
    (cfg.customPlatforms && typeof cfg.customPlatforms === 'object' ? Object.values(cfg.customPlatforms) : [])
  );
  const [mediaItems, setMediaItems] = useState<any[]>(() =>
    Array.isArray(cfg.mediaItems) ? cfg.mediaItems :
    (cfg.mediaItems && typeof cfg.mediaItems === 'object'
      ? [...(cfg.mediaItems.videos || []), ...(cfg.mediaItems.audios || []), ...(cfg.mediaItems.images || [])]
      : [])
  );
  const [expItems, setExpItems] = useState<any[]>(() => (cfg.experience?.items || []));
  const [eduItems, setEduItems] = useState<any[]>(() => (cfg.education?.items || []));
  const [expTabs, setExpTabs] = useState<any>(() => cfg.experienceTabs || {});
  const [mediaCountryMode, setMediaCountryMode] = useState<string>(() => cfg.mediaCountryMode || 'auto');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const latestDraftRef = useRef<any>(null);
  latestDraftRef.current = { cfg, customPlatforms, mediaItems, expItems, eduItems, expTabs, mediaCountryMode };

  // ── ذخیره همه بخش‌ها با یک دکمه ──
  // StableAdminInput/StableAdminTextarea intentionally keep drafts in the DOM until commit.
  // Before taking the snapshot, synchronously flush every mounted draft field and the active
  // native field. The ref then guarantees that save uses the newest render, not a stale closure.
  const saveAll = useCallback(async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const active = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
      // Ask every mounted draft field to commit its current DOM value. flushSync makes all
      // resulting local state updates visible in latestDraftRef before the snapshot is read.
      flushSync(() => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('zk-admin-flush-drafts'));
        if (active && typeof active.blur === 'function') active.blur();
      });
      // Let duplicate delayed blur commits finish; they contain the same values.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const draft = latestDraftRef.current;
      const next = {
        ...draft.cfg,
        customPlatforms: draft.customPlatforms,
        mediaItems: draft.mediaItems,
        experience: {
          ...(draft.cfg.experience || {}),
          items: draft.expItems.map((item: any) => migrateMediaItem(item, 'experience')),
        },
        education: {
          ...(draft.cfg.education || {}),
          items: draft.eduItems.map((item: any) => normalizeEduItem(migrateMediaItem(item, 'education'))),
        },
        experienceTabs: draft.expTabs,
        mediaCountryMode: draft.mediaCountryMode,
      };
      const saved = await setSave(next);
      if (saved === false) throw new Error('Settings save failed');
      setSaveStatus('saved');
    } catch (error) {
      console.error('Could not save content settings', error);
      setSaveStatus('error');
    }
  }, [saveStatus, setSave]);

  const rowBtn = useCallback((color: string, children: React.ReactNode, onClick: () => void, extra?: any) => (
    <button type="button" onClick={onClick} style={{ ...AdminBtn(), ...(extra || {}) }}>{children}</button>
  ), [AdminBtn]);

  return (
    <div>
      {/* ═══════════ پلتفرم‌های سفارشی ═══════════ */}
      <Box title="پلتفرم‌های سفارشی">
        <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>
          پلتفرم‌های سفارشی (مثل روبیکا، بله و...) در کنار یوتیوب و آپارات برای هر آیتم محتوا قابل انتخاب هستند.
        </p>
        {customPlatforms.map((it: any, i: number) => (
          <div key={it.id || i} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 10, marginBottom: 8, background: T.soft }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
              <Field label="نام پلتفرم" value={it.name || ''} onChange={(v: string) => setCustomPlatforms((prev) => prev.map((x, j) => j === i ? { ...x, name: v } : x))} ph="مثلاً روبیکا" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer', paddingBottom: 10 }}>
                <input type="checkbox" checked={!!it.vpnRequired} onChange={(e) => setCustomPlatforms((prev) => prev.map((x, j) => j === i ? { ...x, vpnRequired: e.target.checked } : x))} /> نیاز به VPN
              </label>
            </div>
            <label style={S.lbl}>کد پیش‌فرض (iframe / لینک)</label>
            <StableAdminTextarea dir="ltr" style={{ ...S.ta, fontFamily: 'monospace', fontSize: 11.5, minHeight: 50 }} defaultValue={it.code || ''} onCommit={(v: string) => setCustomPlatforms((prev) => prev.map((x, j) => j === i ? { ...x, code: v.trim() } : x))} placeholder="کد iframe یا لینک..." rows={3} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {rowBtn(T.err, 'حذف پلتفرم', () => setCustomPlatforms((prev) => prev.filter((_, j) => j !== i)), { color: T.err })}
            </div>
          </div>
        ))}
        <button type="button" style={AdminBtn()} onClick={() => setCustomPlatforms((prev) => [...prev, { id: 'cp' + uid(), name: 'پلتفرم جدید', code: '', vpnRequired: false }])}>+ افزودن پلتفرم سفارشی</button>
      </Box>

      {/* ═══════════ محتوای چندرسانه‌ای (mediaItems) ═══════════ */}
      <MediaManager
        T={T} S={S} AdminBtn={AdminBtn} Box={Box} Field={Field}
        StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
        items={mediaItems} setItems={setMediaItems} uid={uid}
        customPlatforms={customPlatforms}
      />

      {/* ═══════════ تجربه والدین ═══════════ */}
      <MediaLibraryManager
        title="تجربه والدین (صفحه تجربه والدین)" withText
        T={T} S={S} AdminBtn={AdminBtn} Box={Box} Field={Field}
        StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
        items={expItems} setItems={setExpItems} uid={uid} sectionKey="experience" p2e={p2e}
      />

      {/* ═══════════ آموزش‌ها ═══════════ */}
      <MediaLibraryManager
        title="آموزش‌ها (ویدیو / ویس / عکس / متن)" withText
        T={T} S={S} AdminBtn={AdminBtn} Box={Box} Field={Field}
        StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
        items={eduItems} setItems={setEduItems} uid={uid} sectionKey="education" p2e={p2e}
      />

      {/* ═══════════ کنترل نمایش تب‌های تجربه والدین ═══════════ */}
      <Box title="کنترل نمایش تب‌ها (تجربه والدین)">
        {([['video', 'ویدیو'], ['audio', 'ویس'], ['article', 'مقاله']] as const).map(([tab, label]) => (
          <label key={tab} style={{ display: 'block', marginBottom: 6 }}>
            <input type="checkbox" checked={tab === 'article' ? (expTabs.article !== false && expTabs.image !== false && expTabs.text !== false) : expTabs[tab] !== false} onChange={(e) => {
              const v = e.target.checked;
              if (tab === 'article') setExpTabs((prev: any) => ({ ...prev, article: v, image: v, text: v }));
              else setExpTabs((prev: any) => ({ ...prev, [tab]: v }));
            }} />
            {' '}{label}
          </label>
        ))}
        <p style={{ fontSize: 11, color: T.mut, marginTop: 6 }}>تب «مقاله» شامل مقاله‌ها، متن‌ها و عکس‌های این بخش است (هماهنگ با صفحه آموزش‌ها).</p>
      </Box>

      {/* ═══════════ تشخیص VPN / کشور کاربر ═══════════ */}
      <Box title="تشخیص VPN / کشور کاربر">
        <label style={S.lbl}>حالت تشخیص</label>
        <select style={{ ...S.inp, marginBottom: 8 }} value={mediaCountryMode} onChange={(e) => setMediaCountryMode(e.target.value)}>
          <option value="auto">خودکار (تشخیص VPN + موقعیت کاربر)</option>
          <option value="iran">همیشه محتوای ایران (آپارات)</option>
          <option value="intl">همیشه محتوای بین‌الملل (یوتیوب)</option>
        </select>
        <p style={{ fontSize: 11, color: T.mut, lineHeight: 1.9, margin: 0 }}>
          در حالت خودکار: اگر VPN کاربر روشن باشد، محتوای یوتیوب و در غیر این صورت محتوای آپارات نمایش داده می‌شود.
        </p>
      </Box>

      {/* ═══════════ ذخیره همه ═══════════ */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          data-testid="content-save"
          style={{ ...S.btn, flex: '0 1 auto', minWidth: 190, opacity: saveStatus === 'saving' ? .7 : 1 }}
          onClick={saveAll}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'در حال ذخیره…' : 'ذخیره تغییرات محتوا'}
        </button>
        {saveStatus === 'saved' && <span role="status" style={{ color: T.ok || '#169b62', fontSize: 12, fontWeight: 800 }}>تغییرات محتوا با موفقیت ذخیره شد.</span>}
        {saveStatus === 'error' && <span role="alert" style={{ color: T.err || '#d33', fontSize: 12, fontWeight: 800 }}>ذخیره انجام نشد؛ اتصال را بررسی و دوباره تلاش کنید.</span>}
      </div>
    </div>
  );
}

// ============================================================================
// MediaManager — محتوای چندرسانه‌ای (mediaItems) — state محلی، ذخیره با دکمه سراسری
// ============================================================================
function MediaManager(props: any) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, items, setItems, uid, customPlatforms } = props;
  const [openType, setOpenType] = useState<string | null>('video');
  const typeSections: [string, string, string][] = [['video', 'ویدیوها', 'ویدیو'], ['image', 'عکس‌ها', 'عکس'], ['audio', 'ویس‌ها', 'ویس']];

  const chg = useCallback((i: number, k: string, v: any) => {
    setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, [k]: v } : x));
  }, [setItems]);
  const chgPlatform = useCallback((i: number, pk: string, v: string) => {
    setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, platforms: { ...(x.platforms || {}), [pk]: v } } : x));
  }, [setItems]);
  const toggleCategory = useCallback((i: number, catId: string) => {
    setItems((prev: any[]) => prev.map((x, j) => {
      if (j !== i) return x;
      const cats = x.categories || [];
      return { ...x, categories: cats.includes(catId) ? cats.filter((c: string) => c !== catId) : [...cats, catId] };
    }));
  }, [setItems]);
  const addItem = useCallback((type: string) => {
    setItems((prev: any[]) => [...prev, { id: type[0] + uid(), title: '', description: '', type, platforms: {}, displayMode: 'both', categories: [], isVisible: true }]);
  }, [setItems, uid]);
  const removeItem = useCallback((i: number) => setItems((prev: any[]) => prev.filter((_, j) => j !== i)), [setItems]);
  const moveItem = useCallback((i: number, dir: -1 | 1) => setItems((prev: any[]) => {
    const a = [...prev]; const j = i + dir; if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  }), [setItems]);
  const toggleCustom = useCallback((i: number, cp: any) => {
    setItems((prev: any[]) => prev.map((x, j) => {
      if (j !== i) return x;
      const cur: any[] = x.platforms?.custom || [];
      const exists = cur.find((c: any) => c.name === cp.name);
      return { ...x, platforms: { ...x.platforms, custom: exists ? cur.filter((c: any) => c.name !== cp.name) : [...cur, { name: cp.name, code: '', vpnRequired: cp.vpnRequired }] } };
    }));
  }, [setItems]);
  const setCustomCode = useCallback((i: number, cpName: string, code: string) => {
    setItems((prev: any[]) => prev.map((x, j) => {
      if (j !== i) return x;
      const cur: any[] = x.platforms?.custom || [];
      return { ...x, platforms: { ...x.platforms, custom: cur.map((c: any) => c.name === cpName ? { ...c, code } : c) } };
    }));
  }, [setItems]);

  return (
    <Box title="مدیریت محتوای چندرسانه‌ای (ساختار جدید)">
      <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>
        هر آیتم محتوا دارای نوع (ویدیو/عکس/ویس)، پلتفرم‌های مخصوص، حالت نمایش، دسته‌بندی و وضعیت نمایش است.
      </p>
      {typeSections.map(([type, sectionLabel, addLabel]) => {
        const filtered = items.filter((it: any) => (it.type || 'video') === type);
        const globalIndices = items.map((it: any, idx: number) => (it.type || 'video') === type ? idx : -1).filter((idx: number) => idx >= 0);
        const isOpen = openType === type;
        return (
          <details key={type} open={isOpen} style={{ marginBottom: 10, background: T.badge, borderRadius: 12, padding: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }} onClick={(e) => { e.preventDefault(); setOpenType(isOpen ? null : type); }}>
              {sectionLabel} ({filtered.length})
            </summary>
            {filtered.map((it: any, localIdx: number) => {
              const gi = globalIndices[localIdx];
              return (
                <div key={it.id || gi} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 10, marginBottom: 8, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <b style={{ fontSize: 12, color: T.txt, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localIdx + 1}. {it.title || 'بدون عنوان'}</b>
                    <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <input className="zkad-switch" type="checkbox" checked={it.isVisible !== false} onChange={(e) => chg(gi, 'isVisible', e.target.checked)} /> فعال
                    </label>
                  </div>
                  <Field label="عنوان" value={it.title || ''} onChange={(v: string) => chg(gi, 'title', v)} ph="" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, marginBottom: 8 }}>
                    <label style={S.lbl}>شمارش شروع بازدید (به هزار — خالی = رندوم ۳۰ تا ۶۰ هزار)</label>
                    <StableAdminInput dir="ltr" numeric inputMode="numeric" style={S.inp} defaultValue={it.viewsSeed ? String(Math.round(it.viewsSeed / 1000)) : ''} onCommit={(v: string) => { const k = parseInt(faToEn(v), 10); chg(gi, 'viewsSeed', (Number.isFinite(k) && k > 0 ? k * 1000 : undefined)); }} placeholder="مثلاً ۴۵" />
                  </div>
                  <label style={S.lbl}>توضیحات</label>
                  <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.description || ''} onCommit={(v: string) => chg(gi, 'description', v)} rows={3} />
                  {type === 'video' && (
                    <>
                      <label style={{ ...S.lbl, marginTop: 4 }}>لینک / کد یوتیوب (VPN روشن)</label>
                      <textarea dir="ltr" style={{ ...S.ta, marginBottom: 6, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.platforms?.youtube || ''} onBlur={(e) => chgPlatform(gi, 'youtube', e.target.value.trim())} placeholder="لینک یوتیوب یا کد iframe" />
                      <label style={S.lbl}>لینک / کد آپارات (VPN خاموش)</label>
                      <textarea dir="ltr" style={{ ...S.ta, marginBottom: 6, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.platforms?.aparat || ''} onBlur={(e) => chgPlatform(gi, 'aparat', e.target.value.trim())} placeholder="لینک آپارات یا کد iframe" />
                    </>
                  )}
                  {type === 'image' && (
                    <>
                      <label style={{ ...S.lbl, marginTop: 4 }}>لینک تصویر خارجی (VPN روشن)</label>
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.externalImage || ''} onCommit={(v: string) => chgPlatform(gi, 'externalImage', canonicalizeMediaInput(v, 'image'))} placeholder="لینک دانلود مستقیم؛ مثال: https://cdn.imgurl.ir/uploads/photo.webp" />
                      <label style={S.lbl}>لینک تصویر داخلی (VPN خاموش)</label>
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.internalImage || ''} onCommit={(v: string) => chgPlatform(gi, 'internalImage', canonicalizeMediaInput(v, 'image'))} placeholder="لینک دانلود مستقیم؛ نیازی به تگ img نیست" />
                      {(() => { const preview = extractDirectMediaUrl(it.platforms?.externalImage || it.platforms?.internalImage, 'image'); return preview ? <img data-admin-image-preview src={preview} alt="پیش‌نمایش تصویر" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10, border: `1px solid ${T.brd}`, marginBottom: 7, background: T.card }} /> : null; })()}
                    </>
                  )}
                  {type === 'audio' && (
                    <>
                      <label style={{ ...S.lbl, marginTop: 4 }}>لینک صوتی خارجی (VPN روشن)</label>
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.externalAudio || ''} onCommit={(v: string) => chgPlatform(gi, 'externalAudio', v.trim())} placeholder="https://..." />
                      <label style={S.lbl}>لینک صوتی داخلی (VPN خاموش)</label>
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.internalAudio || ''} onCommit={(v: string) => chgPlatform(gi, 'internalAudio', v.trim())} placeholder="https://..." />
                    </>
                  )}
                  {customPlatforms.length > 0 && (
                    <>
                      <label style={{ ...S.lbl, marginTop: 4 }}>پلتفرم‌های سفارشی</label>
                      {customPlatforms.map((cp: any) => {
                        const customArr: any[] = it.platforms?.custom || [];
                        const existing = customArr.find((c: any) => c.name === cp.name);
                        return (
                          <div key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <input type="checkbox" checked={!!existing} onChange={() => toggleCustom(gi, cp)} /> {cp.name}{cp.vpnRequired ? ' (نیاز به VPN)' : ''}
                            </label>
                            {existing && <input dir="ltr" style={{ ...S.inp, flex: 1, fontSize: 11 }} defaultValue={existing.code || ''} onBlur={(e) => setCustomCode(gi, cp.name, e.target.value.trim())} placeholder="کد iframe / لینک" />}
                          </div>
                        );
                      })}
                    </>
                  )}
                  <label style={{ ...S.lbl, marginTop: 4 }}>حالت نمایش</label>
                  <select style={{ ...S.inp, marginBottom: 6 }} value={it.displayMode || 'both'} onChange={(e) => chg(gi, 'displayMode', e.target.value)}>
                    <option value="external">خارجی (VPN روشن)</option>
                    <option value="internal">داخلی (VPN خاموش)</option>
                    <option value="both">هر دو (خودکار)</option>
                    <option value="custom">پلتفرم سفارشی</option>
                  </select>
                  <label style={{ ...S.lbl, marginTop: 4 }}>دسته‌بندی‌ها</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    {MEDIA_CATEGORIES.map(([catId, catLabel]) => (
                      <label key={catId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={(it.categories || []).includes(catId)} onChange={() => toggleCategory(gi, catId)} /> {catLabel}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" style={AdminBtn()} disabled={localIdx === 0} onClick={() => moveItem(gi, -1)}>بالا</button>
                    <button type="button" style={AdminBtn()} disabled={localIdx === filtered.length - 1} onClick={() => moveItem(gi, 1)}>پایین</button>
                    <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => removeItem(gi)}>حذف</button>
                  </div>
                </div>
              );
            })}
            <button type="button" style={{ ...AdminBtn(), marginTop: 8 }} onClick={() => addItem(type)}>افزودن {addLabel}</button>
          </details>
        );
      })}
    </Box>
  );
}

// ============================================================================
// ادیتور تصاویر مقاله (چند عکس با ترتیب و موقعیت دلخواه در متن)
// ============================================================================
function ArticleImagesEditor({ T, S, AdminBtn, StableAdminInput, uid, images, paraCount, onChange }: { T: any; S: any; AdminBtn: () => any; StableAdminInput: any; uid: () => number; images: any[]; paraCount: number; onChange: (arr: any[]) => void }) {
  const list: any[] = Array.isArray(images) ? images : [];
  const set = (arr: any[]) => onChange(arr);
  const chg = (idx: number, k: string, v: any) => { const a = [...list]; a[idx] = { ...a[idx], [k]: v }; set(a); };
  const add = () => set([...list, { id: 'aimg' + uid(), url: '', position: 0 }]);
  const remove = (idx: number) => set(list.filter((_, j) => j !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const a = [...list];
    const cur = Number(a[idx]?.position) || 0;
    const np = Math.max(0, cur + dir);
    a[idx] = { ...a[idx], position: np };
    set(a);
  };
  const posOptions: { v: number; l: string }[] = [{ v: 0, l: 'ابتدای مقاله (پیش‌فرض)' }];
  for (let k = 1; k <= paraCount; k++) posOptions.push({ v: k, l: `بعد از پاراگراف ${k}` });
  posOptions.push({ v: 9999, l: 'انتهای مقاله' });

  return (
    <div style={{ marginTop: 4, marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: T.soft, border: `1px solid ${T.brd}` }}>
      <label style={{ ...S.lbl, marginBottom: 4 }}>تصاویر مقاله ({list.length})</label>
      <p style={{ fontSize: 10.5, color: T.mut, lineHeight: 1.7, margin: '0 0 8px' }}>
        چند عکس به مقاله اضافه کنید. هر عکس می‌تواند در «ابتدای مقاله»، «بعد از هر پاراگراف» یا «انتهای مقاله» قرار بگیرد؛ با دکمه‌های بالا/پایین موقعیتش را جابه‌جا کنید. اگر موقعیتی انتخاب نشود، به‌صورت پیش‌فرض در ابتدای مقاله نمایش داده می‌شود.
      </p>
      {list.map((im: any, idx: number) => (
        <div key={im.id || idx} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 8, marginBottom: 8, background: T.card }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {extractDirectMediaUrl(im.url, 'image') ? (
              <img src={extractDirectMediaUrl(im.url, 'image')} alt="" referrerPolicy="no-referrer" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.brd}`, flexShrink: 0, background: T.inp }} />
            ) : (
              <span style={{ width: 72, height: 54, borderRadius: 8, border: `1px dashed ${T.brd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.mut, fontSize: 11, flexShrink: 0, background: T.soft }}>عکس</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 10.5, color: T.mut, display: 'block', marginBottom: 3 }}>لینک تصویر (مستقیم یا تگ img)</label>
              <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6, fontSize: 12, fontFamily: 'monospace' }} defaultValue={im.url || ''} onCommit={(v: string) => chg(idx, 'url', canonicalizeMediaInput(v, 'image'))} placeholder="https://... یا <img src=...>" />
              <select style={{ ...S.inp, marginBottom: 4 }} value={Number(im.position) === 9999 ? 9999 : (Number(im.position) || 0)} onChange={(e) => chg(idx, 'position', Number(e.target.value))}>
                {posOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} disabled={idx === 0} onClick={() => { const a = [...list]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; set(a); }}>↑</button>
            <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} disabled={idx === list.length - 1} onClick={() => { const a = [...list]; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; set(a); }}>↓</button>
            <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} onClick={() => move(idx, -1)}>موقعیت قبل‌تر</button>
            <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} onClick={() => move(idx, 1)}>موقعیت بعدتر</button>
            <button type="button" style={{ ...AdminBtn(), color: T.err, padding: '4px 10px', marginInlineStart: 'auto' }} onClick={() => remove(idx)}>حذف عکس</button>
          </div>
        </div>
      ))}
      <button type="button" style={AdminBtn()} onClick={add}>+ افزودن عکس به مقاله</button>
    </div>
  );
}

// ============================================================================
// MediaLibraryManager — تجربه والدین / آموزش‌ها — state محلی
// ============================================================================
function MediaLibraryManager(props: any) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, items, setItems, uid, sectionKey, title, withText, p2e } = props;
  const isEdu = sectionKey === 'education';
  // در آموزش‌ها «عکس» و «متن» ادغام شده‌اند و فقط «مقاله / ویدیو / پادکست» وجود دارد.
  const typeOpts: [string, string][] = isEdu
    ? [['article', 'مقاله'], ['video', 'ویدیو'], ['audio', 'پادکست']]
    : [['video', 'ویدیو'], ['audio', 'ویس'], ['image', 'عکس'], ...(withText ? [['text', 'متن'] as [string, string]] : [])];
  // نوع‌های قدیمی (متن/عکس) در آموزش‌ها به‌صورت «مقاله» نمایش داده و هنگام ذخیره به مقاله تبدیل می‌شوند.
  const normType = (t: any) => (isEdu && (t === 'text' || t === 'image')) ? 'article' : (t || 'video');

  const sourceDestination = sectionKey as MediaDestination;
  const chg = useCallback((i: number, k: string, v: any) => setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, [k]: v } : x)), [setItems]);
  const toggleDestination = useCallback((i: number, destination: MediaDestination) => {
    setItems((prev: any[]) => prev.map((item, index) => {
      if (index !== i) return item;
      const current = getMediaDestinations(item, sourceDestination);
      const mediaCategories = current.includes(destination)
        ? current.filter((value) => value !== destination)
        : [...current, destination];
      return {
        ...item,
        mediaCategories,
        // Keep a compatible single value for clients that have not received this update yet.
        ...(mediaCategories[0] ? { mediaCategory: mediaCategories[0] } : {}),
      };
    }));
  }, [setItems, sourceDestination]);
  const add = useCallback(() => setItems((prev: any[]) => [...prev, { id: sectionKey[0] + uid(), title: 'آیتم جدید', description: '', keywords: sectionKey === 'education' ? [] : undefined, type: isEdu ? 'article' : 'video', body: isEdu ? '' : undefined, images: isEdu ? [] : undefined, author: isEdu ? '' : undefined, authorEn: isEdu ? '' : undefined, sourceUrl: isEdu ? '' : undefined, reviewedAt: isEdu ? '' : undefined, quote: isEdu ? '' : undefined, youtubeCode: '', aparatCode: '', manualCode: '', platform: 'other', phone: '', active: true, order: prev.length + 1, mediaCategories: [sourceDestination], mediaCategory: sourceDestination }]), [setItems, uid, sectionKey, sourceDestination, isEdu]);
  const remove = useCallback((i: number) => setItems((prev: any[]) => prev.filter((_, j) => j !== i)), [setItems]);
  const move = useCallback((i: number, dir: -1 | 1) => setItems((prev: any[]) => {
    const a = [...prev]; const j = i + dir; if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return a.map((x, idx) => ({ ...x, order: idx + 1 }));
  }), [setItems]);

  return (
    <Box title={title}>
      {items.map((it: any, i: number) => (
        <details key={it.id || i} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 10, marginBottom: 8, background: T.badge }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i + 1}. {normType(it.type) === 'article' ? '📄' : it.type === 'audio' ? '🔊' : it.type === 'image' ? '🖼️' : it.type === 'text' ? '📄' : '🎬'} {it.title || 'بدون عنوان'}{it.active === false ? ' (غیرفعال)' : ''}
          </summary>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={it.active !== false} onChange={(e) => chg(i, 'active', e.target.checked)} /> فعال
            </label>
            <select style={{ ...S.inp, flex: 1 }} value={normType(it.type)} onChange={(e) => chg(i, 'type', e.target.value)}>
              {typeOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Field label="عنوان" value={it.title || ''} onChange={(v: string) => chg(i, 'title', v)} ph="" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, marginBottom: 8 }}>
            <label style={S.lbl}>شمارش شروع بازدید (به هزار — خالی = رندوم ۳۰ تا ۶۰ هزار)</label>
            <StableAdminInput dir="ltr" numeric inputMode="numeric" style={S.inp} defaultValue={it.viewsSeed ? String(Math.round(it.viewsSeed / 1000)) : ''} onCommit={(v: string) => { const k = parseInt(faToEn(v), 10); chg(i, 'viewsSeed', (Number.isFinite(k) && k > 0 ? k * 1000 : undefined)); }} placeholder="مثلاً ۴۵" />
          </div>
          <label style={S.lbl}>توضیحات (نمایش در صفحه تجربه والدین)</label>
          <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.description || ''} onCommit={(v: string) => chg(i, 'description', v)} rows={3} />
          <label style={S.lbl}>توضیحات (نمایش در صفحه معرفی دوره‌ها)</label>
          <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.descriptionCourses || ''} onCommit={(v: string) => chg(i, 'descriptionCourses', v)} rows={3} />
          <label style={{ ...S.lbl, marginTop: 2, display: 'block' }}>هایلایت‌های متن (جملات رنگی جلب‌توجه)</label>
          <p style={{ fontSize: 10.5, color: T.mut, margin: '0 0 6px', lineHeight: 1.7 }}>می‌توانید چند هایلایت رنگی اضافه کنید؛ در نمایش، قبل یا بعد از توضیحات/متن کامل به‌ترتیب ظاهر می‌شوند. رنگ‌های پاستیلی انتخاب کنید تا متن داخل با رنگِ هایلایت خوانا بماند.</p>
          {(() => {
            const highlights: any[] = it.highlights || [];
            const setHighlights = (arr: any[]) => chg(i, 'highlights', arr);
            return (
              <div style={{ marginBottom: 8 }}>
                {highlights.map((h: any, hi: number) => (
                  <div key={h.id || hi} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 8, marginBottom: 6, background: T.badge }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                      <select style={{ ...S.inp, flex: 1 }} value={h.color || '#DCFCE7'} onChange={(e) => { const a = [...highlights]; a[hi] = { ...a[hi], color: e.target.value }; setHighlights(a); }}>
                        <option value="#DCFCE7">سبز ملایم</option>
                        <option value="#FEF9C3">زرد ملایم</option>
                        <option value="#FFE4E6">صورتی ملایم</option>
                        <option value="#DBEAFE">آبی ملایم</option>
                        <option value="#FFEDD5">نارنجی ملایم</option>
                        <option value="#F3E8FF">بنفش ملایم</option>
                        <option value="#CCFBF1">فیروزه‌ای ملایم</option>
                        <option value="#E2E8F0">خاکستری ملایم</option>
                      </select>
                      <button type="button" style={{ ...AdminBtn(), color: T.err, padding: '4px 10px' }} onClick={() => setHighlights(highlights.filter((_: any, j: number) => j !== hi))}>حذف</button>
                    </div>
                    <StableAdminTextarea style={{ ...S.ta, minHeight: 50, background: h.color || '#DCFCE7', color: '#1F2937' }} defaultValue={h.text || ''} onCommit={(v: string) => { const a = [...highlights]; a[hi] = { ...a[hi], text: v }; setHighlights(a); }} rows={2} placeholder="متن هایلایت..." />
                    <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                      <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} disabled={hi === 0} onClick={() => { const a = [...highlights]; const j = hi - 1; [a[hi], a[j]] = [a[j], a[hi]]; setHighlights(a); }}>بالا</button>
                      <button type="button" style={{ ...AdminBtn(), padding: '4px 10px' }} disabled={hi === highlights.length - 1} onClick={() => { const a = [...highlights]; const j = hi + 1; [a[hi], a[j]] = [a[j], a[hi]]; setHighlights(a); }}>پایین</button>
                    </div>
                  </div>
                ))}
                <button type="button" style={AdminBtn()} onClick={() => setHighlights([...highlights, { id: 'hl' + uid(), color: '#DCFCE7', text: '' }])}>+ افزودن هایلایت</button>
              </div>
            );
          })()}
          {sectionKey === 'education' && (
            <>
              <label style={S.lbl}>کلمات کلیدی (با کاما یا ویرگول جدا کنید)</label>
              <input style={{ ...S.inp, marginBottom: 8 }} defaultValue={(it.keywords || []).join(', ')} onBlur={(e) => chg(i, 'keywords', e.target.value.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean))} placeholder="رشد قد, بی‌اشتهایی, هوش" />
            </>
          )}
          {(isEdu ? normType(it.type) === 'article' : (it.type || 'video') === 'text') ? (
            <>
              {isEdu && (
                <fieldset style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: '10px', margin: '0 0 10px' }}>
                  <legend style={{ fontSize: 12, fontWeight: 800, padding: '0 5px' }}>اعتبار و منبع مقاله</legend>
                  <p style={{ fontSize: 10.5, color: T.mut, lineHeight: 1.8, margin: '0 0 8px' }}>اطلاعات واقعی نویسنده/بازبین و لینک مستقیم منبع علمی را وارد کنید. خالی‌ماندن این فیلدها، محتوای فعلی را تغییر نمی‌دهد.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>
                    <div><label style={S.lbl}>نویسنده یا بازبین (فارسی)</label><StableAdminInput style={S.inp} defaultValue={it.author || ''} onCommit={(v: string) => chg(i, 'author', v.trim())} placeholder="نام و عنوان حرفه‌ای" /></div>
                    <div><label style={S.lbl}>Author / reviewer (English)</label><StableAdminInput dir="ltr" style={S.inp} defaultValue={it.authorEn || ''} onCommit={(v: string) => chg(i, 'authorEn', v.trim())} placeholder="Name and credentials" /></div>
                    <div><label style={S.lbl}>تاریخ آخرین بازبینی</label><input type="date" dir="ltr" style={S.inp} defaultValue={it.reviewedAt || ''} onBlur={(event) => chg(i, 'reviewedAt', event.target.value)} /></div>
                    <div><label style={S.lbl}>لینک منبع علمی</label><StableAdminInput dir="ltr" type="url" style={S.inp} defaultValue={it.sourceUrl || ''} onCommit={(v: string) => chg(i, 'sourceUrl', v.trim())} placeholder="https://..." /></div>
                  </div>
                  <label style={{ ...S.lbl, marginTop: 8 }}>نقل‌قول برجسته (اختیاری)</label>
                  <StableAdminTextarea style={{ ...S.ta, minHeight: 58 }} defaultValue={it.quote || ''} onCommit={(v: string) => chg(i, 'quote', v.trim())} rows={2} />
                </fieldset>
              )}
              <label style={S.lbl}>متن کامل مقاله (هر پاراگراف را با یک خط خالی جدا کنید)</label>
              <StableAdminTextarea style={{ ...S.ta, marginBottom: 8, minHeight: 140 }} defaultValue={it.body || ''} onCommit={(v: string) => chg(i, 'body', v)} rows={7} placeholder={'پاراگراف اول\n\nپاراگراف دوم\n\n...'} />
              {isEdu && (
                <ArticleImagesEditor T={T} S={S} AdminBtn={AdminBtn} StableAdminInput={StableAdminInput} uid={uid} images={it.images || []} paraCount={String(it.body || '').split(/\n\n+/).filter((p: string) => p.trim()).length} onChange={(arr: any[]) => chg(i, 'images', arr)} />
              )}
            </>
          ) : (
            <>
              {(it.type || 'video') === 'video' && (
                <>
                  <label style={S.lbl}>کد دستی یوتیوب (VPN روشن)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.youtubeCode || it.manualCode || ''} onCommit={(v: string) => chg(i, 'youtubeCode', v.trim())} placeholder='<iframe src="https://www.youtube.com/embed/..."></iframe>' rows={3} />
                  <label style={S.lbl}>کد دستی آپارات (VPN خاموش)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.aparatCode || ''} onCommit={(v: string) => chg(i, 'aparatCode', v.trim())} placeholder='<iframe src="https://www.aparat.com/..."></iframe>' rows={3} />
                  <label style={S.lbl}>مدت‌زمان ویدیو (دقیقه — اختیاری؛ برای ویدیوهای یوتیوب/آپارات که مدتشان خودکار قابل تشخیص نیست)</label>
                  <StableAdminInput dir="ltr" numeric inputMode="numeric" style={{ ...S.inp, marginBottom: 8 }} defaultValue={it.minutes ? String(it.minutes) : ''} onCommit={(v: string) => { const k = parseInt(faToEn(v), 10); chg(i, 'minutes', (Number.isFinite(k) && k > 0 ? k : undefined)); }} placeholder="مثلاً ۳" />
                </>
              )}
              {(it.type || 'video') === 'image' && (
                <>
                  <div style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 9, background: T.soft, color: T.mut, fontSize: 11.5, lineHeight: 1.8 }}>
                    برای ImgURL فقط «لینک دانلود» مثل <span dir="ltr">https://cdn.imgurl.ir/uploads/photo.webp</span> را وارد کنید؛ نیازی به تگ <span dir="ltr">&lt;img&gt;</span> نیست. اگر تگ را هم بچسبانید، لینک آن خودکار استخراج می‌شود.
                  </div>
                  <label style={S.lbl}>تصویر خارجی (VPN روشن)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.externalCode || it.manualCode || ''} onCommit={(v: string) => chg(i, 'externalCode', canonicalizeMediaInput(v, 'image'))} placeholder="https://cdn.imgurl.ir/uploads/photo.webp" rows={3} />
                  <label style={S.lbl}>تصویر داخلی (VPN خاموش)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.internalCode || ''} onCommit={(v: string) => chg(i, 'internalCode', canonicalizeMediaInput(v, 'image'))} placeholder="همان لینک مستقیم را می‌توانید اینجا نیز قرار دهید" rows={3} />
                  {(() => { const preview = extractDirectMediaUrl(it.externalCode || it.manualCode || it.internalCode, 'image'); return preview ? <img data-admin-image-preview src={preview} alt="پیش‌نمایش تصویر محتوا" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: `1px solid ${T.brd}`, marginBottom: 8, background: T.card }} /> : null; })()}
                </>
              )}
              {(it.type || 'video') === 'audio' && (
                <>
                  <label style={S.lbl}>کد دستی صوتی خارجی (VPN روشن)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.externalCode || it.manualCode || ''} onBlur={(e) => chg(i, 'externalCode', e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم' />
                  <label style={S.lbl}>کد دستی صوتی داخلی (VPN خاموش)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.internalCode || ''} onBlur={(e) => chg(i, 'internalCode', e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم' />
                  <label style={S.lbl}>مدت‌زمان ویس/پادکست (دقیقه — اختیاری؛ در صورت فایل مستقیم، خودکار تشخیص داده می‌شود)</label>
                  <StableAdminInput dir="ltr" numeric inputMode="numeric" style={{ ...S.inp, marginBottom: 8 }} defaultValue={it.minutes ? String(it.minutes) : ''} onCommit={(v: string) => { const k = parseInt(faToEn(v), 10); chg(i, 'minutes', (Number.isFinite(k) && k > 0 ? k : undefined)); }} placeholder="مثلاً ۱۲" />
                </>
              )}
              <label style={{ ...S.lbl, marginTop: 4 }}>نمایش از طریق</label>
              <select style={{ ...S.inp, marginBottom: 8 }} value={it.displayMode || 'auto'} onChange={(e) => chg(i, 'displayMode', e.target.value)}>
                <option value="aparat">فقط آپارات</option>
                <option value="youtube">فقط یوتیوب</option>
                <option value="auto">هر دو خودکار (بر اساس VPN)</option>
              </select>
              <label style={{ ...S.lbl, marginTop: 8 }}>لینک تصویر بندانگشتی (اختیاری)</label>
              <StableAdminInput dir="ltr" type="text" style={{ ...S.inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }} defaultValue={it.thumbnail || ''} onCommit={(v: string) => chg(i, 'thumbnail', v.trim())} placeholder="https://...jpg" />
            </>
          )}
          <fieldset style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: '8px 10px', margin: '4px 0 8px' }}>
            <legend style={{ fontSize: 12, fontWeight: 800, color: T.txt, padding: '0 5px' }}>محل‌های نمایش (چندانتخابی)</legend>
            <p style={{ fontSize: 10.5, color: T.mut, margin: '0 0 7px' }}>این محتوا هم‌زمان در همه بخش‌های انتخاب‌شده نمایش داده می‌شود.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 7 }}>
              {MEDIA_DESTINATIONS.map((destination) => {
                const checked = getMediaDestinations(it, sourceDestination).includes(destination.id);
                return (
                  <label key={destination.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 30, fontSize: 11.5, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      data-media-destination={destination.id}
                      checked={checked}
                      onChange={() => toggleDestination(i, destination.id)}
                    />
                    {destination.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label style={{ ...S.lbl, marginTop: 8 }}>شماره تماس نمایش‌داده‌شده روی کارت (اختیاری — ماسک‌شده)</label>
          <StableAdminInput dir="ltr" type="text" style={{ ...S.inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }} defaultValue={it.phone || ''} onCommit={(v: string) => chg(i, 'phone', p2e(v).trim())} placeholder="0914xxxxxxx" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" style={AdminBtn()} disabled={i === 0} onClick={() => move(i, -1)}>بالا</button>
            <button type="button" style={AdminBtn()} disabled={i === items.length - 1} onClick={() => move(i, 1)}>پایین</button>
            <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => remove(i)}>حذف</button>
          </div>
        </details>
      ))}
      <button type="button" style={AdminBtn()} onClick={add}>افزودن آیتم</button>
    </Box>
  );
}
