-- Frequent-question insights, conservative intent clusters and owner notifications.
-- Additive only: existing knowledge and project data are preserved.
begin;

alter table public.assistant_settings
  add column if not exists frequent_question_threshold integer not null default 3;
alter table public.assistant_settings drop constraint if exists assistant_settings_frequent_question_threshold_check;
alter table public.assistant_settings add constraint assistant_settings_frequent_question_threshold_check
  check(frequent_question_threshold between 2 and 100);

create table if not exists public.assistant_question_clusters(
  id uuid primary key default gen_random_uuid(),
  cluster_key text not null unique,
  representative_question text not null check(char_length(representative_question) between 2 and 500),
  normalized_question text not null,
  sample_questions text[] not null default '{}',
  occurrence_count integer not null default 1 check(occurrence_count > 0),
  answer_origin text not null default 'automatic' check(answer_origin in ('trained','automatic')),
  knowledge_id uuid references public.assistant_knowledge(id) on delete set null,
  canonical_answer text not null default '',
  last_answer text not null default '',
  last_model text not null default '',
  embedding jsonb,
  last_notified_count integer not null default 0 check(last_notified_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_question_clusters_embedding_check check(embedding is null or jsonb_typeof(embedding)='array')
);

create or replace function public.assistant_merge_question_samples(existing_samples text[],new_sample text)
returns text[] language sql immutable set search_path=public,pg_temp as $$
  select coalesce(array_agg(sample order by last_position),'{}'::text[])
  from (
    select sample,max(position) as last_position
    from unnest(coalesce(existing_samples,'{}'::text[]) || array[nullif(trim(new_sample),'')]) with ordinality as valueset(sample,position)
    where sample is not null and sample<>''
    group by sample
    order by max(position) desc
    limit 8
  ) recent
$$;

create or replace function public.record_assistant_question_cluster(
  p_cluster_key text,
  p_question text,
  p_normalized text,
  p_answer text,
  p_answer_origin text,
  p_knowledge_id uuid,
  p_canonical_answer text,
  p_model text,
  p_embedding jsonb default null
) returns setof public.assistant_question_clusters
language plpgsql security definer set search_path=public,pg_temp as $$
declare saved public.assistant_question_clusters%rowtype;
begin
  insert into public.assistant_question_clusters(
    cluster_key,representative_question,normalized_question,sample_questions,occurrence_count,
    answer_origin,knowledge_id,canonical_answer,last_answer,last_model,embedding,last_seen_at,updated_at
  ) values(
    left(p_cluster_key,200),left(trim(p_question),500),left(trim(p_normalized),500),array[left(trim(p_question),500)],1,
    case when p_answer_origin='trained' then 'trained' else 'automatic' end,p_knowledge_id,left(coalesce(p_canonical_answer,''),6000),
    left(coalesce(p_answer,''),6000),left(coalesce(p_model,''),100),p_embedding,now(),now()
  )
  on conflict(cluster_key) do update set
    sample_questions=public.assistant_merge_question_samples(assistant_question_clusters.sample_questions,excluded.representative_question),
    occurrence_count=assistant_question_clusters.occurrence_count+1,
    answer_origin=excluded.answer_origin,
    knowledge_id=excluded.knowledge_id,
    canonical_answer=case when excluded.canonical_answer<>'' then excluded.canonical_answer else assistant_question_clusters.canonical_answer end,
    last_answer=excluded.last_answer,
    last_model=excluded.last_model,
    embedding=coalesce(assistant_question_clusters.embedding,excluded.embedding),
    last_seen_at=now(),
    updated_at=now()
  returning * into saved;
  return next saved;
end$$;

create or replace function public.assistant_sync_question_cluster_knowledge()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='DELETE' then
    update public.assistant_question_clusters
      set knowledge_id=null,answer_origin='automatic',updated_at=now()
      where knowledge_id=old.id;
    return old;
  end if;
  update public.assistant_question_clusters
    set canonical_answer=left(coalesce(new.answer,''),6000),answer_origin='trained',updated_at=now()
    where knowledge_id=new.id;
  return new;
end$$;

drop trigger if exists assistant_knowledge_sync_question_clusters on public.assistant_knowledge;
create trigger assistant_knowledge_sync_question_clusters after update of answer on public.assistant_knowledge
  for each row execute function public.assistant_sync_question_cluster_knowledge();
drop trigger if exists assistant_knowledge_detach_question_clusters on public.assistant_knowledge;
create trigger assistant_knowledge_detach_question_clusters before delete on public.assistant_knowledge
  for each row execute function public.assistant_sync_question_cluster_knowledge();

create index if not exists assistant_question_clusters_frequency_idx
  on public.assistant_question_clusters(occurrence_count desc,last_seen_at desc);
create index if not exists assistant_question_clusters_knowledge_idx
  on public.assistant_question_clusters(knowledge_id) where knowledge_id is not null;
create index if not exists assistant_question_clusters_normalized_idx
  on public.assistant_question_clusters(normalized_question);

drop trigger if exists assistant_question_clusters_updated_at on public.assistant_question_clusters;
create trigger assistant_question_clusters_updated_at before update on public.assistant_question_clusters
  for each row execute function public.assistant_set_updated_at();

-- Preserve useful history already collected by the old exact-text unanswered counter.
insert into public.assistant_question_clusters(
  cluster_key,representative_question,normalized_question,sample_questions,occurrence_count,
  answer_origin,canonical_answer,last_answer,last_model,last_notified_count,first_seen_at,last_seen_at
)
select
  'legacy-unanswered:'||u.id::text,u.question,u.question_normalized,array[u.question],greatest(1,u.occurrences),
  'automatic','',coalesce(s.fallback_message,'اطلاعات تأییدشده‌ای برای این سؤال ثبت نشده است.'),'internal-no-knowledge',0,u.first_seen_at,u.last_seen_at
from public.assistant_unanswered u
left join public.assistant_settings s on s.key='default'
on conflict(cluster_key) do nothing;

alter table public.assistant_question_clusters enable row level security;
revoke all on public.assistant_question_clusters from public,anon,authenticated;
grant select,insert,update,delete on public.assistant_question_clusters to service_role;
revoke all on function public.record_assistant_question_cluster(text,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_assistant_question_cluster(text,text,text,text,text,uuid,text,text,jsonb) to service_role;
revoke all on function public.assistant_merge_question_samples(text[],text) from public,anon,authenticated;
grant execute on function public.assistant_merge_question_samples(text[],text) to service_role;
revoke all on function public.assistant_sync_question_cluster_knowledge() from public,anon,authenticated;
grant execute on function public.assistant_sync_question_cluster_knowledge() to service_role;

drop policy if exists assistant_question_clusters_browser_deny on public.assistant_question_clusters;
create policy assistant_question_clusters_browser_deny on public.assistant_question_clusters
  for all to anon,authenticated using(false) with check(false);

update public.assistant_settings set frequent_question_threshold=greatest(2,least(100,frequent_question_threshold)) where key='default';

commit;
