-- 027 · The three kinds of message
--
-- Every text and email ZentraBite sends is must_reach, account or marketing
-- (apps/dashboard/lib/message-kinds.ts). sms_logs now records which kind each
-- logged message was, so marketing can be counted on its own (the stop rules
-- and kill switches build on this), and an owner's text about an order can be
-- told apart from an offer.
--
-- Rows already there were win-back sends and owners' texts, both treated as
-- marketing until now, so the default fills them as marketing.
-- Only adds a column and a check. Safe to run twice.

alter table public.sms_logs add column if not exists kind text not null default 'marketing';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sms_logs_kind_check') then
    alter table public.sms_logs
      add constraint sms_logs_kind_check check (kind in ('must_reach', 'account', 'marketing'));
  end if;
end $$;

comment on column public.sms_logs.kind is
  'must_reach, account or marketing. See apps/dashboard/lib/message-kinds.ts.';
