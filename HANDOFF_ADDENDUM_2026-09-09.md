
## بستهٔ سوم — پنل مدیریت + دیپلوی دستی af (2026-09-09)

1. **برچسب‌های منوی بک‌آپ:** آبجکت‌سازی به `pdf` / `Excel` / `webp` / `txt` بدون ایموجی در AdminPanel (کلاسیک) و DataNewView (نمای جدید) — هر دو ریپو.
2. **حذف «ثبت‌نام پنل کاربر» از داشبورد:** `formSubs = subs.filter(type course|consultation)` در AdminPanel؛ داده واقعی: zk داشت ۷ کارت user مقابل ۴ فرم واقعی → داشبورد ۶۴٪ نجس شده بود. مهاجرت `_subs(type)`/`turning set` کامل شد.
3. **کلیدهای ابطال‌شده:** کد فیلتر (`status!=='revoked'`) از قبل بود — علت نمایش آن‌ها: **دیپلوی af کهنه** (GitHub→Vercel برای ریپوی afradikid پس از کامیت `a74bc3c` در 09-09 قطع شد). دیپلوی دستی با Vercel API (`POST /v13/deployments` + alias) انجام شد؛ **کاربر باید اتصال Git را در Vercel دوباره وصل کند** (Vercel > afradikid > Settings > Git).
4. **بک‌آپ خودکار تلگرام:** نگهبان history در `settings.telegramBackup={autoAt,hash}` (سمت سرور) + لاگ محلی → پاک شدن cache مرورگر دیگر ارسال تکراری ایجاد نمی‌کند.
5. نسخهٔ desk-sw روی هر دو: `zkid-desk-v11-2026-09-09-panel-fixes`.
- کامیت‌ها: zk `18829c2`، af `d317f21` | DIIPLOI دستی af: `dpl_3DFJwVKsLbFeaqVKCppUeMF65JSD` (READY).
