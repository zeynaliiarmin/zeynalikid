-- Public submissions are created only through create-submission, which assigns a
-- cryptographically random unique tracking code and validates the payload.

begin;
drop policy if exists submissions_public_insert on public.submissions;
revoke insert on table public.submissions from anon,authenticated;
commit;
