-- 033 · Birthdays as a day and a month, never a year
-- customers.date_of_birth held a full date of birth. The draft privacy
-- policy says a shop collects the day and month of a birthday only, not the
-- year, so the year can't be stored at all. Nothing in the CRM or the
-- ordering pages asks for a birthday yet, and live had 0 customers, so
-- nothing is lost.
--
-- Adds birth_month (1 to 12) and birth_day (1 to 31, checked against the
-- month, 29 Feb allowed), copies any day and month across, and drops
-- date_of_birth and its index. The birthday-loyalty job (v3) reads the new
-- columns. Safe to run twice.

alter table public.customers add column if not exists birth_month smallint;
alter table public.customers add column if not exists birth_day   smallint;

alter table public.customers drop constraint if exists customers_birthday_valid;
alter table public.customers add constraint customers_birthday_valid check (
  (birth_month is null and birth_day is null)
  or (
    birth_month is not null and birth_day is not null
    and birth_month between 1 and 12
    and birth_day between 1 and case
      when birth_month = 2 then 29
      when birth_month in (4, 6, 9, 11) then 30
      else 31
    end
  )
);

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'customers' and column_name = 'date_of_birth') then
    update public.customers
       set birth_month = extract(month from date_of_birth)::smallint,
           birth_day   = extract(day   from date_of_birth)::smallint
     where date_of_birth is not null and birth_month is null;
  end if;
end $$;

drop index if exists public.idx_customers_dob;
alter table public.customers drop column if exists date_of_birth;

create index if not exists idx_customers_birthday
  on public.customers (birth_month, birth_day) where birth_month is not null;

comment on column public.customers.birth_month is 'Birthday month, 1 to 12. The year is never stored (privacy policy).';
comment on column public.customers.birth_day   is 'Birthday day of the month. The year is never stored (privacy policy).';
