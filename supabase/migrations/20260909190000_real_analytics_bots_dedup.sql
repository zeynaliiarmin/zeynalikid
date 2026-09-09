begin;
alter table public.page_views add column if not exists visitor_id text;

create or replace function public.admin_page_view_stats(p_since timestamptz)
returns jsonb
language sql stable security definer set search_path=public,pg_temp as
$$
  with base as (
    select page_path, created_at, visitor_id
    from public.page_views
    where created_at >= p_since
      and (
        user_agent is null
        or user_agent = ''
        or user_agent !~* 'HeadlessChrome|headless|phantomjs|bot\b|crawler|crawl|spider|slurp|fetch|prerender|puppeteer|playwright|selenium|lighthouse|pagespeed|pingdom|uptime|monitor|checker|scanner|curl|wget|python-requests|go-http|okhttp|postman|insomnia|vercel-betterstack|betterstack'
      )
  ),
  top_pages as (
    select coalesce(page_path,'/') as page_path, count(*)::bigint as views
    from base group by coalesce(page_path,'/') order by views desc limit 50
  ),
  daily as (
    select to_char(created_at at time zone 'UTC','YYYY-MM-DD') as date,
           count(*)::bigint as views,
           count(distinct visitor_id) filter (where visitor_id is not null)::bigint as uniques
    from base group by 1 order by 1
  )
  select jsonb_build_object(
    'totalViews', (select count(*)::bigint from base),
    'uniqueTotal', (select count(distinct visitor_id)::bigint from base where visitor_id is not null),
    'topPages', coalesce((select jsonb_agg(jsonb_build_object('page_path',page_path,'views',views) order by views desc) from top_pages),'[]'::jsonb),
    'dailyCounts', coalesce((select jsonb_agg(jsonb_build_object('date',date,'views',views,'uniques',uniques) order by date) from daily),'[]'::jsonb)
  );
$$;
revoke all on function public.admin_page_view_stats(timestamptz) from public,anon,authenticated;
grant execute on function public.admin_page_view_stats(timestamptz) to service_role;

-- پاک‌سازی رکوردهای تاریخی ربات‌های headless
delete from public.page_views where user_agent ~* 'HeadlessChrome|headless|phantomjs|puppeteer|playwright|selenium';
commit;
