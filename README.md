# Zeynalikid (زینالیکید)

سامانهٔ والد-محور مشاوره و آموزش رشد/تغذیه کودک و نوجوان (۲ تا ۱۷ سال).

## اپ‌ها
- `zeynalikid-main` — سایت اصلی: Home، Courses، Products، Education، Profile، Growth، پنل ادمین
  - لایو: https://zeynalikid.vercel.app · ادمین: https://zeynalikid.vercel.app/admin-login
- `zeynalikid-form` — فرم مستقل مشاوره
  - لایو: https://zeynalikid-form.vercel.app

## وضعیت پروژه (Stage 10 — نهایی)
مراحل ۱ تا ۱۰ کامل شده‌اند: دیزاین‌سیستم و بازطراحی کامل مارکتینگ (۱–۶)، فونداسیون/داشبورد/فرم‌های پنل ادمین (7A–7C)، بخش Education + FAQ هوشمند (۸)، PWA + SEO فنی + Chunking (۹) و QA نهایی/پولیش (۱۰).

## راه‌اندازی
```bash
cd zeynalikid-main && cp .env.example .env   # مقداردهی Supabase/URLها
npm install && npm run build
# فرم:
cd ../zeynalikid-form && cp .env.example .env && npm install && npm run build
```

## دیپلوی (Vercel)
هر پوشه یک پروژهٔ جداست؛ خروجی build از همین سورس fresh گرفته شود (dist در ZIP نیست).
- PWA: `manifest.webmanifest` + `sw.js` فقط در build تولیدی رجیستر می‌شود.
- SEO: `robots.txt` و `sitemap.xml` در `public/` هر دو پروژه؛ فرم `noindex` است.
- Supabase: پنج جدول `profiles, growth_tracking, wishlist, reviews, education_items` + RLS مطابق اسکریپت Stage 6.

## یادداشت
- فرم مشاوره (zeynalikid-form) بخش محافظت‌شده است؛ فقط پولیش استایل در مراحل مجاز اعمال شده.
- محتوای نمونهٔ Education/FAQ برای پیش‌نمایش است و از پنل ادمین قابل جایگزینی است.
