-- Review privacy + the only two real public placements.
-- Safe to run repeatedly. It never deletes a review.
begin;

alter table public.reviews add column if not exists phone text default '';
alter table public.reviews add column if not exists phone_country text default '';
alter table public.reviews add column if not exists placements text[] default array['course_detail'];
alter table public.reviews add column if not exists course_ids text[] default '{}';
alter table public.reviews add column if not exists updated_at timestamptz default now();
alter table public.reviews alter column placements set default array['course_detail'];

create or replace function public.mask_review_phone(raw_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := regexp_replace(lower(coalesce(raw_phone, '')), '[^0-9x]', '', 'g');
  only_digits text;
begin
  if cleaned ~ '^[0-9]{5}x{4}[0-9]{2}$' then
    return cleaned;
  end if;
  only_digits := regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g');
  if only_digits like '0098%' then
    only_digits := '0' || substring(only_digits from 5);
  elsif length(only_digits) = 12 and only_digits like '98%' then
    only_digits := '0' || substring(only_digits from 3);
  end if;
  if length(only_digits) < 7 then return ''; end if;
  return left(only_digits, 5) || 'xxxx' || right(only_digits, 2);
end;
$$;

alter table public.reviews
  add column if not exists public_phone text
  generated always as (public.mask_review_phone(phone)) stored;

-- Keep historical review content/IDs, but remove destinations that have no renderer.
update public.reviews
set placements = case
  when coalesce(placements, '{}') && array['course_detail','product_detail']::text[]
    then array(select distinct place from unnest(placements) place where place in ('course_detail','product_detail'))
  else array['course_detail']::text[]
end
where placements is null
   or placements = '{}'
   or placements <@ array['course_detail','product_detail']::text[] is not true;

alter table public.reviews enable row level security;
drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews for select to anon, authenticated using (status = 'approved');
drop policy if exists "public insert reviews" on public.reviews;
create policy "public insert reviews" on public.reviews for insert to anon, authenticated with check (status = 'pending');

-- Full phone numbers can only be read through the authenticated admin Edge Function (service role).
revoke select, update, delete on public.reviews from anon, authenticated;
grant select (id, course_id, reviewer_name, rating, comment, status, placements, course_ids, phone_country, public_phone, created_at)
  on public.reviews to anon, authenticated;
grant insert (course_id, reviewer_name, rating, comment, status, placements, course_ids, phone, phone_country, created_at)
  on public.reviews to anon, authenticated;
grant usage, select on sequence public.reviews_id_seq to anon, authenticated;

commit;
