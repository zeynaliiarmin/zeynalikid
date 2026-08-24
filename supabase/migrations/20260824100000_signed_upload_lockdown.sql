-- Final Storage lockdown after storage-upload Edge Function + frontend deployment.
-- All writes now require a short-lived signed token. Public users retain read-only
-- access only to intentionally public content buckets (images and media).

begin;

drop policy if exists storage_temporary_insert_images on storage.objects;
drop policy if exists storage_temporary_insert_media on storage.objects;
drop policy if exists storage_temporary_insert_files on storage.objects;
drop policy if exists storage_temporary_insert_voice on storage.objects;
drop policy if exists storage_temporary_insert_tongue on storage.objects;
drop policy if exists storage_temporary_insert_receipts on storage.objects;

-- Recreate intended read policies idempotently. Private user buckets deliberately
-- have no anonymous SELECT/UPDATE/DELETE policy.
drop policy if exists storage_public_read_images on storage.objects;
drop policy if exists storage_public_read_media on storage.objects;
create policy storage_public_read_images on storage.objects
  for select to anon, authenticated using (bucket_id='images');
create policy storage_public_read_media on storage.objects
  for select to anon, authenticated using (bucket_id='media');

-- Existing long-lived sessions are shortened without deleting session history.
update public.admin_sessions
set expires_at = least(expires_at, now() + interval '8 hours')
where is_revoked=false and expires_at > now() + interval '8 hours';

commit;
