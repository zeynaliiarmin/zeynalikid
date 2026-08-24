// src/admin/ImagesManager.tsx
// بازطراحی کامل صفحهٔ «تصاویر» در پنل مدیریت.
//
// قوانین رعایت‌شده (پنل ادمین React):
//   - کامپوننت در سطح ماژول تعریف شده (بیرون از AdminPanel) → بدون ریسک Remount / شکستن Hooks.
//   - State محلی برای تَب فعال و مودال‌ها؛ هیچ state ای روی «هر کلید تایپ» در لیست commit نمی‌شود
//     (از defaultValue + onBlur برای ویرایش فیلدها استفاده شده تا پرش صفحه/ازدست رفتن فوکوس رخ ندهد).
//   - برای هر تصویر کتابخانه از key پایدار (id) استفاده می‌شود، نه index.
//
// امکانات:
//   - تب‌های مجزا برای هر بخش: مجوزها / محصولات / دوره‌ها / عمومی
//   - آپلود مستقیم از حافظهٔ گوشی (file picker + drag & drop)
//   - تبدیل خودکار هر فرمت به webp با حداکثر کیفیت و حجم بهینه
//   - تنظیم «کادر» (نسبت ابعاد + موقعیت برش object-position) برای هر تصویر
//   - ذخیرهٔ فوری در Supabase Storage (پوشهٔ مجزا برای هر بخش) + گزینهٔ «ذخیره در پروژه»
//   - گالری این صفحه با صفحات مقصد هماهنگ است: عکس‌های هر تب فقط در همان صفحهٔ مقصد دیده می‌شوند.

import React, { useState } from 'react';
import {
  ZkUploadIcon, ZkImageIcon, ZkPlusIcon, ZkTrashIcon, ZkCheckCircleIcon,
  ZkArrowUpIcon, ZkArrowDownIcon, ZkDownloadIcon,
} from './adminIcons';import ImageCropper from './ImageCropper';
import { uploadAdminFile } from '../lib/storageUpload';

// ─── بخش‌ها و پوشهٔ هر بخش ──────────────────────────────────────────
export const IMAGE_SECTIONS: { id: string; label: string; folder: string; target: string; hint: string }[] = [
  { id: 'general', label: 'عمومی', folder: 'general', target: 'تصاویر عمومی سایت', hint: 'تصاویر عمومی، هیرو، تراست و فرم مشاوره' },
];

// نسبت‌های ابعاد آماده برای تنظیم کادر
export const ASPECT_PRESETS: { label: string; value: string }[] = [
  { label: 'مربع (۱:۱)', value: '1 / 1' },
  { label: '۴:۳', value: '4 / 3' },
  { label: '۳:۴', value: '3 / 4' },
  { label: '۱۶:۹', value: '16 / 9' },
  { label: '۹:۱۶', value: '9 / 16' },
  { label: 'هیرو (۱.۰۵:۱)', value: '1.05 / 1' },
  { label: 'آزاد', value: '' },
];

// موقعیت‌های برش (object-position)
export const POSITIONS: { label: string; value: string }[] = [
  { label: 'مرکز', value: 'center' },
  { label: 'بالا', value: 'top' },
  { label: 'پایین', value: 'bottom' },
  { label: 'چپ', value: 'left' },
  { label: 'راست', value: 'right' },
];

// ─── تنظیم کادر تصویر (نسبت ابعاد + موقعیت برش) — قابل استفاده در هر ویرایشگری ───
// value: { aspectRatio?: string; objectPosition?: string }  /  onChange: (patch) => void
export function FrameControls({ T, S, value, onChange }: {
  T: any; S: any; value?: { aspectRatio?: string; objectPosition?: string }; onChange: (patch: { aspectRatio?: string; objectPosition?: string }) => void;
}) {
  const v = value || {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6, marginBottom: 8 }}>
      <div>
        <label style={{ ...S.lbl, fontSize: 11, color: T.ttl, fontWeight: 700 }}>کادر / نسبت ابعاد</label>
        <select
          style={S.inp}
          defaultValue={v.aspectRatio || ''}
          onChange={(e) => onChange({ aspectRatio: e.target.value })}
        >
          {ASPECT_PRESETS.map((p) => <option key={p.label} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ ...S.lbl, fontSize: 11, color: T.ttl, fontWeight: 700 }}>موقعیت برش</label>
        <select
          style={S.inp}
          defaultValue={v.objectPosition || 'center'}
          onChange={(e) => onChange({ objectPosition: e.target.value })}
        >
          {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );
}

