-- Hardening migration: tighten storage policies, enforce login rate limits,
-- shorten admin sessions further, and add safeguards.
-- Idempotent / forward-compatible: any table/column that doesn't exist is safely skipped
-- (we use do-blocks with exists checks).
begin;

-- 1) Storage: drop ALL existing storage.objects policies and recreate a minimal,
--    audited set. Public buckets (images, media) remain read-only for anon.
--    Private buckets (voice-notes, tongue-photos, receipts, files) have no policy
--    for anon/authenticated — all uploads/deletes must go through the storage-upload
--    Edge Function using service_role.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname='storage' and tablename='objects'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy storage_public_read_images on storage.objects
  for select to anon, authenticated using (bucket_id='images');
create policy storage_public_read_media on storage.objects
  for select to anon, authenticated using (bucket_id='media');

-- 2) Service-role-only policies for admin tables.
do $$
declare t text;
begin
  foreach t in array array['admin_sessions','admin_devices','admin_credentials','admin_audit_logs','settings','security_rate_limits','error_logs']
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I_service_role on public.%I', t, t);
      execute format('create policy %I_service_role on public.%I for all to service_role using (true) with check (true)', t, t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- 3) Tighten submissions: anon can only INSERT new rows (no SELECT/UPDATE/DELETE).
drop policy if exists submissions_public_insert on public.submissions;
create policy submissions_public_insert on public.submissions
  for insert to anon, authenticated with check (true);
revoke select, update, delete on public.submissions from anon;
-- Note: do NOT restrict INSERT column list here; the submissions schema evolves and
--       a hard-coded column list would break inserts when new columns are added.
grant insert on public.submissions to anon, authenticated;

-- 4) Admin login rate-limit / lockout table.
create table if not exists public.admin_login_attempts (
  key text primary key,
  attempts int not null default 0,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_login_attempts from anon, authenticated;
drop policy if exists admin_login_attempts_service_role on public.admin_login_attempts;
create policy admin_login_attempts_service_role on public.admin_login_attempts
  for all to service_role using (true) with check (true);
grant all on public.admin_login_attempts to service_role;

-- 5) Shorten any existing long-lived admin sessions to at most 8 hours (idempotent).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='admin_sessions' and column_name='expires_at') then
    update public.admin_sessions
    set expires_at = least(expires_at, now() + interval '8 hours')
    where is_revoked=false and expires_at > now() + interval '8 hours';
  end if;
end $$;

-- 6) "Third assistant" (source finder) cache.
create table if not exists public.source_finder_cache (
  query_key text primary key,
  results jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);
alter table public.source_finder_cache enable row level security;
revoke all on public.source_finder_cache from anon, authenticated;
drop policy if exists source_finder_cache_service_role on public.source_finder_cache;
create policy source_finder_cache_service_role on public.source_finder_cache
  for all to service_role using (true) with check (true);
grant all on public.source_finder_cache to service_role;

-- 7) Record this migration in supabase_migrations.schema_migrations (if present) so the
--    CLI doesn't try to re-apply it.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='supabase_migrations' and table_name='schema_migrations') then
    insert into supabase_migrations.schema_migrations (version, statements, name)
    values ('20260905180000', '{}'::text[], 'security_hardening')
    on conflict (version) do nothing;
    insert into supabase_migrations.schema_migrations (version, statements, name)
    values ('20260906090000', '{}'::text[], 'source_finder_cache')
    on conflict (version) do nothing;
  end if;
end $$;

commit;
