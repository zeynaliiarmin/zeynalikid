/**
 * exportFormToImage — تولید تصویر JPEG از اطلاعات والد و فرزند یک فرم ثبت‌نام
 *
 * از Canvas برای رسم یک کارت تمیز و خوانا استفاده می‌کند.
 * خروجی: Blob از نوع image/jpeg با کیفیت ۸۰٪
 */

/**
 * تولید تصویر از آبجکت submission
 * فقط اطلاعات بخش والد و فرزند استخراج می‌شود (بدون پرداخت/ارسال)
 */
export async function generateFormImage(submission: any): Promise<Blob> {
  // ─── استخراج اطلاعات ───
  const parentName = submission.pName || submission.parentName || '—';
  const phone = submission.fullPhone || submission.full_phone || '—';
  const childName = submission.childName || submission.child_name || '—';
  const childAge = submission.age || '—';
  const childGender = submission.gender === 'male' ? 'پسر' : submission.gender === 'female' ? 'دختر' : (submission.gender || '—');
  const childHeight = submission.height || '—';
  const childWeight = submission.weight || '—';
  const trackingCode = submission.trackingCode || '—';
  const date = submission.date || '—';
  const topics = Array.isArray(submission.topics) ? submission.topics.join('، ') : (submission.topic || '—');
  const type = submission.type === 'course' ? 'ثبت‌نام دوره' : 'فرم مشاوره';
  const courseTitle = submission.course?.title || '';
  const category = submission.category || '';
  const notes = submission.notes || '';

  // ─── تنظیمات Canvas ───
  const canvas = document.createElement('canvas');
  const width = 600;
  const padding = 24;
  const lineHeight = 38;
  const headerHeight = 90;
  const footerHeight = 50;

  // محاسبه تعداد خطوط
  let linesCount = 12; // baseline
  if (notes) linesCount += 2;
  if (courseTitle) linesCount += 1;
  if (submission.digest && Array.isArray(submission.digest) && submission.digest.length > 0) linesCount += 1;
  if (submission.appetite) linesCount += 1;

  const contentHeight = linesCount * lineHeight + headerHeight + footerHeight + 40;
  const height = Math.max(500, contentHeight);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  // ─── پس‌زمینه ───
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#F8F9FA');
  gradient.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // ─── هدر ───
  // نوار بنفش در بالا
  ctx.fillStyle = '#7A12D4';
  ctx.fillRect(0, 0, width, 6);

  // لوگو / عنوان
  ctx.fillStyle = '#7A12D4';
  ctx.font = 'bold 22px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('زینالیکید', width - padding, 52);

  ctx.fillStyle = '#6B7280';
  ctx.font = '12px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.fillText('Zeynalikid — سامانه مشاوره تخصصی رشد و تغذیه کودکان', width - padding, 72);

  // خط جداکننده
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, 90);
  ctx.lineTo(width - padding, 90);
  ctx.stroke();

  // ─── محتوای اصلی ───
  let y = headerHeight + 2 * lineHeight;

  const drawRow = (label: string, value: string, icon: string) => {
    ctx.fillStyle = '#7A12D4';
    ctx.font = 'bold 14px Vazirmatn, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    const textWidth = ctx.measureText(label + value).width;
    ctx.fillText(`${label}:`, width - padding, y);
    
    ctx.fillStyle = '#1F2937';
    ctx.font = '14px Vazirmatn, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    const labelWidth = ctx.measureText(label + ': ').width;
    ctx.fillText(value, width - padding - labelWidth, y);
    
    y += lineHeight;
  };

  // اطلاعات والد
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 13px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(' اطلاعات والد / سرپرست', width - padding, y);
  y += lineHeight;

  drawRow('نام والد', parentName, '');
  drawRow('شماره تماس', phone, '');
  drawRow('نوع فرم', type, '');

  // خط جداکننده نرم
  ctx.strokeStyle = '#F3F4F6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y - 8);
  ctx.lineTo(width - padding, y - 8);
  ctx.stroke();
  y += 8;

  // اطلاعات فرزند
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 13px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('اطلاعات فرزند', width - padding, y);
  y += lineHeight;

  drawRow('نام فرزند', childName, '');
  drawRow('سن', String(childAge), '');
  drawRow('جنسیت', childGender, '');
  drawRow('قد', String(childHeight) + ' سانتی‌متر', '');
  drawRow('وزن', String(childWeight) + ' کیلوگرم', '️');

  if (courseTitle) {
    drawRow('دوره ثبت‌نامی', courseTitle, '');
  }

  if (Array.isArray(submission.digest) && submission.digest.length > 0) {
    drawRow('مشکل گوارشی', submission.digest.join('، '), '');
  }
  if (submission.appetite) {
    drawRow('وضعیت اشتها', submission.appetite, '️');
  }

  // خط جداکننده نرم
  ctx.strokeStyle = '#F3F4F6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y - 8);
  ctx.lineTo(width - padding, y - 8);
  ctx.stroke();
  y += 8;

  // اطلاعات تکمیلی
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 13px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(' اطلاعات تکمیلی', width - padding, y);
  y += lineHeight;

  drawRow('موضوعات', topics, '');
  drawRow('دسته‌بندی', category || '—', '');
  drawRow('کد پیگیری', trackingCode, '');
  drawRow('تاریخ ثبت', date, '');

  if (notes) {
    ctx.fillStyle = '#7A12D4';
    ctx.font = 'bold 14px Vazirmatn, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('توضیحات:', width - padding, y);
    y += 2;
    
    ctx.fillStyle = '#1F2937';
    ctx.font = '13px Vazirmatn, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    // متن توضیحات با wrap
    const maxWidth = width - 2 * padding - 10;
    const words = String(notes);
    ctx.fillText(words.length > 120 ? words.substring(0, 117) + '...' : words, width - padding - 0, y);
    y += lineHeight;
  }

  // ─── فوتر ───
  y = height - footerHeight;
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y - 8);
  ctx.lineTo(width - padding, y - 8);
  ctx.stroke();

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '11px Vazirmatn, Tahoma, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('تولید شده توسط پنل مدیریت زینالیکید | zeynalikid.vercel.app', width / 2, y + 22);

  // ─── تبدیل به Blob ───
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image blob'));
      }
    }, 'image/jpeg', 0.8);
  });
}
