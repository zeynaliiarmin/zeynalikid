// ============================================================================
// ContentManager — بازطراحی کامل «محتوا و صفحات» (رفع پرش صفحه / fg)
//
// مشکلات قبلی که این بازطراحی حل می‌کند:
//   1) هر keystroke کل settings را بازسازی می‌کرد → کل صفحهٔ محتوا (چند صد
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
import React, { useMemo, useState, useCallback } from 'react';

interface Props {
  T: any; S: any; AdminBtn: () => any; Box: any; Field: any;
  StableAdminInput: any; StableAdminTextarea: any;
  cfg: any; setSave: (next: any) => void;
  fileToData: (f: File, oldUrl?: string, folder?: string) => Promise<string>;
  p2e: (v: string) => string;
  uid: () => number;
}

const MEDIA_CATEGORIES: [string, string][] = [
  ['parent-experience', 'تجربه والدین'],
  ['growth', 'رشد قد'],
  ['appetite', 'بی‌اشتهایی'],
  ['intelligence', 'هوش'],
];

export default function ContentManager(props: Props) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, cfg, setSave, fileToData, p2e, uid } = props;

  // ── state محلی: کپی از cfg — فقط با دکمهٔ ذخیره به settings واقعی می‌رود ──
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
  const [storyHighlights, setStoryHighlights] = useState<any[]>(() => {
    const sh = cfg.storyHighlights && typeof cfg.storyHighlights === 'object' ? cfg.storyHighlights : {};
    return Array.isArray(sh.highlights) ? sh.highlights :
      (sh.highlights && typeof sh.highlights === 'object' ? Object.values(sh.highlights) : []);
  });
  const [expItems, setExpItems] = useState<any[]>(() => (cfg.experience?.items || []));
  const [eduItems, setEduItems] = useState<any[]>(() => (cfg.education?.items || []));
  const [licensesText, setLicensesText] = useState<string>(() => cfg.licensesText || '');
  const [expTabs, setExpTabs] = useState<any>(() => cfg.experienceTabs || {});
  const [mediaCountryMode, setMediaCountryMode] = useState<string>(() => cfg.mediaCountryMode || 'auto');
  const [legacyMigrated, setLegacyMigrated] = useState<boolean>(false);

  // ── ذخیرهٔ همهٔ بخش‌ها با یک دکمه ──
  const saveAll = useCallback(() => {
    const next = {
      ...cfg,
      customPlatforms,
      mediaItems,
      storyHighlights: { ...(cfg.storyHighlights || {}), highlights: storyHighlights, ...(legacyMigrated ? { items: [] } : {}) },
      experience: { ...(cfg.experience || {}), items: expItems },
      education: { ...(cfg.education || {}), items: eduItems },
      licensesText,
      experienceTabs: expTabs,
      mediaCountryMode,
    };
    setSave(next);
  }, [cfg, customPlatforms, mediaItems, storyHighlights, expItems, eduItems, licensesText, expTabs, mediaCountryMode, setSave]);

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

      {/* ═══════════ هایلایت استوری ═══════════ */}
      <StoryManager
        T={T} S={S} AdminBtn={AdminBtn} Box={Box} Field={Field}
        StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
        highlights={storyHighlights} setHighlights={setStoryHighlights} uid={uid}
        legacyItems={(cfg.storyHighlights?.items) || []}
        migrate={(items: any[]) => {
          const legacy = { id: 'legacy', title: 'استوری', coverUrl: '', active: true, order: 1, stories: items.map((it: any, idx: number) => ({ id: it.id, title: it.title || '', imageCodeExternal: it.embedCode || '', imageCodeInternal: it.embedCode || '', active: it.active !== false, order: it.order || idx + 1 })) };
          setStoryHighlights((prev) => [...prev, legacy]);
          setLegacyMigrated(true);
        }}
        setLegacyCleared={() => {}}
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

      {/* ═══════════ متن صفحه مجوزها ═══════════ */}
      <Box title="مجوزها">
        <label style={S.lbl}>متن صفحه مجوزها</label>
        <StableAdminTextarea style={S.ta} defaultValue={licensesText} onCommit={(v: string) => setLicensesText(v)} placeholder="متن یا توضیحات مجوزها و گواهینامه‌ها..." rows={4} />
      </Box>

      {/* ═══════════ کنترل نمایش تب‌های تجربه والدین ═══════════ */}
      <Box title="کنترل نمایش تب‌ها (تجربه والدین)">
        {(['video', 'audio', 'image', 'text'] as const).map((tab) => (
          <label key={tab} style={{ display: 'block', marginBottom: 6 }}>
            <input type="checkbox" checked={expTabs[tab] !== false} onChange={(e) => setExpTabs((prev: any) => ({ ...prev, [tab]: e.target.checked }))} />
            {' '}{tab === 'video' ? 'ویدیو' : tab === 'audio' ? 'ویس' : tab === 'image' ? 'عکس' : 'متن'}
          </label>
        ))}
        <p style={{ fontSize: 11, color: T.mut, marginTop: 6 }}>ادمین می‌تواند تعیین کند کدام تب‌ها نمایش داده شوند. گزینه «متن» بخش تجربه والدین را نیز فعال می‌کند.</p>
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

      {/* ═══════════ ذخیرهٔ همه ═══════════ */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" style={{ ...S.btn, flex: '0 1 auto', minWidth: 160 }} onClick={saveAll}>ذخیره تغییرات محتوا</button>
      </div>
    </div>
  );
}

