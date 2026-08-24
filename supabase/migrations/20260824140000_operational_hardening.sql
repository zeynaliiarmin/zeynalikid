-- Queryable JSONB projections and safe operational retention.
-- No submission or user attachment is deleted by maintenance.

begin;
alter table public.submissions add column if not exists submission_type text generated always as(payload->>'type') stored;
alter table public.submissions add column if not exists order_status text generated always as(payload->>'orderStatus') stored;
alter table public.submissions add column if not exists consultation_status text generated always as(payload->>'consultationStatus') stored;
alter table public.submissions add column if not exists course_id text generated always as(payload#>>'{course,id}') stored;
alter table public.submissions add column if not exists advisor_code text generated always as(payload#>>'{advisor,referralCode}') stored;
create index if not exists submissions_type_created_idx on public.submissions(submission_type,created_at desc) where deleted_at is null;
create index if not exists submissions_order_status_idx on public.submissions(order_status,created_at desc) where deleted_at is null;
create index if not exists submissions_consultation_status_idx on public.submissions(consultation_status,created_at desc) where deleted_at is null;
create index if not exists submissions_course_idx on public.submissions(course_id,created_at desc) where deleted_at is null and course_id is not null;
create index if not exists submissions_advisor_idx on public.submissions(advisor_code,created_at desc) where deleted_at is null and advisor_code is not null;

create or replace function public.admin_run_maintenance() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare errors_deleted int:=0;limits_deleted int:=0;sessions_deleted int:=0;audit_deleted int:=0;
begin
 delete from public.error_logs where created_at<now()-interval '15 days';get diagnostics errors_deleted=row_count;
 delete from public.security_rate_limits where updated_at<now()-interval '2 days' and coalesce(blocked_until,now()-interval '1 second')<now();get diagnostics limits_deleted=row_count;
 delete from public.admin_sessions where (is_revoked=true or expires_at<now()) and coalesce(revoked_at,expires_at)<now()-interval '90 days';get diagnostics sessions_deleted=row_count;
 delete from public.admin_audit_logs where created_at<now()-interval '365 days';get diagnostics audit_deleted=row_count;
 return jsonb_build_object('errorsDeleted',errors_deleted,'rateLimitsDeleted',limits_deleted,'sessionsDeleted',sessions_deleted,'auditDeleted',audit_deleted,'ranAt',now());
end$$;
revoke all on function public.admin_run_maintenance() from public,anon,authenticated;
grant execute on function public.admin_run_maintenance() to service_role;
commit;
