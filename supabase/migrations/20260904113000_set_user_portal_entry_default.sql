-- Product decision approved on 2026-09-04: existing public entry preference becomes User Portal.
-- Only the requested entryMode key changes; all other app settings remain untouched.
begin;

update public.settings
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{entryMode}', '"user"'::jsonb, true)
where key = 'app_settings'
  and coalesce(settings->>'entryMode', '') is distinct from 'user';

commit;
