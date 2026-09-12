-- 20260912130000_one_tracking_code_per_phone.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- «یک کد پیگیری برای هر شمارهٔ تماس — برای همیشه»
--
-- مشکل: ایندکس submissions_tracking_code_unique_idx یکتایی «سراسری» کد را اجباری
-- می‌کرد، در حالی که سیاست محصول این است که همهٔ فرم‌های یک شماره یک کد مشترک
-- داشته باشند. نتیجه: فرم دومِ همان شماره با خطای یکتایی (23505) رد می‌شد و کاربر
-- پیام «ساخت کد پیگیری انجام نشد» می‌گرفت؛ هیچ ردیفی هم در پنل «فرم‌ها و داده‌ها»
-- ثبت نمی‌شد.
--
-- راه‌حل: جدول نگاشت شماره → کد با دو ضمانت دیتابیسی:
--   PRIMARY KEY (full_phone)     ⇒ هر شماره فقط یک کد
--   UNIQUE (tracking_code)       ⇒ هر کد فقط متعلق به یک شماره
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.phone_tracking_codes (
  full_phone     text primary key,
  tracking_code  text not null,
  created_at     timestamptz not null default now(),
  constraint phone_tracking_codes_code_unique unique (tracking_code)
);

comment on table public.phone_tracking_codes is
  'نگاشت رسمی شمارهٔ تماس به کد پیگیری؛ یک کد برای هر شماره برای همیشه';

-- هیچ کلاینتی (anon / authenticated) حق خواندن یا نوشتن این جدول را ندارد؛
-- فقط Edge Functionها با service_role (که از RLS عبور می‌کند) به آن دسترسی دارند.
alter table public.phone_tracking_codes enable row level security;
revoke all on table public.phone_tracking_codes from public;
revoke all on table public.phone_tracking_codes from anon;
revoke all on table public.phone_tracking_codes from authenticated;

-- پیش‌فرض سوپابیس به نقش‌های API روی جدولِ تازه فقط حق «خواندن» می‌دهد؛ بدون این grant
-- تابع لبه نمی‌تواند نگاشت را بنویسد و بی‌صدا به مسیر سازگار برمی‌گردد.
grant select, insert, update, delete on table public.phone_tracking_codes to service_role;

-- ایندکس قدیمیِ ناسازگار با سیاست «یک کد برای هر شماره» حذف می‌شود.
-- (ستون tracking_code یک ستون generated از payload->>'trackingCode' است.)
drop index if exists public.submissions_tracking_code_unique_idx;

-- جست‌وجوی سریع با کد پیگیری (بدون الزام یکتایی)
create index if not exists submissions_tracking_code_lookup_idx
  on public.submissions ((payload ->> 'trackingCode'));

-- ── بک‌فیل: کد رسمی هر شماره از سوابق موجود (قدیمی‌ترین کد برنده است) ──
-- سوابق حذف‌شدهٔ نرم هم شمرده می‌شوند تا کد یک کاربر بعد از بازیابی هم عوض نشود.
with candidates as (
  select
    s.full_phone,
    coalesce(nullif(s.payload ->> 'code', ''), nullif(s.payload ->> 'trackingCode', '')) as code,
    row_number() over (
      partition by s.full_phone
      order by s.created_at asc, s.id asc
    ) as rn
  from public.submissions s
  where s.full_phone is not null
    and s.full_phone <> ''
    and coalesce(nullif(s.payload ->> 'code', ''), nullif(s.payload ->> 'trackingCode', '')) is not null
),
first_code as (
  select full_phone, code from candidates where rn = 1
),
-- اگر یک کد (به‌خطای دادهٔ قدیمی) به دو شماره چسبیده باشد، فقط یکی نگه داشته می‌شود
deduped as (
  select full_phone, code,
         row_number() over (partition by code order by full_phone) as code_rn
  from first_code
)
insert into public.phone_tracking_codes (full_phone, tracking_code)
select full_phone, code
from deduped
where code_rn = 1
on conflict (full_phone) do nothing;

-- ── بک‌فیل ردیف‌های بدون کد: فقط اگر شماره‌شان کد رسمی داشته باشد ──
-- (کد تازه برای سوابق قدیمی ساخته نمی‌شود؛ اولین ثبت بعدیِ آن شماره کد می‌سازد.)
update public.submissions s
set payload = jsonb_set(s.payload, '{trackingCode}', to_jsonb(m.tracking_code)),
    updated_at = now()
from public.phone_tracking_codes m
where m.full_phone = s.full_phone
  and coalesce(nullif(s.payload ->> 'trackingCode', ''), '') = ''
  and s.payload ->> 'type' is distinct from 'user';
