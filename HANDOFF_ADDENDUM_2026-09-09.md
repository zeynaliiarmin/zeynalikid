
## بستهٔ سوم — پنل مدیریت + دیپلوی دستی af (2026-09-09)

1. **برچسب‌های منوی بک‌آپ:** آبجکت‌سازی به `pdf` / `Excel` / `webp` / `txt` بدون ایموجی در AdminPanel (کلاسیک) و DataNewView (نمای جدید) — هر دو ریپو.
2. **حذف «ثبت‌نام پنل کاربر» از داشبورد:** `formSubs = subs.filter(type course|consultation)` در AdminPanel؛ داده واقعی: zk داشت ۷ کارت user مقابل ۴ فرم واقعی → داشبورد ۶۴٪ نجس شده بود. مهاجرت `_subs(type)`/`turning set` کامل شد.
3. **کلیدهای ابطال‌شده:** کد فیلتر (`status!=='revoked'`) از قبل بود — علت نمایش آن‌ها: **دیپلوی af کهنه** (GitHub→Vercel برای ریپوی afradikid پس از کامیت `a74bc3c` در 09-09 قطع شد). دیپلوی دستی با Vercel API (`POST /v13/deployments` + alias) انجام شد؛ **کاربر باید اتصال Git را در Vercel دوباره وصل کند** (Vercel > afradikid > Settings > Git).
4. **بک‌آپ خودکار تلگرام:** نگهبان history در `settings.telegramBackup={autoAt,hash}` (سمت سرور) + لاگ محلی → پاک شدن cache مرورگر دیگر ارسال تکراری ایجاد نمی‌کند.
5. نسخهٔ desk-sw روی هر دو: `zkid-desk-v11-2026-09-09-panel-fixes`.
- کامیت‌ها: zk `18829c2`، af `d317f21` | DIIPLOI دستی af: `dpl_3DFJwVKsLbFeaqVKCppUeMF65JSD` (READY).

## بستهٔ چهارم — خودشناسی API برای ایجنت‌ها + education policy (2026-09-09)

1. **content-api خودشناسی (whoami/capabilities/describe/me):** پاسخ JSON شامل brand، scopes، قابلیت‌ها (گروه‌بندی‌شده + flat_actions)، پیام آمادهٔ فارسی «من به این موارد دسترسی دارم: ...»، راهنمای curl و یادآوری get_policy — برای هر کلید معتبر بدون نیاز به اسکوپ. درخواست سرور-به-سرور (بدون Origin) هم کار می‌کند.
2. **رد کلید ریشهٔ تابع بدون اکشن (GET):** راهنمای عمومی اتصال (نام برند، فرمت هدر، first steps، الگوی اکشن‌ها و bulk) بدون نیاز به کلید.
3. **401/403 راهنما:** هر دو خطا حالا hint_fa/hint_en مشخصی دارند («به content-api وصل شو» + اشاره به whoami) تا ایجنت گمراه نشود. `action نامعتبر` هم به whoami اشاره می‌کند.
4. **صفحهٔ امنیت (ApiKeysManager):** هنگام ساخت کلید، بلاک «📋 بلاک آماده برای چسباندن به ایجنت» با یک کلیک، شامل endpoint + کلید + روش اتصال + فهرست اسکوپ‌های فارسی؛ روی کلیدهای قدیمی دکمهٔ «کپی بلاک ایجنت» (بدون کلید مخفی) مشابه دارد.
5. **education content-policy:** لایهٔ مسدودکنندهٔ قبل همهٔ handlerها روی create_/update_/set_/bulk_ می‌چرخد و با `collectStrings` متون تو در تو (item/updates/items) را می‌کاود — با درخواست زنده در هر دو پروژه تأیید شد (422 no_doctor_referral).
6. تست‌های زنده: whoami با کلید واقعی Agent-1 (zk) 200؛ کلید با اسکوپ `{banners,reviews,courses}` دقیقاً همان ۳ بخش (+ flat_actions محدود) را برگرداند و `list_education` 403 شد؛ create/delete_review مجاز؛ GET عمومی 200.
- کامیت: zk `ab9c68b`، af `5afc90f` | دیپلوی edge بردی روی هر دو پروژه | Vercel دستی af `dpl_8EyEWHgSbQg2RaZsZrgT7mDi4mQB`.
- desk-sw: `zkid-desk-v12-2026-09-09-agent-ready`.
- کلیدهای فعلی: zk `sk_live_GS21...27b2` (Agent-1, all) — af «Agent-Content-1» و «Jd» هر دو **revoked** هستند؛ مالک باید کلید تازه بسازد.
