-- =========================================================
-- Zeynalikid — Admin Session schema (admin_sessions, admin_devices)
-- اجرا در SQL Editor پروژه‌ی Supabase افRadi
-- =========================================================

-- ۱) دستگاه‌های واردشده به پنل
create table if not exists public.admin_devices (
  id text primary key,
  device_name text default '',
  platform text default '',
  browser text default '',
  user_agent text default '',
  owner_phone text not null,
  is_revoked boolean not null default false,
  is_active boolean not null default true,
  revoked_at timestamptz,
  biometric_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_admin_devices_owner_phone
  on public.admin_devices (owner_phone);

-- ۲) نشست‌های ادمین
create table if not exists public.admin_sessions (
  id bigint generated always as identity primary key,
  token_hash text not null unique,
  device_id text not null references public.admin_devices(id) on delete cascade,
  owner_phone text not null,
  is_revoked boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_token_hash
  on public.admin_sessions (token_hash);

create index if not exists idx_admin_sessions_owner_phone
  on public.admin_sessions (owner_phone);

create index if not exists idx_admin_sessions_device_id
  on public.admin_sessions (device_id);

-- ۳) RLS: فقط سرویس‌رول (Edge Functions) بتواند این جداول را بخواند/بنویسد
alter table public.admin_devices enable row level security;
alter table public.admin_sessions enable row level security;

drop policy if exists "admin_sessions_service_role" on public.admin_sessions;
create policy "admin_sessions_service_role" on public.admin_sessions
  for all to service_role using (true) with check (true);

drop policy if exists "admin_devices_service_role" on public.admin_devices;
create policy "admin_devices_service_role" on public.admin_devices
  for all to service_role using (true) with check (true);

-- =========================================================
-- Zeynalikid — افزودن‌های بعدی (Reviews columns + media bucket)
-- =========================================================

-- ستون‌های لازم برای reviews (کد admin-api / فرانت می‌خواند و می‌نویسد)
alter table public.reviews add column if not exists placements text[] default array['course_detail'];
alter table public.reviews add column if not exists course_ids text[] default '{}';
alter table public.reviews add column if not exists updated_at timestamptz default now();

-- باکت storage "media" (برای آپلود تصاویر محتوا در ImageUploader)
insert into storage.buckets (id, name, public)
values ('media','media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select using (bucket_id='media');
drop policy if exists "public insert media" on storage.objects;
create policy "public insert media" on storage.objects for insert with check (bucket_id='media');
drop policy if exists "public update media" on storage.objects;
create policy "public update media" on storage.objects for update using (bucket_id='media');
drop policy if exists "public delete media" on storage.objects;
create policy "public delete media" on storage.objects for delete using (bucket_id='media');

-- باکت storage "receipts" (فیش واریزی — آپلود و پیش‌نمایش در فرم پرداخت)
insert into storage.buckets (id, name, public)
values ('receipts','receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "public read receipts" on storage.objects;
create policy "public read receipts" on storage.objects for select using (bucket_id='receipts');
drop policy if exists "public insert receipts" on storage.objects;
create policy "public insert receipts" on storage.objects for insert with check (bucket_id='receipts');
drop policy if exists "public update receipts" on storage.objects;
create policy "public update receipts" on storage.objects for update using (bucket_id='receipts');
drop policy if exists "public delete receipts" on storage.objects;
create policy "public delete receipts" on storage.objects for delete using (bucket_id='receipts');

-- =========================================================
-- Zeynalikid — ستون‌های لازم برای سازگاری کامل کد (منطبق بر Zeynalikid)
-- =========================================================

-- reviews.phone (پنل ادمین می‌خواند؛ در نمایش عمومی strip می‌شود)
alter table public.reviews add column if not exists phone text default '';

-- user_questions.phone (فرم سؤال با شماره تماس)
alter table public.user_questions add column if not exists phone text default '';
