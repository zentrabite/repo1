-- 037 · Deleting a customer's details
-- A customer can ask a shop to delete what it holds about them (the draft
-- privacy policy, section 13). Until now nothing could. Since 026 a browser
-- can't delete customers, orders or texts, and nothing on the server did.
--
-- erase_customer() removes everything that says who the person is, in one
-- step, and keeps the money. The shop needs its sales for tax, so each order
-- keeps its amount, items and date, and the customer's row stays (orders,
-- texts and points events point at it) as "Deleted customer" with no way to
-- reach them.
--
-- Removed. Name, phone, email, birthday, referral code, consent details and
-- points. Each order's delivery address and note. The delivery job's drop-off
-- address. Every text and email's words and where it went (the send itself
-- stays, so the stop rules still count it). Their reviews. The note in the
-- owner's new-order alert. Unused win-back codes end now.
-- Kept. Order totals, items, dates and refunds. Points events and swaps as
-- numbers. The row, marked opted out, so nothing can be sent to it.
--
-- Server only. /api/customers/[id]/delete checks the login is the shop's
-- owner or manager first. Adds one column and one function, touches no rows
-- until it's called. Safe to run twice.

alter table public.customers add column if not exists erased_at timestamptz;

create or replace function public.erase_customer(p_business uuid, p_customer uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders  int;
  v_texts   int;
  v_reviews int;
begin
  -- The row lock makes a second delete at the same moment wait, then stop.
  perform 1 from customers
   where id = p_customer and business_id = p_business and erased_at is null
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'customer');
  end if;

  update customers set
    name                    = 'Deleted customer',
    phone                   = null,
    email                   = null,
    birth_month             = null,
    birth_day               = null,
    referral_code           = null,
    points_balance          = 0,
    marketing_opt_in        = false,
    marketing_opt_in_at     = null,
    marketing_opt_in_source = null,
    opted_out               = true,
    opted_out_at            = coalesce(opted_out_at, now()),
    erased_at               = now()
  where id = p_customer;

  update notifications set body = null
   where business_id = p_business
     and order_id in (select id from orders where business_id = p_business and customer_id = p_customer);

  update delivery_jobs set dropoff_address = null
   where business_id = p_business
     and order_id in (select id from orders where business_id = p_business and customer_id = p_customer);

  update orders set ship_to = null, notes = null
   where business_id = p_business and customer_id = p_customer;
  get diagnostics v_orders = row_count;

  update sms_logs set message = null, recipient = null
   where business_id = p_business and customer_id = p_customer;
  get diagnostics v_texts = row_count;

  delete from reviews where business_id = p_business and customer_id = p_customer;
  get diagnostics v_reviews = row_count;

  update offer_codes set expires_at = now()
   where business_id = p_business and customer_id = p_customer
     and redeemed_at is null and expires_at > now();

  return jsonb_build_object('ok', true, 'orders', v_orders, 'texts', v_texts, 'reviews', v_reviews);
end
$$;

revoke execute on function public.erase_customer(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.erase_customer(uuid, uuid) to service_role;
