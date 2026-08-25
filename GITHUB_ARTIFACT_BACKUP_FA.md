# Backup رمزگذاری‌شده GitHub Artifact

## وضعیت

این مسیر، Backup فعال و بدون نیاز به کارت بانکی است. کد Cloudflare R2 حذف نشده و برای آینده در `scripts/external-backup.mjs` باقی مانده است.

## برنامه

- هر دو روز یک Backup
- نگهداری هر Artifact برای ۲۰ روز
- پروژه‌ها کاملاً جدا
- ZIP پیش از Upload با AES-256-GCM رمزگذاری می‌شود
- کلید رمزگذاری فقط در GitHub Secret و فایل Recovery خصوصی مالک قرار دارد

## محتوا

- ۱۵ جدول فعلی
- Schema، Policy، Index، Function، Trigger و Grant
- Bucket metadata
- تمام فایل‌های Storage
- Manifest و SHA-256

## دریافت و بازیابی

1. در GitHub Repository وارد Actions شوید.
2. Workflow با نام **External encrypted backup** را باز کنید.
3. Artifact اجرای موردنظر را دانلود کنید.
4. فایل Recovery Key خصوصی را از محل امن خود بردارید.
5. در پوشه Repository اجرا کنید:

```bash
BACKUP_ENCRYPTION_KEY="کلید همان پروژه" node scripts/decrypt-backup.mjs downloaded.zip.enc restored.zip
```

6. `restored.zip` را باز و `manifest.json` و Hashها را بررسی کنید.

## نکات مهم

- اگر Recovery Key گم شود، Artifactهای قبلی قابل بازیابی نیستند.
- فایل Recovery Key نباید داخل GitHub، چت عمومی یا Repository قرار گیرد.
- افرادی که به Actions Repository دسترسی دارند می‌توانند Artifact رمزگذاری‌شده را دانلود کنند، اما بدون کلید نمی‌توانند محتوای آن را بخوانند.
- سهمیه GitHub باید دوره‌ای بررسی شود؛ با حجم فعلی و نگهداری ۲۰ روز، مصرف فعلی مناسب است اما با افزایش فایل‌ها ممکن است بیشتر شود.