interface LibraryItem {
  id: string;
  url: string;
  alt: string;
  aspectRatio: string;
  objectPosition: string;
  storagePath: string;
  enabled: boolean;
}

type CropJob = {
  mode: 'new' | 'library';
  src: string;
  objectUrl: boolean;
  originalName: string;
  aspectRatio: string;
  item?: LibraryItem;
};

type Props = {
  T: any;
  S: any;
  editCfg: any;
  setEditCfg: (next: any) => void;
  setSave: (next: any) => void;
  uid: () => number | string;
  fileToData: (f: File, oldUrl?: string, folder?: string) => Promise<string>;
  deleteStoredImage: (url?: string) => Promise<void>;
  supabase: any;
  isSupabaseConfigured: boolean;
  AdminBtn: () => any;
};

// ─── تبدیل خودکار هر تصویر به webp با حداکثر کیفیت و حجم بهینه ──────
async function toWebpHighQuality(file: File, maxLongSide = 1920): Promise<Blob> {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif|avif|bmp|gif)$/i.test(file.name);
  if (!isImage) throw new Error('فایل انتخاب‌شده تصویر نیست.');

  // SVG / GIF بی‌حرکت بدون تغییر نگه داشته می‌شوند (webp برای SVG/گیف‌های متحرک مناسب نیست)
  if (file.type === 'image/svg+xml' || /\.[sg]v?g$/i.test(file.name)) {
    return file;
  }
  if (file.type === 'image/gif' && !file.type.includes('static')) {
    // گف متحرک: بدون تبدیل (حفظ انیمیشن)
    return file;
  }

  let bmp: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === 'function') {
    try { bmp = await createImageBitmap(file); }
    catch { bmp = await loadImage(file); }
  } else {
    bmp = await loadImage(file);
  }

  const w = bmp.width;
  const h = bmp.height;
  let nw = w, nh = h;
  if (Math.max(w, h) > maxLongSide) {
    const aspect = w / h;
    if (w >= h) { nw = maxLongSide; nh = Math.round(maxLongSide / aspect); }
    else { nh = maxLongSide; nw = Math.round(maxLongSide * aspect); }
  }

  const canvas = document.createElement('canvas');
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('پردازش تصویر ممکن نشد.');
  ctx.drawImage(bmp as any, 0, 0, nw, nh);
  if ('close' in bmp && typeof (bmp as any).close === 'function') { try { (bmp as any).close(); } catch {} }

  // webp با کیفیت بالا (۰٫۹۲)؛ در صورت پشتیبانی‌نشدن، از JPEG با کیفیت بالا
  const useWebP = supportsWebP();
  const type = useWebP ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, 0.92));
  if (!blob) throw new Error('تبدیل تصویر به webp انجام نشد.');
  return blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

