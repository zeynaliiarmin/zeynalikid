# راه‌اندازی Backup خارجی Cloudflare R2

## وضعیت فعلی

کد Backup و زمان‌بندی آماده است، اما تا وقتی اطلاعات R2 در GitHub Secrets قرار نگیرد، Workflow فقط پیام «تنظیم نشده» می‌دهد و هیچ خطایی ایجاد نمی‌کند.

برنامه انتخاب‌شده:

- اجرا: هر دو روز، ساعت تقریبی ۰۲:۲۳ UTC
- نگهداری: ۲۰ روز
- فرمت: ZIP شامل داده جداول، Schema/Policy/Index/Function/Grant، فهرست Bucketها و تمام فایل‌های Storage
- مقصد: Bucket خصوصی Cloudflare R2
- حذف خودکار: فایل‌های قدیمی‌تر از ۲۰ روز

## کاری که مالک باید در Cloudflare انجام دهد

1. در Cloudflare وارد **R2 Object Storage** شوید.
2. یک Bucket خصوصی بسازید؛ پیشنهاد نام: `child-platform-backups`.
3. وارد **Manage R2 API Tokens** شوید.
4. یک Token با دسترسی **Object Read & Write** فقط برای همان Bucket بسازید.
5. این چهار مقدار را امن تحویل دهید:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket Name

## GitHub Secrets موردنیاز

اطلاعات Supabase و R2 با این نام‌ها ذخیره می‌شوند و نباید داخل فایل یا Commit قرار گیرند:

- `BACKUP_SUPABASE_URL`
- `BACKUP_SUPABASE_SERVICE_ROLE_KEY`
- `BACKUP_SUPABASE_ACCESS_TOKEN`
- `BACKUP_SUPABASE_PROJECT_REF`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

## آزمایش انجام‌شده

Dry Run واقعی بدون آپلود R2 اجرا شد و ZIP شامل ۱۵ جدول و ۵۶ فایل Storage «فرزند من» با موفقیت ساخته شد. پس از دریافت کلیدهای R2، یک اجرای دستی Upload و Restore آزمایشی نیز باید انجام شود.
