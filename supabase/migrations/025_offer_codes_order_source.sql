-- ─── 025 Win-back offer codes, and where each order came from ───────────────
-- Win-back texts and emails promise money off ("10% off your next order").
-- Until now the code in the link was made up on the spot and never checked,
-- so a customer would have paid full price. Each send now gets a real code
-- (lib/offer-codes.ts), checkout takes it off on the shop's Stripe account,
-- and the payment webhook marks it used.
--
-- orders.came_from says where an order came from: counter (the counter QR
-- code), winback, google, website, social or direct. It feeds the owner's
-- monthly report and the sales team's proof. Older orders and counter (POS)
-- sales have none.
--
-- One change to what runs: the Supabase cron job "win-back-daily" is
-- switched off. It called the win-back edge function, which sent the same
-- texts with codes that were never saved. The CRM's daily run
-- (/api/automations/run, Vercel cron) is now the only sender.
--
-- Otherwise only adds. Safe to run more than once.

alter table public.orders add column if not exists came_from  text;
alter table public.orders add column if not exists offer_code text;

comment on column public.orders.came_from  is 'Where the order came from: counter, winback, google, website, social or direct. Set by checkout from the link. Server only.';
comment on column public.orders.offer_code is 'The win-back offer code used, if any (offer_codes.code). Server only.';

create table if not exists public.offer_codes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code        text not null,
  customer_id uuid references public.customers(id) on delete set null,
  source      text not null default 'winback',
  rule_id     uuid references public.winback_rules(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  offer_type  text not null check (offer_type in ('percent', 'dollar', 'free_delivery')),
  offer_value numeric(10,2) not null default 0 check (offer_value >= 0),
  expires_at  timestamptz not null,
  redeemed_at timestamptz,
  order_id    uuid references public.orders(id) on delete set null,
  -- The Stripe checkout using the code right now, so it can't be paid twice.
  held_session text,
  held_until   timestamptz,
  created_at  timestamptz not null default now(),
  unique (business_id, code)
);

create index if not exists idx_offer_codes_customer on public.offer_codes (business_id, customer_id);

alter table public.offer_codes enable row level security;
revoke all on public.offer_codes from anon, authenticated;

comment on table public.offer_codes is 'One code per win-back send. Checked and marked used by the server only (lib/offer-codes.ts).';

comment on column public.orders.discount is 'Dollars taken off at checkout by the first order offer or a win-back code (offer_code). 0 for none. Server only.';

-- ─── Browsers can't set or change came_from or offer_code ───────────────────
create or replace function public.protect_order_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (the server) and the SQL editor can change anything.
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.came_from  := null;
    new.offer_code := null;
  else
    new.came_from  := old.came_from;
    new.offer_code := old.offer_code;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_order_source() from public, anon, authenticated;

drop trigger if exists protect_order_source on public.orders;
create trigger protect_order_source
  before insert or update on public.orders
  for each row execute function public.protect_order_source();

-- ─── One sender for win-back ────────────────────────────────────────────────
-- Checked step by step, so this also runs where pg_cron isn't installed.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'win-back-daily') then
      perform cron.unschedule('win-back-daily');
    end if;
  end if;
end $$;
