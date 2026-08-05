export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// maxBytes پیش‌فرض ۵۰۰KB است؛ مقدار واقعی از تنظیمات پنل (imageCompressionKB) پاس داده می‌شود.
export const compressImage = async (file: File, maxBytes = 500 * 1024): Promise<Blob> => {
  if (!allowedImageTypes.includes(file.type))
    throw new Error('فرمت تصویر مجاز نیست. فقط jpg، jpeg، png و webp پذیرفته می‌شود.');
  if (file.size <= maxBytes) return file;
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, Math.sqrt(maxBytes / file.size));
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let q = 0.82;
  const type = file.type === 'image/png' ? 'image/webp' : file.type;
  const toBlob = () =>
    new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('compression failed'))), type, q),
    );
  let out = await toBlob();
  // حلقه کاهش کیفیت تا رسیدن به حجم هدف (~۵۰۰ کیلوبایت)
  while (out.size > maxBytes && q > 0.3) {
    q -= 0.1;
    out = await toBlob();
  }
  return out;
};