// ============================================================================
// MediaManager — محتوای چندرسانه‌ای (mediaItems) — state محلی، ذخیره با دکمهٔ سراسری
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
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.externalImage || ''} onCommit={(v: string) => chgPlatform(gi, 'externalImage', v.trim())} placeholder="https://..." />
                      <label style={S.lbl}>لینک تصویر داخلی (VPN خاموش)</label>
                      <StableAdminInput dir="ltr" style={{ ...S.inp, marginBottom: 6 }} defaultValue={it.platforms?.internalImage || ''} onCommit={(v: string) => chgPlatform(gi, 'internalImage', v.trim())} placeholder="https://..." />
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
// StoryManager — هایلایت استوری — state محلی
// ============================================================================
function StoryManager(props: any) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, highlights, setHighlights, uid, legacyItems, migrate } = props;
  const chgHl = useCallback((i: number, k: string, v: any) => setHighlights((prev: any[]) => prev.map((x, j) => j === i ? { ...x, [k]: v } : x)), [setHighlights]);
  const addHl = useCallback(() => setHighlights((prev: any[]) => [...prev, { id: 'hl' + uid(), title: 'هایلایت جدید', coverUrl: '', active: true, order: prev.length + 1, stories: [] }]), [setHighlights, uid]);
  const removeHl = useCallback((i: number) => setHighlights((prev: any[]) => prev.filter((_, j) => j !== i)), [setHighlights]);
  const moveHl = useCallback((i: number, dir: -1 | 1) => setHighlights((prev: any[]) => {
    const a = [...prev]; const j = i + dir; if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return a.map((x, idx) => ({ ...x, order: idx + 1 }));
  }), [setHighlights]);
  const chgStory = useCallback((hi: number, si: number, k: string, v: any) => setHighlights((prev: any[]) => prev.map((x, j) => {
    if (j !== hi) return x;
    const stories = [...(x.stories || [])];
    if (stories[si]) stories[si] = { ...stories[si], [k]: v };
    return { ...x, stories };
  })), [setHighlights]);
  const addStory = useCallback((hi: number) => setHighlights((prev: any[]) => prev.map((x, j) => {
    if (j !== hi) return x;
    const stories = [...(x.stories || [])];
    stories.push({ id: 'st' + uid(), title: '', imageCodeExternal: '', imageCodeInternal: '', active: true, order: stories.length + 1 });
    return { ...x, stories };
  })), [setHighlights, uid]);
  const removeStory = useCallback((hi: number, si: number) => setHighlights((prev: any[]) => prev.map((x, j) => j !== hi ? x : { ...x, stories: (x.stories || []).filter((_: any, k: number) => k !== si) })), [setHighlights]);
  const moveStory = useCallback((hi: number, si: number, dir: -1 | 1) => setHighlights((prev: any[]) => prev.map((x, j) => {
    if (j !== hi) return x;
    const stories = [...(x.stories || [])]; const k = si + dir;
    if (k < 0 || k >= stories.length) return x;
    [stories[si], stories[k]] = [stories[k], stories[si]];
    return { ...x, stories: stories.map((s, idx) => ({ ...s, order: idx + 1 })) };
  })), [setHighlights]);

  return (
    <Box title="مدیریت هایلایت استوری (تجربه والدین / آموزش‌ها)">
      <p style={{ fontSize: 11, color: T.mut, margin: '0 0 10px', lineHeight: 1.8 }}>
        هر هایلایت یک دایره در بالای صفحات «تجربه والدین» و «آموزش‌ها» است. هر هایلایت شامل چند استوری (اسلاید) با دو کد دستی تصویر (خارجی/داخلی) می‌باشد.
      </p>
      {legacyItems.length > 0 && (
        <div style={{ marginBottom: 12, padding: 10, background: `${T.warn}18`, border: `1px solid ${T.warn}`, borderRadius: 10, fontSize: 12, color: T.warn }}>
          {legacyItems.length} استوری قدیمی موجود است.{' '}
          <button type="button" style={{ ...AdminBtn(), marginInlineStart: 8 }} onClick={() => migrate(legacyItems)}>انتقال به ساختار جدید</button>
        </div>
      )}
      {highlights.map((hl: any, hi: number) => (
        <details key={hl.id || hi} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, padding: 10, marginBottom: 8, background: T.badge }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>{hi + 1}. {hl.title || 'بدون عنوان'} ({(hl.stories || []).length} استوری)</summary>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={hl.active !== false} onChange={(e) => chgHl(hi, 'active', e.target.checked)} /> فعال
            </label>
          </div>
          <Field label="عنوان هایلایت" value={hl.title || ''} onChange={(v: string) => chgHl(hi, 'title', v)} ph="" />
          <Field label="آدرس کاور (اختیاری)" value={hl.coverUrl || ''} onChange={(v: string) => chgHl(hi, 'coverUrl', v)} ph="https://..." />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            <button type="button" style={AdminBtn()} disabled={hi === 0} onClick={() => moveHl(hi, -1)}>بالا</button>
            <button type="button" style={AdminBtn()} disabled={hi === highlights.length - 1} onClick={() => moveHl(hi, 1)}>پایین</button>
            <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => removeHl(hi)}>حذف هایلایت</button>
          </div>
          <div style={{ marginTop: 10, padding: 10, background: T.soft, borderRadius: 10 }}>
            <b style={{ fontSize: 12, color: T.ttl, display: 'block', marginBottom: 8 }}>استوری‌ها</b>
            {(hl.stories || []).map((st: any, si: number) => (
              <div key={st.id || si} style={{ border: `1px solid ${T.brd}`, borderRadius: 10, padding: 8, marginTop: 8, background: T.card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={st.active !== false} onChange={(e) => chgStory(hi, si, 'active', e.target.checked)} /> فعال
                  </label>
                  <span style={{ fontSize: 12, color: T.mut }}>اسلاید {si + 1}</span>
                </div>
                <Field label="عنوان اسلاید" value={st.title || ''} onChange={(v: string) => chgStory(hi, si, 'title', v)} ph="" />
                <label style={S.lbl}>کد تصویر خارجی (VPN روشن)</label>
                <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 6, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={st.imageCodeExternal || ''} onCommit={(v: string) => chgStory(hi, si, 'imageCodeExternal', v.trim())} placeholder='<img src="https://..." />' rows={3} />
                <label style={S.lbl}>کد تصویر داخلی (VPN خاموش)</label>
                <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 6, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={st.imageCodeInternal || ''} onCommit={(v: string) => chgStory(hi, si, 'imageCodeInternal', v.trim())} placeholder='<img src="https://..." />' rows={3} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" style={AdminBtn()} disabled={si === 0} onClick={() => moveStory(hi, si, -1)}>بالا</button>
                  <button type="button" style={AdminBtn()} disabled={si === (hl.stories || []).length - 1} onClick={() => moveStory(hi, si, 1)}>پایین</button>
                  <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => removeStory(hi, si)}>حذف اسلاید</button>
                </div>
              </div>
            ))}
            <button type="button" style={{ ...AdminBtn(), marginTop: 8 }} onClick={() => addStory(hi)}>+ افزودن اسلاید</button>
          </div>
        </details>
      ))}
      <button type="button" style={{ ...AdminBtn(), marginTop: 8 }} onClick={addHl}>+ افزودن هایلایت</button>
    </Box>
  );
}

