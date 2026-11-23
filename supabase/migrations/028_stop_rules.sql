-- 028 · Stop rules on sends
--
-- Every shop sends through one ZentraBite Twilio account and one Resend
-- account, so a shop's marketing pauses on its own when too many of its sends
-- in the last 30 days didn't arrive, were marked as spam or got a STOP reply
-- (apps/dashboard/lib/stop-rules.ts and lib/send-guard.ts).
--
--   • sms_logs gets provider_id (Twilio's or Resend's id for the send) and
--     outcome, what Twilio or Resend later said happened to it.
--   • send_pauses holds each pause, server only. A super admin resumes it.
--     A row with no shop (business_id null) stops every shop.
--   • Browsers can no longer add rows to sms_logs. Only the server writes
--     the send log, so a shop can't add made-up sends to water down its
--     rates. No browser code ever wrote to it.
--
-- Safe to run twice. Adds columns, a table and indexes, and drops one rule
-- (sms_logs_insert). Deletes no rows.

alter table public.sms_logs add column if not exists provider_id text;
alter table public.sms_logs add column if not exists outcome     text;
alter table public.sms_logs add column if not exists outcome_at  timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sms_logs_outcome_check') then
    alter table public.sms_logs
      add constraint sms_logs_outcome_check
      check (outcome is null or outcome in ('delivered', 'undelivered', 'bounced', 'complained', 'opted_out'));
  end if;
end $$;

create index if not exists sms_logs_provider_id_idx on public.sms_logs (provider_id) where provider_id is not null;
create index if not exists sms_logs_recipient_sent_idx on public.sms_logs (recipient, sent_at desc);
create index if not exists sms_logs_business_channel_sent_idx on public.sms_logs (business_id, channel, sent_at desc);

comment on column public.sms_logs.provider_id is 'Twilio message SID or Resend email id, so their reports can find the send.';
comment on column public.sms_logs.outcome is 'What Twilio or Resend said happened: delivered, undelivered, bounced, complained, or opted_out (a STOP reply).';

drop policy if exists "sms_logs_insert" on public.sms_logs;

create table if not exists public.send_pauses (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  channel     text not null check (channel in ('sms', 'email')),
  reason      text not null,
  detail      jsonb not null default '{}'::jsonb,
  paused_at   timestamptz not null default now(),
  paused_by   text not null default 'a stop rule',
  cleared_at  timestamptz,
  cleared_by  uuid references public.users(id) on delete set null
);

comment on table public.send_pauses is
  'Marketing sends paused by a stop rule or by staff. Server only. business_id null means every shop.';

-- One open pause per shop and channel, and one for every shop.
create unique index if not exists send_pauses_one_open_idx
  on public.send_pauses (coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), channel)
  where cleared_at is null;
create index if not exists send_pauses_business_idx on public.send_pauses (business_id, channel, cleared_at desc);

alter table public.send_pauses enable row level security;
revoke all on public.send_pauses from anon, authenticated;
