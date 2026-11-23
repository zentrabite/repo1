-- 031 · Spending points
-- Customers earned points on every order (10 a dollar, migration 005) and the
-- Rewards page let a shop list rewards, but nothing could spend them. The
-- shop's website told customers to swap them for rewards. Now staff swap
-- points for a reward at the counter, from the customer's page in the CRM
-- (/api/rewards/redeem), and an owner or manager can undo a mistake.
--
-- Both run in one step each, so two taps at once can't spend the same points
-- twice and points never go below 0. Server only: the route checks the login
-- and the shop first. Customers can't spend points online yet, because
-- nothing proves who's typing a phone number until texts work.
--
-- Only adds two functions. No rows are touched. Safe to run twice.

create or replace function public.redeem_reward(p_business uuid, p_customer uuid, p_reward uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost    int;
  v_title   text;
  v_balance int;
  v_id      uuid;
begin
  select points_cost, title into v_cost, v_title
    from rewards_catalogue
   where id = p_reward and business_id = p_business and coalesce(is_active, true);
  if v_cost is null or v_cost < 1 then
    return jsonb_build_object('ok', false, 'error', 'reward');
  end if;

  -- Takes the points only if they're there. The row lock makes a second
  -- redemption at the same moment wait, then see the new balance.
  update customers
     set points_balance = coalesce(points_balance, 0) - v_cost
   where id = p_customer and business_id = p_business and coalesce(points_balance, 0) >= v_cost
  returning points_balance into v_balance;

  if not found then
    select coalesce(points_balance, 0) into v_balance from customers where id = p_customer and business_id = p_business;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'customer');
    end if;
    return jsonb_build_object('ok', false, 'error', 'points', 'balance', v_balance, 'cost', v_cost);
  end if;

  insert into reward_redemptions (business_id, customer_id, catalogue_id, points_spent, redeemed_at, status)
  values (p_business, p_customer, p_reward, v_cost, now(), 'redeemed')
  returning id into v_id;

  insert into loyalty_events (business_id, customer_id, event_type, points, source)
  values (p_business, p_customer, 'redeem', -v_cost, v_id::text);

  return jsonb_build_object('ok', true, 'id', v_id, 'title', v_title, 'cost', v_cost, 'balance', v_balance);
end
$$;

create or replace function public.undo_redemption(p_business uuid, p_redemption uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_points   int;
  v_balance  int;
begin
  update reward_redemptions
     set status = 'cancelled'
   where id = p_redemption and business_id = p_business and status = 'redeemed'
  returning customer_id, points_spent into v_customer, v_points;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'redemption');
  end if;

  update customers
     set points_balance = coalesce(points_balance, 0) + v_points
   where id = v_customer and business_id = p_business
  returning points_balance into v_balance;

  insert into loyalty_events (business_id, customer_id, event_type, points, source)
  values (p_business, v_customer, 'redeem_undone', v_points, p_redemption::text);

  return jsonb_build_object('ok', true, 'points', v_points, 'balance', v_balance);
end
$$;

revoke execute on function public.redeem_reward(uuid, uuid, uuid)  from public, anon, authenticated;
revoke execute on function public.undo_redemption(uuid, uuid)      from public, anon, authenticated;
grant  execute on function public.redeem_reward(uuid, uuid, uuid)  to service_role;
grant  execute on function public.undo_redemption(uuid, uuid)      to service_role;
