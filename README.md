# زینالیکید (Zeynalikid)

پلتفرم مستقل مشاوره، آموزش، دوره‌ها و پیگیری رشد و تغذیه کودک و نوجوان.

## Stack

- React 19 + TypeScript + Vite 8
- Supabase Postgres, Storage and Edge Functions
- Vercel
- PWA عمومی و پنل مدیریت

## Local development

```bash
npm ci
npm run dev
```

## Required verification

```bash
npm run check
```

## Security model

- مرورگر فقط کلید publishable/anon را دریافت می‌کند.
- فایل‌های حساس private و فقط با Signed URL کوتاه‌مدت قابل دسترسی‌اند.
- عملیات مدیریت فقط از Edge Function و نشست معتبر انجام می‌شود.
- منبع رسمی دیتابیس `supabase/migrations/` است.

راهنمای استقرار: `DEPLOYMENT.md`
