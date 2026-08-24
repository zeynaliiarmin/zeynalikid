-- Daily operational cleanup. User submissions and Storage objects are excluded.
begin;
create extension if not exists pg_cron with schema pg_catalog;
do $$declare existing bigint;begin
 select jobid into existing from cron.job where jobname='daily-operational-maintenance' limit 1;
 if existing is not null then perform cron.unschedule(existing);end if;
 perform cron.schedule('daily-operational-maintenance','17 2 * * *','select public.admin_run_maintenance();');
end$$;
commit;
