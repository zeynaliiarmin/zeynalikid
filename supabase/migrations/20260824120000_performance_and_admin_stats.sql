-- Database-side analytics aggregation and duplicate-index cleanup.

begin;

create or replace function public.admin_page_view_stats(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  with filtered as (
    select page_path,created_at from public.page_views where created_at>=p_since
  ),
  top_pages as (
    select coalesce(page_path,'/') as page_path,count(*)::bigint as views
    from filtered group by coalesce(page_path,'/') order by views desc limit 50
  ),
  daily as (
    select to_char(created_at at time zone 'UTC','YYYY-MM-DD') as date,count(*)::bigint as views
    from filtered group by 1 order by 1
  )
  select jsonb_build_object(
    'totalViews',(select count(*)::bigint from filtered),
    'topPages',coalesce((select jsonb_agg(jsonb_build_object('page_path',page_path,'views',views) order by views desc) from top_pages),'[]'::jsonb),
    'dailyCounts',coalesce((select jsonb_agg(jsonb_build_object('date',date,'views',views) order by date) from daily),'[]'::jsonb)
  );
$$;
revoke all on function public.admin_page_view_stats(timestamptz) from public,anon,authenticated;
grant execute on function public.admin_page_view_stats(timestamptz) to service_role;

-- Keep one index for each identical definition.
drop index if exists public.page_views_created_idx;
drop index if exists public.idx_admin_sessions_token_hash;

commit;
