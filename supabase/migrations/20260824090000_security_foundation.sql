-- Security hardening foundation — 2026-08-24
-- Read/write access is deliberately narrow. Admin operations continue through
-- Edge Functions using service_role. Existing rows and storage objects are not changed.

begin;

-- ---------------------------------------------------------------------------
-- Stable server-side identifiers and tracking-code uniqueness
-- ---------------------------------------------------------------------------
do $$
declare
  item record;
  seq_name text;
  identity_flag text;
begin
  for item in
    select * from (values
      ('submissions','id','submissions_id_seq'),
      ('reviews','id','reviews_id_seq'),
      ('user_questions','id','user_questions_id_seq')
    ) as x(table_name,column_name,sequence_name)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      select is_identity into identity_flag
      from information_schema.columns
      where table_schema='public' and table_name=item.table_name and column_name=item.column_name;

      -- Identity columns already own and manage their internal sequence.
      if coalesce(identity_flag,'NO') <> 'YES' then
        seq_name := format('public.%I', item.sequence_name);
        execute format('create sequence if not exists %s', seq_name);
        execute format(
          'select setval(%L, greatest(coalesce((select max(%I) from public.%I),0),1), coalesce((select max(%I) from public.%I),0) > 0)',
          seq_name, item.column_name, item.table_name, item.column_name, item.table_name
        );
        execute format('alter sequence %s owned by public.%I.%I', seq_name, item.table_name, item.column_name);
        execute format('alter table public.%I alter column %I set default nextval(%L::regclass)', item.table_name, item.column_name, seq_name);
      end if;
    end if;
  end loop;
end $$;

alter table public.submissions
  add column if not exists tracking_code text
  generated always as ((payload ->> 'trackingCode')) stored;

create unique index if not exists submissions_tracking_code_unique_idx
  on public.submissions (tracking_code)
  where tracking_code is not null and tracking_code <> '';

-- ---------------------------------------------------------------------------
-- Public tables: deny-by-default, grant only the exact public operations used
-- by the application. service_role bypasses RLS and remains the admin path.
-- ---------------------------------------------------------------------------
alter table public.submissions enable row level security;
alter table public.settings enable row level security;
alter table public.user_questions enable row level security;
alter table public.reviews enable row level security;
alter table public.page_views enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_devices enable row level security;
alter table public.error_logs enable row level security;

-- Normalize the two historical admin-device schemas so one Edge Function works
-- safely in both projects. Existing columns/data are preserved.
alter table public.admin_devices add column if not exists user_agent text not null default '';
alter table public.admin_devices add column if not exists is_revoked boolean not null default false;

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('submissions','settings','user_questions','reviews','page_views','admin_sessions','admin_devices','error_logs')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

revoke all on table public.submissions from anon, authenticated;
revoke all on table public.settings from anon, authenticated;
revoke all on table public.user_questions from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.page_views from anon, authenticated;
revoke all on table public.admin_sessions from anon, authenticated;
revoke all on table public.admin_devices from anon, authenticated;
revoke all on table public.error_logs from anon, authenticated;

-- Temporary compatibility: direct public submission insert remains available
-- until the server-side create-submission function is deployed in the next migration.
grant insert (id, full_phone, payload, created_at, updated_at, deleted_at)
  on public.submissions to anon, authenticated;
create policy submissions_public_insert
  on public.submissions for insert to anon, authenticated
  with check (
    full_phone is not null
    and length(full_phone) between 7 and 32
    and jsonb_typeof(payload)='object'
    and coalesce(length(payload::text),0) <= 250000
    and deleted_at is null
  );

-- Public questions can only be submitted as pending. Answers and moderation
-- remain exclusively behind admin-api/public-questions.
grant insert (id, phone, question, question_en, voice_note_url, page_source, status, created_at)
  on public.user_questions to anon, authenticated;
create policy user_questions_public_insert
  on public.user_questions for insert to anon, authenticated
  with check (
    status='pending'
    and length(question) between 1 and 5000
    and coalesce(length(phone),0) <= 32
    and coalesce(length(voice_note_url),0) <= 2000
    and coalesce(length(page_source),0) <= 200
  );

-- Public review submission + approved-only, column-limited read.
grant insert (id, course_id, reviewer_name, rating, comment, status, placements, created_at, updated_at, phone, course_ids, phone_country)
  on public.reviews to anon, authenticated;
grant select (id, course_id, reviewer_name, rating, comment, status, placements, course_ids, phone_country, public_phone, created_at)
  on public.reviews to anon, authenticated;
create policy reviews_public_insert_pending
  on public.reviews for insert to anon, authenticated
  with check (
    status='pending'
    and rating between 1 and 5
    and length(reviewer_name) between 1 and 200
    and coalesce(length(comment),0) <= 5000
    and coalesce(length(phone),0) <= 32
  );
create policy reviews_public_select_approved
  on public.reviews for select to anon, authenticated
  using (status='approved');

-- Anonymous analytics is write-only and constrained to reasonable field sizes.
grant insert (page_path, referrer, user_agent, created_at)
  on public.page_views to anon, authenticated;
create policy page_views_public_insert
  on public.page_views for insert to anon, authenticated
  with check (
    length(page_path) between 1 and 500
    and coalesce(length(referrer),0) <= 1000
    and coalesce(length(user_agent),0) <= 1000
  );

-- Explicit service-role documentation policies for security-sensitive tables.
create policy admin_sessions_service_role on public.admin_sessions
  for all to service_role using (true) with check (true);
create policy admin_devices_service_role on public.admin_devices
  for all to service_role using (true) with check (true);
