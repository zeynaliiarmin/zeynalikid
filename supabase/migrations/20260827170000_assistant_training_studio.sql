-- Easier, rule-aware assistant training and multi-button responses.
-- Additive migration: all existing knowledge and project data are preserved.
begin;

alter table public.assistant_knowledge
  add column if not exists response_mode text not null default 'grounded',
  add column if not exists match_mode text not null default 'smart',
  add column if not exists actions jsonb not null default '[]'::jsonb;

alter table public.assistant_admin_knowledge
  add column if not exists response_mode text not null default 'grounded',
  add column if not exists match_mode text not null default 'smart';

alter table public.assistant_settings
  add column if not exists revision bigint not null default 1;

-- Preserve old single-link knowledge while enabling up to three action buttons.
update public.assistant_knowledge
set actions=jsonb_build_array(jsonb_build_object('label',coalesce(nullif(link_label,''),'مشاهده بخش مرتبط'),'path',link_url))
where coalesce(link_url,'')<>'' and actions='[]'::jsonb;

alter table public.assistant_knowledge drop constraint if exists assistant_knowledge_response_mode_check;
alter table public.assistant_knowledge add constraint assistant_knowledge_response_mode_check
  check(response_mode in ('grounded','exact','refusal'));
alter table public.assistant_knowledge drop constraint if exists assistant_knowledge_match_mode_check;
alter table public.assistant_knowledge add constraint assistant_knowledge_match_mode_check
  check(match_mode in ('smart','contains','exact'));
alter table public.assistant_knowledge drop constraint if exists assistant_knowledge_actions_check;
alter table public.assistant_knowledge add constraint assistant_knowledge_actions_check
  check(jsonb_typeof(actions)='array' and jsonb_array_length(actions)<=3);

alter table public.assistant_admin_knowledge drop constraint if exists assistant_admin_knowledge_response_mode_check;
alter table public.assistant_admin_knowledge add constraint assistant_admin_knowledge_response_mode_check
  check(response_mode in ('grounded','exact','refusal'));
alter table public.assistant_admin_knowledge drop constraint if exists assistant_admin_knowledge_match_mode_check;
alter table public.assistant_admin_knowledge add constraint assistant_admin_knowledge_match_mode_check
  check(match_mode in ('smart','contains','exact'));

-- Keep the public widget's lightweight revision check accurate for every settings or
-- knowledge change, including edits made from Telegram.
create or replace function public.assistant_increment_settings_revision() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  new.revision=old.revision+1;
  return new;
end$$;
drop trigger if exists assistant_settings_increment_revision on public.assistant_settings;
create trigger assistant_settings_increment_revision
  before update on public.assistant_settings
  for each row execute function public.assistant_increment_settings_revision();

create or replace function public.assistant_touch_knowledge_revision() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  update public.assistant_settings set revision=revision+1 where key='default';
  return null;
end$$;
drop trigger if exists assistant_knowledge_touch_revision on public.assistant_knowledge;
create trigger assistant_knowledge_touch_revision
  after insert or update or delete on public.assistant_knowledge
  for each statement execute function public.assistant_touch_knowledge_revision();
drop trigger if exists assistant_admin_knowledge_touch_revision on public.assistant_admin_knowledge;
create trigger assistant_admin_knowledge_touch_revision
  after insert or update or delete on public.assistant_admin_knowledge
  for each statement execute function public.assistant_touch_knowledge_revision();

update public.assistant_settings set revision=revision+1 where key='default';

commit;
