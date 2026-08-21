-- =========================================================
-- Zeynalikid — Error Logs schema (جدول خطاهای فرانت‌اند)
-- فقط سرویس‌رول (Edge Functions) می‌تواند بخواند/بنویسد؛
-- کاربر عمومی هیچ دسترسی‌ای ندارد (RLS بدون هیچ policy عمومی).
-- پاکسازی خودکار قدیمی‌ها در Edge Function «log-error» انجام می‌شود.
-- =========================================================

create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  kind text not null default 'error',
  message text not null default '',
  stack text,
  page_path text,
  user_agent text,
  lang text,
  created_at timestamptz not null default now()
);

create index if not exists idx_error_logs_created_at
  on public.error_logs (created_at);

alter table public.error_logs enable row level security;

-- (بدون هیچ policy عمومی → فقط service_role دسترسی دارد)