let _webp: boolean | null = null;
function supportsWebP(): boolean {
  if (_webp !== null) return _webp;
  try {
    if (typeof document === 'undefined') { _webp = false; return false; }
    const c = document.createElement('canvas'); c.width = 1; c.height = 1;
    _webp = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch { _webp = false; }
  return _webp;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// ─── کامپوننت اصلی ────────────────────────────────────────────────
export default function ImagesManager(props: Props) {
  const { T, S, editCfg, setEditCfg, setSave, uid, fileToData, deleteStoredImage, supabase, isSupabaseConfigured, AdminBtn } = props;
  const [tab, setTab] = useState('general');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [cropJob, setCropJob] = useState<CropJob | null>(null);

  const lib = (editCfg?.images?.library || {});
  const items: LibraryItem[] = Array.isArray(lib[tab]) ? lib[tab] : [];

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const setItems = (next: LibraryItem[]) => {
    const images = { ...(editCfg?.images || {}), library: { ...lib, [tab]: next } };
    setEditCfg({ ...editCfg, images });
  };

  const addItem = (it: LibraryItem) => setItems([...items, it]);

  const updateItem = (id: string, patch: Partial<LibraryItem>) => {
    setItems(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeItem = async (it: LibraryItem) => {
    if (it.storagePath && supabase && isSupabaseConfigured) {
      try { await deleteStoredImage(it.url); } catch (e) { console.warn('remove image err', e); }
    }
    setItems(items.filter((x) => x.id !== it.id));
    notify('تصویر حذف شد');
  };

  const moveItem = (i: number, dir: -1 | 1) => {
    const a = [...items];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setItems(a);
  };

  const closeCrop = () => {
    if (cropJob?.objectUrl && cropJob.src.startsWith('blob:')) URL.revokeObjectURL(cropJob.src);
    setCropJob(null);
  };

  // فایل ابتدا آماده می‌شود و پیش از هر آپلود، ویرایشگر لمسی کادر باز می‌شود.
  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy('prepare');
    try {
      const blob = await toWebpHighQuality(file);
      setCropJob({
        mode: 'new',
        src: URL.createObjectURL(blob),
        objectUrl: true,
        originalName: file.name.replace(/\.[^/.]+$/, '') || 'image',
        aspectRatio: '4 / 3',
      });
    } catch (err: any) {
      notify(err?.message || 'خطا در آماده‌سازی تصویر');
    } finally {
      setBusy(null);
    }
  };

  const openLibraryCrop = (item: LibraryItem) => {
    setCropJob({
      mode: 'library',
      src: item.url,
      objectUrl: false,
      originalName: item.alt || 'image',
      aspectRatio: item.aspectRatio || '4 / 3',
      item,
    });
  };

  const saveCroppedLibraryImage = async (file: File) => {
    if (!cropJob) return;
    setBusy('crop-save');
    try {
      const section = IMAGE_SECTIONS.find((item) => item.id === tab);
      const folder = section?.folder || tab;
      let url = '';
      let storagePath = '';

      if(isSupabaseConfigured){
        url=await uploadAdminFile('images',folder,file);
        try{storagePath=decodeURIComponent(new URL(url).pathname.split('/object/public/images/')[1]||'')}catch{storagePath=''}
      }else{
        url = await blobToDataUrl(file);
      }

      const frame = cropJob.aspectRatio || '';
      if (cropJob.mode === 'new') {
        addItem({
          id: String(uid()),
          url,
          alt: cropJob.originalName,
          aspectRatio: frame,
          objectPosition: 'center',
          storagePath,
          enabled: true,
        });
        notify('تصویر با کادر انتخاب‌شده ذخیره شد');
      } else if (cropJob.item) {
        const oldItem = cropJob.item;
        updateItem(oldItem.id, { url, storagePath, aspectRatio: frame, objectPosition: 'center' });
        if (oldItem.storagePath && oldItem.url !== url) {
          try { await deleteStoredImage(oldItem.url); } catch (error) { console.warn('old cropped image cleanup failed', error); }
        }
        notify('کادر تصویر بروزرسانی شد');
      }
      closeCrop();
    } catch (err: any) {
      notify(err?.message || 'ذخیرهٔ کادر تصویر انجام نشد');
    } finally {
      setBusy(null);
    }
  };

  // ذخیرهٔ تصویر در پروژه (public/images) — برای دانلود/ثبت در ریپو
  const saveToProject = (it: LibraryItem) => {
    try {
      const a = document.createElement('a');
      a.href = it.url;
      a.download = (it.url.split('/').pop() || 'image.webp');
      document.body.appendChild(a); a.click(); a.remove();
      notify('فایل تصویر دانلود شد. آن را در public/images قرار دهید و Deploy کنید.');
    } catch (e) {
      notify('دانلود ممکن نشد');
    }
  };

  const sectionInfo = IMAGE_SECTIONS.find((s) => s.id === tab)!;

  return (
    <>
      <Box title={<><ZkImageIcon size={16} color={T.ttl} /> مرکز مدیریت تصاویر</>}>
        <p style={{ fontSize: 11, color: T.mut, margin: '0 0 14px', lineHeight: 1.8 }}>
          این صفحه فقط برای تصاویر <b>عمومی</b> سایت است (هیرو، تراست، فرم مشاوره، دربارهٔ ما).
          عکس‌های محصولات، دوره‌ها و مجوزها از همان صفحهٔ خودشان آپلود و تنظیم می‌شوند.
          پس از آپلود، تصویر به‌صورت خودکار به <b>webp</b> با حداکثر کیفیت و حجم بهینه تبدیل می‌شود.
        </p>

        {/* عکس‌های تکی عمومی (فرم مشاوره + دربارهٔ ما) + کادر هیرو — فقط در تَب عمومی */}
        {tab === 'general' && (
          <>
            <SingleImageEditor
              T={T} S={S} AdminBtn={AdminBtn} editCfg={editCfg} setEditCfg={setEditCfg}
              supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} deleteStoredImage={deleteStoredImage}
              field="hero"
              title="تصویر اصلی بالای صفحهٔ خانه (Hero)"
              note="همان تصویر مادر و کودک کنار عنوان و دکمه‌های «ثبت درخواست مشاوره» و «مشاهده دوره‌ها». تصویر جدیدی که اینجا ذخیره کنید مستقیماً جایگزین تصویر فعلی سایت می‌شود."
              fallbackUrl="/images/asset13c-hero-mother-child.webp"
              fallbackAlt="مادر و کودک در بنر اصلی صفحهٔ خانه"
              sourceFile="asset13c-hero-mother-child.webp"
              uploadLabel="بارگذاری و جایگزینی تصویر اصلی صفحهٔ خانه"
              highlight
              defaultAspectRatio="1.05 / 1"
              imgStyle={{ width: 220, maxHeight: 200, objectFit: 'cover', objectPosition: 'center', borderRadius: 12 }}
            />
            <SingleImageEditor
              T={T} S={S} AdminBtn={AdminBtn} editCfg={editCfg} setEditCfg={setEditCfg}
              supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} deleteStoredImage={deleteStoredImage}
              field="consultationPhoto" title="عکس کارشناس فرم مشاوره" note="در بالای فرم مشاوره نمایش داده می‌شود" defaultAspectRatio="1 / 1" circular imgStyle={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center' }}
            />
            <SingleImageEditor
              T={T} S={S} AdminBtn={AdminBtn} editCfg={editCfg} setEditCfg={setEditCfg}
              supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} deleteStoredImage={deleteStoredImage}
              field="trustBox" title="عکس باکس اعتماد (فرمولاسیون / مجوزها)" note="عکس کنار متن اعتمادساز در صفحهٔ اصلی (مثل «فرمولاسیون آلمان»)" defaultAspectRatio="4 / 3" imgStyle={{ width: 200, maxHeight: 150, objectFit: 'cover', objectPosition: 'center', borderRadius: 10 }}
            />
            <SingleImageEditor
              T={T} S={S} AdminBtn={AdminBtn} editCfg={editCfg} setEditCfg={setEditCfg}
              supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} deleteStoredImage={deleteStoredImage}
              field="trustBox" title="عکس باکس اعتماد (فرمولاسیون / مجوزها)" note="عکس کنار متن اعتمادساز در صفحهٔ اصلی (مثل «فرمولاسیون آلمان»)" defaultAspectRatio="4 / 3" imgStyle={{ width: 200, maxHeight: 150, objectFit: 'cover', objectPosition: 'center', borderRadius: 10 }}
            />          </>
        )}

        {/* منطقهٔ آپلود */}
        <label
          className="zkad-drop"
          style={{ border: `1.5px dashed ${T.brd}`, borderRadius: 14, padding: '18px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: T.badge }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; await handleUpload(f); }}
        >
          <ZkUploadIcon size={26} color={T.acc} />
          <div style={{ fontSize: 13, fontWeight: 800, color: T.ttl, marginTop: 6 }}>
            {busy === 'prepare' ? 'در حال آماده‌سازی تصویر…' : `انتخاب تصویر برای «${sectionInfo.label}» و تنظیم کادر`}
          </div>
          <div style={{ fontSize: 11, color: T.mut, marginTop: 4 }}>
            پس از انتخاب فایل، ویرایشگر لمسی باز می‌شود؛ تصویر نهایی با کادر تأییدشده و فرمت webp ذخیره خواهد شد.
          </div>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => { const f = e.target.files?.[0]; await handleUpload(f); e.target.value = ''; }}
          />
        </label>

        {/* گالری */}
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T.mut, fontSize: 12 }}>
            هنوز تصویری در این تَب نیست. یک تصویر آپلود کنید.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {items.map((it, i) => (
              <div key={it.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, overflow: 'hidden', background: T.card, display: 'flex', flexDirection: 'column' }}>
                {/* پیش‌نمایش با کادر */}
                <div style={{ width: '100%', height: 120, overflow: 'hidden', background: '#00000010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={it.url}
                    alt={it.alt || ''}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      objectPosition: it.objectPosition || 'center',
                      aspectRatio: it.aspectRatio || undefined,
                    }}
                    onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <label style={{ fontSize: 11, color: T.ttl, fontWeight: 800 }}>متن جایگزین (Alt)</label>
                  <input
                    style={S.inp}
                    defaultValue={it.alt}
                    onBlur={(e) => updateItem(it.id, { alt: e.target.value })}
                    placeholder="Alt"
                  />
                  <label style={{ fontSize: 11, color: T.ttl, fontWeight: 800 }}>کادر / نسبت ابعاد</label>
                  <select
                    style={S.inp}
                    defaultValue={it.aspectRatio || ''}
                    onChange={(e) => updateItem(it.id, { aspectRatio: e.target.value })}
                  >
                    {ASPECT_PRESETS.map((p) => <option key={p.label} value={p.value}>{p.label}</option>)}
                  </select>
                  <label style={{ fontSize: 11, color: T.ttl, fontWeight: 800 }}>موقعیت برش</label>
                  <select
                    style={S.inp}
                    defaultValue={it.objectPosition || 'center'}
                    onChange={(e) => updateItem(it.id, { objectPosition: e.target.value })}
                  >
                    {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button
                    type="button"
                    style={{ ...AdminBtn(), width: '100%', color: T.acc }}
                    onClick={() => openLibraryCrop(it)}
                  >
                    <ZkImageIcon size={14} /> تنظیم کادر لمسی
                  </button>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                    <button type="button" style={AdminBtn()} title="بالا" onClick={() => moveItem(i, -1)}><ZkArrowUpIcon size={13} /></button>
                    <button type="button" style={AdminBtn()} title="پایین" onClick={() => moveItem(i, 1)}><ZkArrowDownIcon size={13} /></button>
                    <button type="button" style={AdminBtn()} title="ذخیره در پروژه" onClick={() => saveToProject(it)}><ZkDownloadIcon size={13} /></button>
                    <button type="button" style={{ ...AdminBtn(), color: T.err, marginInlineStart: 'auto' }} title="حذف" onClick={() => removeItem(it)}><ZkTrashIcon size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <button style={S.btn} onClick={() => setSave(editCfg)}><ZkCheckCircleIcon size={14} /> ذخیرهٔ تنظیمات تصاویر</button>
          <span style={{ fontSize: 11, color: T.mut }}>
            عکس‌های تَب «{sectionInfo.label}» در {sectionInfo.target} قابل انتخاب‌اند.
          </span>
        </div>
      </Box>

      {cropJob && (
        <ImageCropper
          src={cropJob.src}
          T={T}
          title={cropJob.mode === 'new' ? 'تنظیم کادر تصویر جدید' : `تنظیم کادر «${cropJob.originalName}»`}
          aspectRatio={cropJob.aspectRatio}
          allowAspectChange
          onAspectRatioChange={(value) => setCropJob((current) => current ? { ...current, aspectRatio: value } : current)}
          fileName={`${cropJob.originalName || 'image'}.webp`}
          onCancel={busy === 'crop-save' ? () => {} : closeCrop}
          onDone={saveCroppedLibraryImage}
        />
      )}
      {toast && <div style={{ position: 'fixed', bottom: 20, left: 20, background: T.pop, border: `1px solid ${T.ok}`, color: T.ok, borderRadius: 12, padding: '10px 14px', zIndex: 9600 }}>{toast}</div>}
    </>
  );
}

// ─── انتخاب‌گر گالری برای صفحات مقصد ────────────────────────────────
// در صفحهٔ مجوزها/محصولات/دوره‌ها نمایش داده می‌شود تا فقط عکس‌های همان بخش انتخاب شوند.
export function LibraryPicker({
  T, S, editCfg, section, onSelect, current, AdminBtn, label = 'انتخاب از گالری',
}: {
  T: any; S: any; editCfg: any; section: string; onSelect: (url: string) => void; current?: string; AdminBtn: () => any; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const list: any[] = Array.isArray(editCfg?.images?.library?.[section]) ? editCfg.images.library[section] : [];
  const info = IMAGE_SECTIONS.find((s) => s.id === section);
  return (
    <>
      <button type="button" style={AdminBtn()} onClick={() => setOpen(true)}><ZkImageIcon size={14} /> {label}</button>
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(30,20,30,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: '100%', maxWidth: 640, maxHeight: '88vh', overflow: 'auto', background: T.pop, borderRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: T.ttl, fontWeight: 800, flex: 1 }}>
                انتخاب تصویر از گالری «{info?.label || section}»
              </h3>
              <button type="button" style={AdminBtn()} onClick={() => setOpen(false)}>بستن</button>
            </div>
            {list.length === 0 ? (
              <p style={{ color: T.mut, fontSize: 12, margin: 0 }}>هنوز تصویری در این گالری نیست. اول از صفحهٔ «تصاویر» آپلود کنید.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
                {list.map((it: any) => (
                  <div
                    key={it.id}
                    onClick={() => { onSelect(it.url); setOpen(false); }}
                    style={{ cursor: 'pointer', border: `2px solid ${current === it.url ? T.acc : T.brd}`, borderRadius: 10, overflow: 'hidden', background: '#00000010' }}
                  >
                    <img src={it.url} alt={it.alt || ''} style={{ width: '100%', height: 90, objectFit: 'cover', objectPosition: it.objectPosition || 'center', aspectRatio: it.aspectRatio || undefined }} />
                    <div style={{ fontSize: 10, color: T.mut, padding: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.alt || 'تصویر'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── ویرایشگر یک تصویر تکی (برای عکس‌های عمومی مثل فرم مشاوره / دربارهٔ ما) ───
function SingleImageEditor({
  T, S, AdminBtn, editCfg, setEditCfg, field, title, note, imgStyle, defaultAspectRatio,
  circular = false, fallbackUrl = '', fallbackAlt = '', sourceFile = '', uploadLabel = '', highlight = false,
  supabase, isSupabaseConfigured, deleteStoredImage,
}: {
  T: any; S: any; AdminBtn: () => any; editCfg: any; setEditCfg: (n: any) => void;
  field: string; title: string; note?: string; imgStyle?: React.CSSProperties; defaultAspectRatio?: string;
  circular?: boolean; fallbackUrl?: string; fallbackAlt?: string; sourceFile?: string; uploadLabel?: string; highlight?: boolean;
  supabase?: any; isSupabaseConfigured?: boolean; deleteStoredImage: (url?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropObjectUrl, setCropObjectUrl] = useState(false);
  const [replaceOld, setReplaceOld] = useState<string | undefined>();
  const val = editCfg?.images?.[field] || {};
  const upd = (patch: any) => setEditCfg({ ...editCfg, images: { ...(editCfg?.images || {}), [field]: { ...val, ...patch } } });
  const cropAspect = Object.prototype.hasOwnProperty.call(val, 'aspectRatio') ? (val.aspectRatio || '') : (defaultAspectRatio || '');
  const displayUrl = String(val.url || fallbackUrl || '').trim();
  const displayAlt = String(val.alt || fallbackAlt || '').trim();
  const isUsingFallback = !!fallbackUrl && displayUrl === fallbackUrl;

  const closeCrop = () => {
    if (cropObjectUrl && cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropObjectUrl(false);
  };

  const prepareFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await toWebpHighQuality(file);
      setReplaceOld(val.url);
      setCropObjectUrl(true);
      setCropSrc(URL.createObjectURL(blob));
    } catch (err: any) {
      alert(err?.message || 'آماده‌سازی تصویر انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  const saveCrop = async (file: File) => {
    setBusy(true);
    try {
      let url = '';
      let storagePath = '';
      if(isSupabaseConfigured){
        url=await uploadAdminFile('images',`general/${field}`,file);
        try{storagePath=decodeURIComponent(new URL(url).pathname.split('/object/public/images/')[1]||'')}catch{storagePath=''}
      }else{
        url = await blobToDataUrl(file);
      }

      upd({ url, storagePath, enabled: true, aspectRatio: cropAspect, objectPosition: 'center' });
      if (replaceOld && replaceOld !== url) {
        try { await deleteStoredImage(replaceOld); } catch (error) { console.warn('old single image cleanup failed', error); }
      }
      closeCrop();
    } catch (err: any) {
      alert(err?.message || 'ذخیرهٔ تصویر انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  const previewAspect = Object.prototype.hasOwnProperty.call(val, 'aspectRatio') ? val.aspectRatio : defaultAspectRatio;
  return (
    <div
      className="zkad-media-slot"
      data-image-setting={field}
      style={{
        marginBottom: 16,
        ...(highlight ? { border: `2px solid ${T.acc}`, borderRadius: 16, padding: 14, background: T.soft } : {}),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: highlight ? 14 : 13, color: T.ttl, flex: 1 }}><ZkImageIcon size={14} color={T.ttl} /> {title}</b>
        {highlight && (
          <span style={{ fontSize: 10.5, color: isUsingFallback ? T.mut : T.ok, fontWeight: 800 }}>
            {isUsingFallback ? 'تصویر پیش‌فرض فعال است' : 'تصویر اختصاصی فعال است'}
          </span>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={val.enabled !== false} onChange={(e) => upd({ enabled: e.target.checked })} /> نمایش
        </label>
      </div>
      {note && <p style={{ fontSize: 11, color: T.mut, margin: '0 0 8px', lineHeight: 1.9 }}>{note}</p>}
      {sourceFile && (
        <div style={{ fontSize: 10.5, color: T.mut, marginBottom: 9 }}>
          فایل پیش‌فرض: <code dir="ltr" style={{ color: T.acc, fontWeight: 700 }}>{sourceFile}</code>
        </div>
      )}
      {displayUrl && (
        <img
          src={displayUrl}
          alt={displayAlt}
          style={{
            maxWidth: 220,
            maxHeight: 180,
            objectFit: 'cover',
            borderRadius: 10,
            border: `1px solid ${T.brd}`,
            display: 'block',
            marginBottom: 8,
            ...imgStyle,
            objectPosition: val.objectPosition || imgStyle?.objectPosition || 'center',
            aspectRatio: previewAspect || imgStyle?.aspectRatio,
          }}
          onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <FrameControls T={T} S={S} value={{ aspectRatio: previewAspect, objectPosition: val.objectPosition }} onChange={(patch) => upd(patch)} />
      <label
        className="zkad-drop"
        aria-label={uploadLabel || `بارگذاری ${title}`}
        style={{ marginBottom: 8, ...(highlight ? { borderColor: T.acc, background: T.card } : {}) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => { e.preventDefault(); await prepareFile(e.dataTransfer.files?.[0]); }}
      >
        <ZkUploadIcon size={highlight ? 25 : 22} color={highlight ? T.acc : undefined} />
        <span>{busy ? 'در حال پردازش…' : uploadLabel || 'انتخاب تصویر و تنظیم کادر لمسی'}</span>
        <input type="file" accept="image/*" disabled={busy} onChange={async (e) => { await prepareFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      <label style={S.lbl}>متن جایگزین (Alt)</label>
      <input style={S.inp} defaultValue={displayAlt} onBlur={(e) => upd({ alt: e.target.value })} placeholder="Alt" />
      {displayUrl && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
          <button
            type="button"
            style={{ ...AdminBtn(), color: T.acc }}
            onClick={() => { setReplaceOld(val.url); setCropObjectUrl(false); setCropSrc(displayUrl); }}
          >
            <ZkImageIcon size={14} /> تنظیم کادر لمسی
          </button>
          {fallbackUrl && !isUsingFallback && (
            <button
              type="button"
              style={{ ...AdminBtn(), color: T.acc }}
              onClick={() => upd({
                url: fallbackUrl,
                alt: fallbackAlt || val.alt || '',
                storagePath: '',
                enabled: true,
                aspectRatio: defaultAspectRatio || '',
                objectPosition: 'center',
              })}
            >
              بازگشت به تصویر پیش‌فرض
            </button>
          )}
          <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={() => upd({ url: '', storagePath: '', enabled: false })}>عدم نمایش تصویر</button>
        </div>
      )}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          T={T}
          title={`تنظیم کادر ${title}`}
          aspectRatio={cropAspect}
          circular={circular}
          allowAspectChange={!circular}
          onAspectRatioChange={circular ? undefined : (value) => upd({ aspectRatio: value })}
          outputLongSide={circular ? 768 : 1600}
          fileName={`${field}.webp`}
          onCancel={busy ? () => {} : closeCrop}
          onDone={saveCrop}
        />
      )}
    </div>
  );
}

// Box سبک محلی (برای استقلال کامل از AdminPanel)
function Box({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="zkad-panel-card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 13.5, color: 'inherit', margin: '0 0 12px', fontWeight: 800, lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 7 }}>{title}</h3>
      {children}
    </section>
  );
}
