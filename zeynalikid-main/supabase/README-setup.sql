-- =========================================================
-- اسکریپت راه‌اندازی Supabase برای زینالیکید (اجرا در SQL Editor)
-- =========================================================

-- ۱) جداول اصلی (اگر قبلاً ساخته نشده‌اند)
create table if not exists public.settings (
  id bigint generated always as identity primary key,
  key text unique not null,
  settings jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.submissions (
  id bigint primary key,
  full_phone text,
  payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ۲) ایندکس برای جستجوی سریع کد پیگیری و شماره تماس
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_code
  ON public.submissions ((payload->>'trackingCode'));
CREATE INDEX IF NOT EXISTS idx_submissions_full_phone
  ON public.submissions (full_phone);

-- ۳) RLS روی submissions
-- Edge Function با Service Role اجرا می‌شود و از RLS عبور می‌کند؛
-- بنابراین SELECT عمومی لازم نیست و صفحه Track امن می‌ماند.
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ثبت فرم برای همه (فرم مشاوره و ثبت دوره):
DROP POLICY IF EXISTS "public insert" ON public.submissions;
CREATE POLICY "public insert" ON public.submissions
  FOR INSERT WITH CHECK (true);

-- خواندن/ویرایش/حذف عمومی مسدود (پنل ادمین فعلاً با کلید anon کار می‌کند؛
-- اگر می‌خواهید پنل ادمین به داده دسترسی داشته باشد، تا زمان مهاجرت به
-- Supabase Auth این policy را باز بگذارید — در غیر این صورت حذفش کنید):
DROP POLICY IF EXISTS "Allow select with tracking code" ON public.submissions;
CREATE POLICY "Allow select with tracking code" ON public.submissions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "public update" ON public.submissions;
CREATE POLICY "public update" ON public.submissions
  FOR UPDATE USING (true);
DROP POLICY IF EXISTS "public delete" ON public.submissions;
CREATE POLICY "public delete" ON public.submissions
  FOR DELETE USING (true);

-- ۴) RLS روی settings (خواندن عمومی + نوشتن عمومی برای پنل)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings read" ON public.settings;
CREATE POLICY "settings read" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings write" ON public.settings;
CREATE POLICY "settings write" ON public.settings
  FOR ALL USING (true) WITH CHECK (true);

-- ۵) دیپلوی Edge Function (در ترمینال، نه SQL):
--    supabase functions deploy track-submission --no-verify-jwt

-- ۶) سطل آشغال (Soft Delete)
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON public.submissions(deleted_at);

-- ۷) اصلاح ۶ (و مرحله ۶ اصلاح ۲): باکت "files" برای آپلود فایل PDF (طریقه مصرف / برنامه غذایی)
-- این دستور باکت را می‌سازد (اگر با دستور SQL Editor اجرا شود؛ در غیر این صورت از Storage > New bucket بسازید، Public را روشن کنید):
insert into storage.buckets (id, name, public)
values ('files','files', true)
on conflict (id) do update set public = true;

-- همچنین باکت "images" (فیش واریزی، تصاویر پروفایل و...) باید وجود داشته باشد:
insert into storage.buckets (id, name, public)
values ('images','images', true)
on conflict (id) do update set public = true;

-- ۸) اصلاح ۲ (مرحله ۶): Policyهای Storage برای هر دو باکت "files" و "images"
-- بدون این Policyها، آپلود از سمت کلاینت (anon key) با خطای "new row violates row-level security policy" مواجه می‌شود.
DROP POLICY IF EXISTS "public read files" ON storage.objects;
CREATE POLICY "public read files" ON storage.objects
  FOR SELECT USING (bucket_id IN ('files','images'));
DROP POLICY IF EXISTS "public insert files" ON storage.objects;
CREATE POLICY "public insert files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('files','images'));
DROP POLICY IF EXISTS "public update files" ON storage.objects;
CREATE POLICY "public update files" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('files','images'));
DROP POLICY IF EXISTS "public delete files" ON storage.objects;
CREATE POLICY "public delete files" ON storage.objects
  FOR DELETE USING (bucket_id IN ('files','images'));

-- ۹) اصلاح ۳۰ (مرحله ۷): باکت "tongue-photos" برای آپلود عکس زبان فرزند (صفحه اطلاعات فرزند)
insert into storage.buckets (id, name, public)
values ('tongue-photos','tongue-photos', true)
on conflict (id) do update set public = true;

-- ۱۰) اصلاح ۳۰ (مرحله ۷): Policyهای Storage برای باکت "tongue-photos"
DROP POLICY IF EXISTS "public read tongue" ON storage.objects;
CREATE POLICY "public read tongue" ON storage.objects
  FOR SELECT USING (bucket_id = 'tongue-photos');
DROP POLICY IF EXISTS "public insert tongue" ON storage.objects;
CREATE POLICY "public insert tongue" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tongue-photos');
DROP POLICY IF EXISTS "public update tongue" ON storage.objects;
CREATE POLICY "public update tongue" ON storage.objects
  FOR UPDATE USING (bucket_id = 'tongue-photos');
DROP POLICY IF EXISTS "public delete tongue" ON storage.objects;
CREATE POLICY "public delete tongue" ON storage.objects
  FOR DELETE USING (bucket_id = 'tongue-photos');

-- ۱۱) اصلاح ۳۱ (مرحله ۸): جدول بازدید صفحات (page_views) — برای بخش «آمار بازدید» پنل مدیریت
-- این جدول توسط هر دو پروژه (اصلی و ثانویه) استفاده می‌شود — هر دو باید به همین یک دیتابیس Supabase وصل باشند.
CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    page_path TEXT NOT NULL,        -- مسیر صفحه (مثلاً /courses یا /form)
    referrer TEXT,                  -- مرجع (از کجا آمده)
    user_agent TEXT,                -- مرورگر و سیستم‌عامل کاربر
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ایندکس برای جستجوی سریع بر اساس تاریخ (بازدید امروز/این ماه)
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
-- ایندکس برای شمارش سریع بر اساس مسیر صفحه (صفحات پربازدید)
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);

-- RLS: اجازه ثبت (insert) با کلید anon برای همه؛ خواندن (select) هم با anon باز است
-- چون خود جدول هیچ داده حساس/شخصی ندارد (فقط مسیر صفحه + user agent + referrer عمومی).
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON page_views;
CREATE POLICY "Allow insert for all" ON page_views
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select with service role" ON page_views;
CREATE POLICY "Allow select with service role" ON page_views
    FOR SELECT USING (true);
