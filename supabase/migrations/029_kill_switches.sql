-- 029 · Kill switches
--
-- A super admin can stop sends for every shop from /admin/sending. These are
-- rows in send_pauses (028) with no shop (business_id null).
--   • scope 'marketing' stops every shop's marketing on a channel, the same
--     as a stop rule but for everyone.
--   • scope 'all' stops every text, order texts and the owner's order alerts
--     too, for when the Twilio account itself is in trouble. Only a pause
--     for every shop can have it.
-- Pauses from 028 are all marketing, so the default fills them.
--
-- Safe to run twice. Adds a column and a check. Deletes no rows.

alter table public.send_pauses add column if not exists scope text not null default 'marketing';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'send_pauses_scope_check') then
    alter table public.send_pauses
      add constraint send_pauses_scope_check
      check (scope in ('marketing', 'all') and (scope = 'marketing' or business_id is null));
  end if;
end $$;

comment on column public.send_pauses.scope is
  'marketing (marketing only) or all (every message on the channel, every shop only). See apps/dashboard/lib/send-guard.ts.';
