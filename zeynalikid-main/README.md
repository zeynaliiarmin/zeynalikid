# زینالیکید — پروژه اصلی (A) — دوره‌ها + پنل مدیریت

این پروژه شامل **سیستم ثبت‌نام دوره‌ها** و **پنل مدیریت کامل** است و به همان Supabase پروژه ثانویه (B) متصل می‌شود.

## صفحات
| view | صفحه | توضیح |
|---|---|---|
| `courses` | CoursesPage | معرفی تب‌ها و دوره‌ها + انتخاب مقصد |
| `course-shipping` | CourseShippingPage | گیرنده، آدرس، روش ارسال، تخمین تحویل |
| `course-payment` | CoursePaymentPage | بانک، کپی کارت/شبا، فیش یا متن پیامک |
| `course-confirm` | CourseConfirmPage | خلاصه و تأیید نهایی |
| `course-done` | CourseDonePage | پیام موفقیت |
| `admin-login` | AdminLoginPage | ورود پنل مدیریت |
| `admin` | AdminPanel | پنل مدیریت کامل (داده‌ها، تنظیمات، ارتباط، دوره‌ها، ارسال و بانک، امنیت) |

## ورود به پنل مدیریت
آدرس سایت را با هش `#admin` باز کنید:
```
https://zeynalikid.vercel.app/#admin
```
شماره و رمز همان مقادیر ذخیره‌شده در تنظیمات (`adminPhone` / `VITE_ADMIN_PASSWORD` / `emergencyToken`) هستند.

- `LanguageSwitcher` در همه صفحات عمومی نمایش داده می‌شود؛ در روند ثبت‌نام دوره (انتخاب دوره، ارسال، پرداخت، تأیید، موفقیت) و در پنل مدیریت مخفی است (به‌جز صفحه ورود ادمین).
- دکمه «بازگشت به صفحه اصلی» در صفحه ورود ادمین و پنل مدیریت، به هوم همین پروژه برمی‌گردد. دکمه‌های ارجاع به «فرم مشاوره» به `VITE_APP_B_URL` می‌روند.

## راه‌اندازی
```bash
npm install
cp .env.example .env   # سپس مقادیر را وارد کنید
npm run dev
npm run build
```

## متغیرهای محیطی
| متغیر | توضیح | پیش‌فرض |
|---|---|---|
| `VITE_SUPABASE_URL` | آدرس Supabase (مشترک با پروژه ثانویه) | — |
| `VITE_SUPABASE_ANON_KEY` | کلید anon | — |
| `VITE_APP_B_URL` | آدرس پروژه ثانویه (B) — فرم مشاوره؛ دکمه‌های بازگشت به فرم مشاوره | `https://zeynalikid-form.vercel.app` |
| `VITE_ADMIN_PASSWORD` | رمز ورود پنل مدیریت | — |

> توجه (اصلاح ۱۸): نام‌گذاری پروژه‌ها اصلاح شد — این پوشه اکنون **پروژه اصلی (A)** نام دارد و متغیر `VITE_APP_B_URL` به آدرس **پروژه ثانویه (B)** یعنی فرم مشاوره اشاره می‌کند.

## هماهنگی با Supabase
- **خواندن تنظیمات:** هنگام بارگذاری از جدول `settings` (کلید `app_settings`) با `mergeSettings`.
- **ذخیره تنظیمات:** ویرایشگرهای پنل مدیریت با `saveSettings` (upsert) در همان جدول ذخیره می‌کنند ← پروژه ثانویه هم به‌روز می‌شود.
- **داده‌های پنل:** لیست فرم‌ها با `fetchSubmissions` خوانده می‌شود؛ ویرایش با `updateSubmission` و حذف با `deleteMultipleSubmissions` همگام می‌شود.
- **ثبت‌نام دوره:** با `createSubmission` در جدول `submissions` ذخیره می‌شود.
- بدون Supabase، همه عملیات با `localStorage` انجام می‌شود.
