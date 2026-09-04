-- Owner-reviewed handling for unanswered assistant questions.
-- Additive only: existing questions remain stored; bulk cleanup uses status='ignored'.
begin;

alter table public.assistant_unanswered
  add column if not exists detection_reason text not null default 'no_match',
  add column if not exists resolved_knowledge_id uuid references public.assistant_knowledge(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.assistant_unanswered drop constraint if exists assistant_unanswered_detection_reason_check;
alter table public.assistant_unanswered add constraint assistant_unanswered_detection_reason_check
  check(detection_reason in ('no_match','low_confidence','generic_answer'));

create index if not exists assistant_unanswered_pending_review_idx
  on public.assistant_unanswered(status,last_seen_at desc,occurrences desc);
create index if not exists assistant_unanswered_resolved_knowledge_idx
  on public.assistant_unanswered(resolved_knowledge_id) where resolved_knowledge_id is not null;

-- This transaction is the only path that publishes an unanswered question.
-- It needs a non-empty owner answer and refuses to overwrite any existing rule,
-- including fixed safety and disclaimer knowledge.
create or replace function public.resolve_assistant_unanswered(
  p_unanswered_id bigint,
  p_answer text,
  p_aliases text[] default '{}'::text[],
  p_keywords text[] default '{}'::text[],
  p_category text default 'سؤال‌های کاربران',
  p_response_mode text default 'exact',
  p_match_mode text default 'smart',
  p_priority integer default 12,
  p_created_by text default 'owner-unanswered'
) returns public.assistant_knowledge
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  pending public.assistant_unanswered%rowtype;
  existing_id uuid;
  saved public.assistant_knowledge%rowtype;
begin
  select * into pending
  from public.assistant_unanswered
  where id=p_unanswered_id and status='pending'
  for update;

  if not found then
    raise exception using errcode='P0001',message='ASSISTANT_UNANSWERED_NOT_PENDING';
  end if;
  if char_length(trim(coalesce(p_answer,'')))<2 then
    raise exception using errcode='P0001',message='ASSISTANT_REQUIRED_FIELDS';
  end if;
  if p_response_mode<>'exact' or p_match_mode<>'smart' then
    raise exception using errcode='P0001',message='ASSISTANT_UNANSWERED_OWNER_TEXT_ONLY';
  end if;

  select id into existing_id
  from public.assistant_knowledge
  where lower(question)=lower(pending.question)
  limit 1;
  if existing_id is not null then
    raise exception using errcode='P0001',message='ASSISTANT_UNANSWERED_ALREADY_COVERED';
  end if;

  insert into public.assistant_knowledge(
    question,answer,aliases,keywords,category,status,is_active,priority,created_by,response_mode,match_mode,actions
  ) values (
    left(trim(pending.question),500),
    left(trim(p_answer),6000),
    coalesce(p_aliases,'{}'::text[]),
    coalesce(p_keywords,'{}'::text[]),
    left(coalesce(nullif(trim(p_category),''),'سؤال‌های کاربران'),80),
    'published',true,
    greatest(-100,least(100,coalesce(p_priority,12))),
    left(coalesce(nullif(trim(p_created_by),''),'owner-unanswered'),40),
    'exact','smart','[]'::jsonb
  ) returning * into saved;

  update public.assistant_unanswered
  set status='resolved',resolved_knowledge_id=saved.id,resolved_at=now(),archived_at=null
  where id=pending.id;

  return saved;
end$$;

revoke all on function public.resolve_assistant_unanswered(bigint,text,text[],text[],text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.resolve_assistant_unanswered(bigint,text,text[],text[],text,text,text,integer,text) to service_role;

commit;