// ============================================================================
// MediaLibraryManager — تجربه والدین / آموزش‌ها — state محلی
// ============================================================================
function MediaLibraryManager(props: any) {
  const { T, S, AdminBtn, Box, Field, StableAdminInput, StableAdminTextarea, items, setItems, uid, sectionKey, title, withText, p2e } = props;
  const typeOpts: [string, string][] = [['video', 'ویدیو'], ['audio', 'ویس'], ['image', 'عکس'], ...(withText ? [['text', 'متن'] as [string, string]] : [])];

  const chg = useCallback((i: number, k: string, v: any) => setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, [k]: v } : x)), [setItems]);
  const add = useCallback(() => setItems((prev: any[]) => [...prev, { id: sectionKey[0] + uid(), title: 'آیتم جدید', description: '', keywords: sectionKey === 'education' ? [] : undefined, type: 'video', youtubeCode: '', aparatCode: '', manualCode: '', platform: 'other', phone: '', active: true, order: prev.length + 1 }]), [setItems, uid, sectionKey]);
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
            {i + 1}. {it.type === 'audio' ? '🔊' : it.type === 'image' ? '🖼️' : it.type === 'text' ? '📄' : '🎬'} {it.title || 'بدون عنوان'}{it.active === false ? ' (غیرفعال)' : ''}
          </summary>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={it.active !== false} onChange={(e) => chg(i, 'active', e.target.checked)} /> فعال
            </label>
            <select style={{ ...S.inp, flex: 1 }} value={it.type || 'video'} onChange={(e) => chg(i, 'type', e.target.value)}>
              {typeOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Field label="عنوان" value={it.title || ''} onChange={(v: string) => chg(i, 'title', v)} ph="" />
          <label style={S.lbl}>توضیحات (نمایش در صفحه تجربه والدین)</label>
          <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.description || ''} onCommit={(v: string) => chg(i, 'description', v)} rows={3} />
          <label style={S.lbl}>توضیحات (نمایش در صفحه معرفی دوره‌ها)</label>
          <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.descriptionCourses || ''} onCommit={(v: string) => chg(i, 'descriptionCourses', v)} rows={3} />
          {sectionKey === 'education' && (
            <>
              <label style={S.lbl}>کلمات کلیدی (با کاما یا ویرگول جدا کنید)</label>
              <input style={{ ...S.inp, marginBottom: 8 }} defaultValue={(it.keywords || []).join(', ')} onBlur={(e) => chg(i, 'keywords', e.target.value.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean))} placeholder="رشد قد, بی‌اشتهایی, هوش" />
            </>
          )}
          {(it.type || 'video') === 'text' ? (
            <>
              <label style={S.lbl}>متن کامل</label>
              <StableAdminTextarea style={{ ...S.ta, marginBottom: 8 }} defaultValue={it.body || ''} onCommit={(v: string) => chg(i, 'body', v)} rows={3} />
            </>
          ) : (
            <>
              {(it.type || 'video') === 'video' && (
                <>
                  <label style={S.lbl}>کد دستی یوتیوب (VPN روشن)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.youtubeCode || it.manualCode || ''} onCommit={(v: string) => chg(i, 'youtubeCode', v.trim())} placeholder='<iframe src="https://www.youtube.com/embed/..."></iframe>' rows={3} />
                  <label style={S.lbl}>کد دستی آپارات (VPN خاموش)</label>
                  <StableAdminTextarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.aparatCode || ''} onCommit={(v: string) => chg(i, 'aparatCode', v.trim())} placeholder='<iframe src="https://www.aparat.com/..."></iframe>' rows={3} />
                </>
              )}
              {(it.type || 'video') === 'image' && (
                <>
                  <label style={S.lbl}>کد دستی تصویر خارجی (VPN روشن)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.externalCode || it.manualCode || ''} onBlur={(e) => chg(i, 'externalCode', e.target.value.trim())} placeholder='<img src="https://..." /> یا لینک مستقیم' />
                  <label style={S.lbl}>کد دستی تصویر داخلی (VPN خاموش)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.internalCode || ''} onBlur={(e) => chg(i, 'internalCode', e.target.value.trim())} placeholder='<img src="https://..." /> یا لینک مستقیم' />
                </>
              )}
              {(it.type || 'video') === 'audio' && (
                <>
                  <label style={S.lbl}>کد دستی صوتی خارجی (VPN روشن)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.externalCode || it.manualCode || ''} onBlur={(e) => chg(i, 'externalCode', e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم' />
                  <label style={S.lbl}>کد دستی صوتی داخلی (VPN خاموش)</label>
                  <textarea dir="ltr" style={{ ...S.ta, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5, minHeight: 54 }} defaultValue={it.internalCode || ''} onBlur={(e) => chg(i, 'internalCode', e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم' />
                </>
              )}
              <label style={{ ...S.lbl, marginTop: 4 }}>نمایش از طریق</label>
              <select style={{ ...S.inp, marginBottom: 8 }} value={it.displayMode || 'auto'} onChange={(e) => chg(i, 'displayMode', e.target.value)}>
                <option value="aparat">فقط آپارات</option>
                <option value="youtube">فقط یوتیوب</option>
                <option value="auto">هر دو خودکار (بر اساس VPN)</option>
              </select>
              <label style={{ ...S.lbl, marginTop: 4 }}>دسته‌بندی نمایش</label>
              <select style={{ ...S.inp, marginBottom: 8 }} value={it.mediaCategory || 'experience'} onChange={(e) => chg(i, 'mediaCategory', e.target.value)}>
                <option value="experience">تجربه والدین</option>
                <option value="height">رشد قد</option>
                <option value="appetite">بی‌اشتهایی</option>
                <option value="mind">هوش</option>
              </select>
              <label style={{ ...S.lbl, marginTop: 8 }}>لینک تصویر بندانگشتی (اختیاری)</label>
              <StableAdminInput dir="ltr" type="text" style={{ ...S.inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }} defaultValue={it.thumbnail || ''} onCommit={(v: string) => chg(i, 'thumbnail', v.trim())} placeholder="https://...jpg" />
            </>
          )}
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
