# 🏛️ راهنمای جامع اسکیمای پایگاه داده Supabase برای پلتفرم زینالیکید (Zeynalikid)
### اختصاصی برای استقرار توسط ایجنت GLM و تیم فنی

این سند و اسکریپت SQL همراه آن (`supabase_schema_master.sql`)، شامل تمامی جداول، باکت‌های ذخیره‌سازی Storage، کلیدهای خارجی، ایندکس‌ها، سیاست‌های امنیتی RLS و ساختار هماهنگی بین دوره‌ها و پرونده کودک برای پلتفرم زینالیکید (v5.0 Final Release) می‌باشد.

---

## 🗂️ ۱. باکت‌های ذخیره‌سازی فایل (Supabase Storage Buckets)

| نام باکت (Bucket ID) | دسترسی (Public) | کاربرد و نوع فایل‌ها |
| :--- | :---: | :--- |
| `voice-notes` | ✅ بله | ضبط صوت ۹۰ ثانیه‌ای والدین و سوالات صوتی کاربران (`webm`, `mp4`, `ogg`) |
| `tongue-photos` | ✅ بله | تصاویر ارسالی زبان کودکان جهت ارزیابی طبع و اشتها (`webp`, `jpg`, `png`) |
| `images` | ✅ بله | فیش‌های واریزی، بنرهای سایت، عکس کارشناس و دوره‌ها (`webp`, `jpg`, `png`) |
| `files` | ✅ بله | فایل‌های PDF طریقه مصرف و برنامه‌های غذایی اختصاصی (`pdf`) |

---

## 📊 ۲. ساختار جداول پایگاه داده

### ۲.۱. جدول پرونده‌ها و ثبت‌نام‌ها (`public.submissions`)
جدول مرکزی سامانه که اطلاعات فرم مشاوره و ثبت دوره را با کلید یکتای شماره تلفن و کد رهگیری تجمیع می‌کند:
* `id` (BIGINT): شناسه یکتای عددی
* `tracking_code` (VARCHAR): کد پیگیری یکتا (مانند `ZK12345` یا `ZK-A1B2C3`)
* `type` (VARCHAR): نوع رکورد (`consultation` برای فرم مشاوره یا `course` برای خرید دوره)
* `parent_name` / `parent_phone` / `full_phone`: اطلاعات هویتی و تماس والد
* `gender` / `age` / `height` / `weight`: مشخصات فیزیکی و سن کودک (۲ تا ۱۷ سال)
* `topics` / `digestive_issues` / `appetite_status` / `special_disease` / `special_conditions`: وضعیت سلامت، گوارش و اشتها
* `voice_note_url` / `tongue_photo_urls`: پیوند فایل‌های صوتی و عکس‌های زبان
* `category` / `consultation_status` / `order_status` / `priority` / `follow_ups`: دسته‌بندی و ۵ مرحله پیگیری ادمین
* `meal_plan` / `usage_instructions` / `usage_pdf_url` / `meal_pdf_url`: دستورالعمل‌های اختصاصی مصرف
* `course` / `shipping` / `payment` / `corrective_data`: اطلاعات کامل دوره، آدرس پستی، فیش واریز و اصلاحی

### ۲.۲. جدول تراکنش‌های آنلاین (`public.transactions`)
* `id` (UUID): شناسه تراکنش
* `order_id` / `submission_id`: پیوند به پرونده سفارش
* `gateway`: درگاه پرداخت (`zarinpal`, `idpay`, `payping`, `blubank`, `stripe`, `paypal`, `crypto`)
* `amount` / `currency` / `status` / `ref_id` / `authority`: مشخصات مالی و بانکی

### ۲.۳. جدول نظرات و تجربیات والدین (`public.reviews`)
* `id` (BIGINT): شناسه نظر
* `course_id`: دوره یا بخش مربوطه
* `reviewer_name` / `rating` / `comment`: نام، امتیاز ۱ تا ۵ ستاره و متن نظر
* `status`: وضعیت انتشار (`pending`, `approved`, `rejected`)
* `placements`: آرایه محل‌های مجاز نمایش در سایت (`home`, `courses`, `course_detail`, `consultation`, `faq`, `about`, `track`, `all_places`)

### ۲.۴. جدول سوالات کاربران (`public.user_questions`)
* `id` / `phone` / `question` / `question_en` / `voice_note_url` / `answer` / `answer_en`
* `status`: (`pending`, `answered`, `archived`)
* `is_published_to_faq`: نشانگر تبدیل سوال به FAQ عمومی

### ۲.۵. جدول کاتالوگ دوره‌ها و هماهنگی چند دوره‌ای (`public.courses` و `public.course_tabs`)
* `id` / `tab_id` / `title` / `price` / `discounted_price` / `features`
* `prerequisites` (TEXT[]): پیش‌نیازها و هماهنگی بین دوره‌ها
* `related_courses` (TEXT[]): دوره‌های مکمل پیشنهادی برای رشد همزمان قد، اشتها و هوش

### ۲.۶. جدول مقالات و ویدیوهای علمی متد TC (`public.edu_articles`)
* `id` / `title` / `summary` / `content` / `media_type` (`video`, `audio`, `article`) / `aparat_id` / `youtube_id` / `audio_url`

### ۲.۷. جدول جملات اعتمادساز متحرک (`public.trust_sentences`)
* `id` / `title` / `description` / `category` / `tabs` (آرایه تب‌های نمایش)

### ۲.۸. سایر جداول زیرساختی
* `bank_accounts`: کارت‌ها و شماره‌های شبا
* `products`: انبار مکمل‌ها و طریقه مصرف
* `settings`: تنظیمات سراسری سیستم
* `deleted_submissions`: سطل بازیافت با امکان بازیابی
* `tracking_logs` و `admin_logs`: لاگ‌های امنیتی و پیگیری

---

## 🚀 ۳. نحوه اجرا توسط ایجنت GLM

1. وارد داشبورد **Supabase** شوید.
2. به بخش **SQL Editor** بروید.
3. محتوای فایل `supabase_schema_master.sql` را کپی و اجرا (Run) نمایید.
4. تمامی جداول، کلیدها، باکت‌ها و قوانین RLS با موفقیت ساخته می‌شوند.
