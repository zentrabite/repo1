-- ═══════════════════════════════════════════════════════════════════════════
-- 021 — Refunds on orders
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the refund
-- button pull request. Additive only. Safe to run more than once. The code
-- that's live now ignores the new columns.
--
-- refunded_amount  dollars given back so far, 0 for none. It's always the
--                  total Stripe says has been refunded on the payment, so
--                  saving it twice never counts a refund twice.
-- refunded_at      when it last changed.
--
-- When refunded_amount changes, the customer's totals follow it:
--   total_spent     down by the amount refunded
--   points_balance  down by the points that money earned, never below 0.
--                   10 a dollar, the same as on_order_update_customer
--                   (migration 005) adds them. Change both together.
--   total_orders    down by 1 once the order is refunded in full
-- If a refund fails later and Stripe gives the money back to the shop, the
-- amount goes down again and the totals go back up.
--
-- Only the server can change these two columns: the refund button's route
-- and the Stripe webhook. A change from a browser is ignored, so staff can't
-- mark an order refunded without the money going back.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.orders add column if not exists refunded_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists refunded_at timestamptz;

alter table public.orders drop constraint if exists orders_refunded_amount_not_negative;
alter table public.orders
  add constraint orders_refunded_amount_not_negative check (refunded_amount >= 0);

comment on column public.orders.refunded_amount is 'Dollars refunded so far, as Stripe reports it. Server only.';
comment on column public.orders.refunded_at     is 'When refunded_amount last changed. Server only.';


-- ─── Browsers can't change the refund columns ───────────────────────────────
create or replace function public.protect_order_refund_fields()
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
    new.refunded_amount := 0;
    new.refunded_at     := null;
  else
    new.refunded_amount := old.refunded_amount;
    new.refunded_at     := old.refunded_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_order_refund_fields() from public, anon, authenticated;

drop trigger if exists protect_order_refund_fields on public.orders;
create trigger protect_order_refund_fields
  before insert or update on public.orders
  for each row execute function public.protect_order_refund_fields();


-- ─── The customer's totals follow the refund ────────────────────────────────
create or replace function public.update_customer_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old      numeric := coalesce(old.refunded_amount, 0);
  v_new      numeric := coalesce(new.refunded_amount, 0);
  v_was_full boolean := new.total > 0 and v_old >= new.total;
  v_is_full  boolean := new.total > 0 and v_new >= new.total;
begin
  update public.customers set
    total_spent    = greatest(0, coalesce(total_spent, 0) - (v_new - v_old)),
    -- The difference of the floors, so partial refunds that add up to the
    -- whole order take back exactly what the order earned.
    points_balance = greatest(0, coalesce(points_balance, 0)
                       - (floor(v_new * 10) - floor(v_old * 10))::int),
    total_orders   = greatest(0, coalesce(total_orders, 0)
                       + case when v_is_full and not v_was_full then -1
                              when v_was_full and not v_is_full then  1
                              else 0 end)
  where id = new.customer_id;
  return new;
end;
$$;

revoke execute on function public.update_customer_on_refund() from public, anon, authenticated;

drop trigger if exists on_order_refund_update_customer on public.orders;
create trigger on_order_refund_update_customer
  after update of refunded_amount on public.orders
  for each row
  when (new.customer_id is not null and old.refunded_amount is distinct from new.refunded_amount)
  execute function public.update_customer_on_refund();
