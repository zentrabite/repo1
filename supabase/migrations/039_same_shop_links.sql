-- ═══════════════════════════════════════════════════════════════════════════
-- 039. Rows only point at rows in the same shop, and browsers change orders
--      only where the CRM needs to (second security run, 25 Nov 2026)
--
-- 1. An order, review, delivery job and the rest can only point at a
--    customer, order, job, category or stock item of the same shop. Before
--    this, a shop could add an order with another shop's customer on it, and
--    the order trigger then moved that customer's points and totals.
-- 2. The order and refund triggers only touch the shop's own customer, as a
--    second lock.
-- 3. From a browser, an order's status, its fulfilment stamps and its
--    tracking can change, and nothing else. A sale added from a browser is a
--    counter sale (source pos), never negative.
--
-- Safe to run twice. Adds rules and changes no rows (live had 0 orders,
-- 0 customers and 0 reviews on 25 Nov).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Same-shop links ─────────────────────────────────────────────────────
-- Arguments come in pairs, the column and the table it points at. Both tables
-- have business_id. Applies to everyone, the server included.
create or replace function public.check_same_shop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i     int := 0;
  v_id  text;
  v_ok  boolean;
begin
  while i < tg_nargs loop
    v_id := to_jsonb(new) ->> tg_argv[i];
    if v_id is not null then
      execute format('select exists (select 1 from public.%I where id = $1::uuid and business_id = $2)', tg_argv[i + 1])
        into v_ok using v_id, new.business_id;
      if not v_ok then
        raise exception '% must belong to the same shop', tg_argv[i] using errcode = '23503';
      end if;
    end if;
    i := i + 2;
  end loop;
  return new;
end;
$$;

revoke execute on function public.check_same_shop() from public, anon, authenticated;

drop trigger if exists same_shop_links on public.orders;
create trigger same_shop_links
  before insert or update of business_id, customer_id, delivery_job_id on public.orders
  for each row execute function public.check_same_shop('customer_id', 'customers', 'delivery_job_id', 'delivery_jobs');

drop trigger if exists same_shop_links on public.customers;
create trigger same_shop_links
  before insert or update of business_id, referred_by on public.customers
  for each row execute function public.check_same_shop('referred_by', 'customers');

drop trigger if exists same_shop_links on public.reviews;
create trigger same_shop_links
  before insert or update of business_id, customer_id, order_id on public.reviews
  for each row execute function public.check_same_shop('customer_id', 'customers', 'order_id', 'orders');

drop trigger if exists same_shop_links on public.delivery_jobs;
create trigger same_shop_links
  before insert or update of business_id, order_id on public.delivery_jobs
  for each row execute function public.check_same_shop('order_id', 'orders');

drop trigger if exists same_shop_links on public.delivery_quotes;
create trigger same_shop_links
  before insert or update of business_id, job_id on public.delivery_quotes
  for each row execute function public.check_same_shop('job_id', 'delivery_jobs');

drop trigger if exists same_shop_links on public.notifications;
create trigger same_shop_links
  before insert or update of business_id, order_id on public.notifications
  for each row execute function public.check_same_shop('order_id', 'orders');

drop trigger if exists same_shop_links on public.menu_items;
create trigger same_shop_links
  before insert or update of business_id, category_id on public.menu_items
  for each row execute function public.check_same_shop('category_id', 'menu_categories');

drop trigger if exists same_shop_links on public.stock_counts;
create trigger same_shop_links
  before insert or update of business_id, stock_item_id on public.stock_counts
  for each row execute function public.check_same_shop('stock_item_id', 'stock_items');


-- ─── 2. The order and refund triggers stay in the shop ─────────────────────
create or replace function public.update_customer_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers set
    total_orders    = total_orders + 1,
    total_spent     = total_spent + new.total,
    last_order_date = new.created_at,
    points_balance  = points_balance + floor(new.total * 10),  -- 10 points a dollar
    segment = case
      when total_orders + 1 >= 10 then 'VIP'
      when total_orders + 1 >= 3  then 'Regular'
      else segment
    end
  where id = new.customer_id
    and business_id = new.business_id;
  return new;
end;
$$;

revoke execute on function public.update_customer_on_order() from public, anon, authenticated;

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
  where id = new.customer_id
    and business_id = new.business_id;
  return new;
end;
$$;

revoke execute on function public.update_customer_on_refund() from public, anon, authenticated;


-- ─── 3. What a browser can change on an order ──────────────────────────────
create or replace function public.protect_order_fields()
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
    -- The only sale a browser adds is a counter sale on the POS.
    if coalesce(new.total, 0) < 0 or coalesce(new.delivery_fee, 0) < 0 then
      raise exception 'A sale can''t be less than zero' using errcode = '23514';
    end if;
    new.source            := 'pos';
    new.stripe_payment_id := null;
    new.delivery_job_id   := null;
    return new;
  end if;

  -- Status, the fulfilment stamps and tracking. Everything else stays.
  -- business_id passes through so the row rules refuse a move to another shop.
  new := jsonb_populate_record(old, jsonb_build_object(
    'business_id',     new.business_id,
    'status',          new.status,
    'placed_at',       new.placed_at,
    'picked_at',       new.picked_at,
    'packed_at',       new.packed_at,
    'shipped_at',      new.shipped_at,
    'delivered_at',    new.delivered_at,
    'carrier',         new.carrier,
    'tracking_number', new.tracking_number,
    'tracking_url',    new.tracking_url));
  return new;
end;
$$;

revoke execute on function public.protect_order_fields() from public, anon, authenticated;

drop trigger if exists protect_order_fields on public.orders;
create trigger protect_order_fields
  before insert or update on public.orders
  for each row execute function public.protect_order_fields();
