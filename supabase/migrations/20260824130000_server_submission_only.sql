-- Public submissions are created only through create-submission, which assigns a
-- cryptographically random unique tracking code and validates the payload.

begin;
drop policy if exists submissions_public_insert on public.submissions;
revoke insert on table public.submissions from anon,authenticated;
drop policy if exists submissions_service_role on public.submissions;
create policy submissions_service_role on public.submissions for all to service_role using(true) with check(true);
commit;
