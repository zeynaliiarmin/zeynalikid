# Zeynalikid — Stage 11 Hotfix 2026-08-07 — Hamburger RTL Arrow Fix

این نسخه بر پایه stage11-final-release (b4355ac) + اصلاح فلش منوی همبرگری می‌باشد.

## اصلاح انجام شده
- **HamburgerMenu.tsx**: فلش آیتم فعال از کاراکتر متنی `‹`/`›` به SVG وکتور حرفه‌ای تغییر کرد.
  - فارسی (RTL): `transform: scaleX(-1)` → فلش `‹` به سمت چپ (به سمت مرکز صفحه)
  - انگلیسی (LTR): فلش `›` به سمت راست (به سمت مرکز صفحه)
  - استایل: دایره پس‌زمینه `rgba(122,18,212,.08)` + سایز 22×22 + رنگ `var(--zk-primary)`
  - قبل: `{isRtl ? '‹' : '›'}` — بعد: SVG `<polyline points="9 18 15 12 9 6"/>` با scaleX
  - دلیل: کاراکتر متنی در فونت Vazirmatn در بعضی سایزها ناخوانا بود، SVG دقیق و متقارن است.
- **sw.js (هر دو اپ)**: نسخه از `zkid-v10-2026-08-06` به `zkid-v11-2026-08-07-hamburger-rtl-fix` ارتقا یافت تا کش قدیمی بِلافاصله پاک شود.
- **بیلد دوگانه تایید شد**: هر دو پروژه `npm run build` موفق (main + form)

## قوانین 12 گانه رعایت شد
بدون تغییر Logic/Route/Payment/Schema/Validation — فقط UI/UX

## دیپلوی
```bash
# جایگزینی در ریپو و پوش
git add zeynalikid-main/src/components/HamburgerMenu.tsx zeynalikid-main/public/sw.js zeynalikid-form/public/sw.js
git commit -m "hotfix: hamburger RTL arrow SVG fix + SW v11"
git push origin main
# ورسل به صورت خودکار هر دو پروژه را redeploy می‌کند (Root Directory ها قبلاً ست شده)
```

## تست
- فارسی: منو را باز کن → خانه فعال → فلش باید به سمت چپ (‹) و در سمت چپ ردیف (نزدیک مرکز) باشد
- انگلیسی: Home فعال → فلش به سمت راست (›) و در سمت راست ردیف

