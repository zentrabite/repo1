-- 032 · One analytics row per shop per day
-- Migration 001 gives analytics_daily UNIQUE (business_id, date), but the
-- live table was made before 001 was written, so it never got it. The
-- nightly job saves with "upsert on business_id, date", which needs that
-- constraint, so every night's save failed and the job didn't check. Found
-- 23 Nov 2026: live analytics_daily had 0 rows, so Analytics' order counts
-- and all of Financials were always empty.
--
-- Adds the constraint where it's missing. Live had 0 rows, so nothing can
-- clash. Safe to run twice, and does nothing where 001 already made it.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.analytics_daily'::regclass
       and contype = 'u'
       and pg_get_constraintdef(oid) = 'UNIQUE (business_id, date)'
  ) then
    alter table public.analytics_daily
      add constraint analytics_daily_business_id_date_key unique (business_id, date);
  end if;
end $$;
