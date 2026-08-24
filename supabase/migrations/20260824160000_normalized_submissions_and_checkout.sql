-- Non-destructive submission normalization and short-lived checkout authorization.
-- The original submissions.payload JSONB remains the source of truth for backward compatibility.
-- Existing submissions and Storage objects are never deleted by this migration.

begin;

create table if not exists public.submission_contacts(
  submission_id bigint primary key references public.submissions(id) on delete cascade,
  full_phone text not null,
  parent_name text,
  country text,
  child_gender text,
  child_age text,
  child_height text,
  child_weight text,
  updated_at timestamptz not null default now()
);
create table if not exists public.submission_orders(
  submission_id bigint primary key references public.submissions(id) on delete cascade,
  course_id text,
  advisor_code text,
  destination text,
  shipping_method text,
  order_status text,
  bank_id text,
  receipt_method text,
  updated_at timestamptz not null default now()
);
create table if not exists public.submission_consultations(
  submission_id bigint primary key references public.submissions(id) on delete cascade,
  consultation_status text,
  priority text,
  time_slot text,
  topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.checkout_sessions(
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  course_id text not null,
  referral_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists submission_contacts_phone_idx on public.submission_contacts(full_phone);
create index if not exists submission_contacts_country_idx on public.submission_contacts(country) where country is not null;
create index if not exists submission_orders_course_idx on public.submission_orders(course_id) where course_id is not null;
create index if not exists submission_orders_advisor_idx on public.submission_orders(advisor_code) where advisor_code is not null;
create index if not exists submission_orders_status_idx on public.submission_orders(order_status) where order_status is not null;
create index if not exists submission_consultations_status_idx on public.submission_consultations(consultation_status) where consultation_status is not null;
create index if not exists checkout_sessions_expiry_idx on public.checkout_sessions(expires_at);

alter table public.submission_contacts enable row level security;
alter table public.submission_orders enable row level security;
alter table public.submission_consultations enable row level security;
alter table public.checkout_sessions enable row level security;
revoke all on public.submission_contacts,public.submission_orders,public.submission_consultations,public.checkout_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.submission_contacts,public.submission_orders,public.submission_consultations,public.checkout_sessions to service_role;

drop policy if exists normalized_browser_deny on public.submission_contacts;
create policy normalized_browser_deny on public.submission_contacts for all to anon,authenticated using(false) with check(false);
drop policy if exists normalized_browser_deny on public.submission_orders;
create policy normalized_browser_deny on public.submission_orders for all to anon,authenticated using(false) with check(false);
drop policy if exists normalized_browser_deny on public.submission_consultations;
create policy normalized_browser_deny on public.submission_consultations for all to anon,authenticated using(false) with check(false);
drop policy if exists checkout_browser_deny on public.checkout_sessions;
create policy checkout_browser_deny on public.checkout_sessions for all to anon,authenticated using(false) with check(false);

create or replace function public.sync_submission_normalized(
  p_submission_id bigint,
  p_full_phone text,
  p_payload jsonb
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_type text:=coalesce(p_payload->>'type','');
  v_topics text[]:=array[]::text[];
begin
  if jsonb_typeof(p_payload->'topics')='array' then
    select coalesce(array_agg(value),array[]::text[]) into v_topics
    from jsonb_array_elements_text(p_payload->'topics') as item(value);
  end if;

  insert into public.submission_contacts(submission_id,full_phone,parent_name,country,child_gender,child_age,child_height,child_weight,updated_at)
  values(
    p_submission_id,p_full_phone,
    nullif(coalesce(p_payload->>'pName',p_payload#>>'{shipping,receiver}',p_payload#>>'{childInfo,parentName}'),'') ,
    nullif(coalesce(p_payload#>>'{shipping,country}',p_payload->>'country'),'') ,
    nullif(coalesce(p_payload->>'gender',p_payload#>>'{childInfo,gender}'),'') ,
    nullif(coalesce(p_payload->>'age',p_payload#>>'{childInfo,age}'),'') ,
    nullif(coalesce(p_payload->>'height',p_payload#>>'{childInfo,height}'),'') ,
    nullif(coalesce(p_payload->>'weight',p_payload#>>'{childInfo,weight}'),'') ,now()
  ) on conflict(submission_id) do update set
    full_phone=excluded.full_phone,parent_name=excluded.parent_name,country=excluded.country,
    child_gender=excluded.child_gender,child_age=excluded.child_age,child_height=excluded.child_height,
    child_weight=excluded.child_weight,updated_at=now();

  if v_type='course' then
    insert into public.submission_orders(submission_id,course_id,advisor_code,destination,shipping_method,order_status,bank_id,receipt_method,updated_at)
    values(p_submission_id,nullif(p_payload#>>'{course,id}',''),nullif(p_payload#>>'{advisor,referralCode}',''),
      nullif(p_payload#>>'{shipping,dest}',''),nullif(p_payload#>>'{shipping,method}',''),nullif(p_payload->>'orderStatus',''),
      nullif(coalesce(p_payload#>>'{payment,bankId}',p_payload#>>'{payment,bank,id}'),''),nullif(p_payload#>>'{payment,receiptMethod}',''),now())
    on conflict(submission_id) do update set course_id=excluded.course_id,advisor_code=excluded.advisor_code,
      destination=excluded.destination,shipping_method=excluded.shipping_method,order_status=excluded.order_status,
      bank_id=excluded.bank_id,receipt_method=excluded.receipt_method,updated_at=now();
  else
    delete from public.submission_orders where submission_id=p_submission_id;
  end if;

  if v_type='consultation' then
    insert into public.submission_consultations(submission_id,consultation_status,priority,time_slot,topics,updated_at)
    values(p_submission_id,nullif(p_payload->>'consultationStatus',''),nullif(p_payload->>'priority',''),nullif(p_payload->>'timeSlot',''),v_topics,now())
    on conflict(submission_id) do update set consultation_status=excluded.consultation_status,priority=excluded.priority,
      time_slot=excluded.time_slot,topics=excluded.topics,updated_at=now();
  else
    delete from public.submission_consultations where submission_id=p_submission_id;
  end if;
end$$;
revoke all on function public.sync_submission_normalized(bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.sync_submission_normalized(bigint,text,jsonb) to service_role;

create or replace function public.submissions_normalized_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.sync_submission_normalized(new.id,new.full_phone,new.payload);
 return new;
end$$;
revoke all on function public.submissions_normalized_trigger() from public,anon,authenticated;

drop trigger if exists submissions_sync_normalized on public.submissions;
create trigger submissions_sync_normalized after insert or update of full_phone,payload on public.submissions
for each row execute function public.submissions_normalized_trigger();

do $$ declare row_data record; begin
  for row_data in select id,full_phone,payload from public.submissions loop
    perform public.sync_submission_normalized(row_data.id,row_data.full_phone,row_data.payload);
  end loop;
end $$;

create or replace function public.admin_run_maintenance() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare errors_deleted int:=0;limits_deleted int:=0;sessions_deleted int:=0;audit_deleted int:=0;checkout_deleted int:=0;
begin
 delete from public.error_logs where created_at<now()-interval '15 days';get diagnostics errors_deleted=row_count;
 delete from public.security_rate_limits where updated_at<now()-interval '2 days' and coalesce(blocked_until,now()-interval '1 second')<now();get diagnostics limits_deleted=row_count;
 delete from public.admin_sessions where (is_revoked=true or expires_at<now()) and coalesce(revoked_at,expires_at)<now()-interval '90 days';get diagnostics sessions_deleted=row_count;
 delete from public.admin_audit_logs where created_at<now()-interval '365 days';get diagnostics audit_deleted=row_count;
 delete from public.checkout_sessions where expires_at<now()-interval '2 days';get diagnostics checkout_deleted=row_count;
 return jsonb_build_object('errorsDeleted',errors_deleted,'rateLimitsDeleted',limits_deleted,'sessionsDeleted',sessions_deleted,'auditDeleted',audit_deleted,'checkoutSessionsDeleted',checkout_deleted,'ranAt',now());
end$$;
revoke all on function public.admin_run_maintenance() from public,anon,authenticated;
grant execute on function public.admin_run_maintenance() to service_role;

commit;
