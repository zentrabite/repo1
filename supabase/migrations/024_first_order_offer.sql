-- ─── 024 First order offer ──────────────────────────────────────────────────
-- A shop can give a set amount off a customer's first online order
-- (lib/first-order.ts). Checkout takes it off with a one-use Stripe coupon on
-- the shop's account, and the payment webhook records how much came off here.
-- orders.total stays what the customer paid.
--
-- Only adds a column. Safe to run more than once.
--
-- Written only by the server (the webhook uses the service role). A trigger
-- keeps a browser from changing it, the same way as the refund columns (021).

alter table public.orders
  add column if not exists discount numeric(10,2) not null default 0;

do $$ begin
  alter table public.orders add constraint orders_discount_not_negative check (discount >= 0);
exception when duplicate_object then null;
end $$;

comment on column public.orders.discount is 'Dollars taken off at checkout by the shop''s first order offer. 0 for none. Server only.';

-- ─── Browsers can't set or change it ────────────────────────────────────────
create or replace function public.protect_order_discount()
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
    new.discount := 0;
  else
    new.discount := old.discount;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_order_discount() from public, anon, authenticated;

drop trigger if exists protect_order_discount on public.orders;
create trigger protect_order_discount
  before insert or update on public.orders
  for each row execute function public.protect_order_discount();