create policy error_logs_service_role on public.error_logs
  for all to service_role using (true) with check (true);
create policy settings_service_role on public.settings
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Centralized security state, credential hashes and admin audit events
-- ---------------------------------------------------------------------------
create table if not exists public.security_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.security_rate_limits enable row level security;
revoke all on table public.security_rate_limits from anon, authenticated;
drop policy if exists security_rate_limits_service_role on public.security_rate_limits;
create policy security_rate_limits_service_role on public.security_rate_limits
  for all to service_role using (true) with check (true);

create table if not exists public.admin_credentials (
  owner_phone text primary key,
  password_hash text not null,
  password_salt text not null,
  password_iterations integer not null default 210000 check (password_iterations >= 100000),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_credentials enable row level security;
revoke all on table public.admin_credentials from anon, authenticated;
drop policy if exists admin_credentials_service_role on public.admin_credentials;
create policy admin_credentials_service_role on public.admin_credentials
  for all to service_role using (true) with check (true);

create table if not exists public.admin_audit_logs (
  id bigint generated by default as identity primary key,
  actor_phone text,
  session_id text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs alter column session_id type text using session_id::text;
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs(action,created_at desc);
alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from anon, authenticated;
drop policy if exists admin_audit_logs_service_role on public.admin_audit_logs;
create policy admin_audit_logs_service_role on public.admin_audit_logs
  for all to service_role using (true) with check (true);

grant all on table public.security_rate_limits to service_role;
grant all on table public.admin_credentials to service_role;
grant all on table public.admin_audit_logs to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer default 0
) returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.security_rate_limits%rowtype;
  v_count integer;
  v_start timestamptz;
  v_blocked timestamptz;
begin
  if p_key is null or length(p_key) < 8 or length(p_key) > 200
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400
     or p_block_seconds < 0 or p_block_seconds > 604800 then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into public.security_rate_limits(rate_key,window_started_at,request_count,blocked_until,updated_at)
  values (p_key,v_now,1,null,v_now)
  on conflict (rate_key) do update set
    window_started_at = case
      when public.security_rate_limits.blocked_until is null
       and excluded.updated_at - public.security_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
      then excluded.updated_at else public.security_rate_limits.window_started_at end,
    request_count = case
      when public.security_rate_limits.blocked_until is null
       and excluded.updated_at - public.security_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
      then 1 else public.security_rate_limits.request_count + 1 end,
    updated_at = excluded.updated_at
  returning * into v_row;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return query select false,0,greatest(1,ceil(extract(epoch from (v_row.blocked_until-v_now)))::integer);
    return;
  end if;

  v_count := v_row.request_count;
  v_start := v_row.window_started_at;
  if v_count > p_limit then
    if p_block_seconds > 0 then
      v_blocked := v_now + make_interval(secs => p_block_seconds);
      update public.security_rate_limits
        set blocked_until=v_blocked,updated_at=v_now
        where rate_key=p_key;
      return query select false,0,p_block_seconds;
    else
      return query select false,0,greatest(1,ceil(extract(epoch from ((v_start + make_interval(secs => p_window_seconds))-v_now)))::integer);
    end if;
    return;
  end if;

  return query select true,greatest(0,p_limit-v_count),0;
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer,integer) to service_role;

-- The event-trigger helper must never be exposed as a public RPC.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.zkid_set_updated_at()') is not null then
    execute 'alter function public.zkid_set_updated_at() set search_path = public, pg_temp';
  end if;
  if to_regprocedure('public.zkid_admin_touch_last_seen()') is not null then
    execute 'alter function public.zkid_admin_touch_last_seen() set search_path = public, pg_temp';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private user files, bounded uploads, no public update/delete.
-- Direct INSERT remains temporarily for compatibility and is removed after the
-- signed-upload Edge Function and frontend are deployed.
-- ---------------------------------------------------------------------------
update storage.buckets set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'] where id='images';
update storage.buckets set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'] where id='media';
update storage.buckets set public=false,file_size_limit=15728640,allowed_mime_types=array['application/pdf'] where id='files';
update storage.buckets set public=false,file_size_limit=5242880,allowed_mime_types=array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','video/webm'] where id='voice-notes';
update storage.buckets set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='tongue-photos';
update storage.buckets set public=false,file_size_limit=6291456,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='receipts';

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='storage' and tablename='objects'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy storage_public_read_images on storage.objects
  for select to anon, authenticated using (bucket_id='images');
create policy storage_public_read_media on storage.objects
  for select to anon, authenticated using (bucket_id='media');

-- Compatibility-only upload policies; no anonymous read/update/delete is granted
-- for private user-file buckets.
create policy storage_temporary_insert_images on storage.objects
  for insert to anon, authenticated with check (bucket_id='images');
create policy storage_temporary_insert_media on storage.objects
  for insert to anon, authenticated with check (bucket_id='media');
create policy storage_temporary_insert_files on storage.objects
  for insert to anon, authenticated with check (bucket_id='files');
create policy storage_temporary_insert_voice on storage.objects
  for insert to anon, authenticated with check (bucket_id='voice-notes' and (storage.foldername(name))[1]='voice-notes');
create policy storage_temporary_insert_tongue on storage.objects
  for insert to anon, authenticated with check (bucket_id='tongue-photos' and (storage.foldername(name))[1]='tongue');
create policy storage_temporary_insert_receipts on storage.objects
  for insert to anon, authenticated with check (bucket_id='receipts' and (storage.foldername(name))[1]='receipts');

commit;
