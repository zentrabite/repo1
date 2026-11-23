-- 030 · Team logins
-- A team member invited from Settings had a login but no shop. Every row rule
-- keys on users.business_id, which only owners have, so a team member saw an
-- empty CRM and their role never loaded (found 30 Sep, re-checked 23 Nov).
--
-- 1. get_my_business_id() now also gives a team member the shop they joined.
--    The same rule as the server (lib/request-business.ts). The login was made
--    by an invite (invited_at), the invite link was opened (email_confirmed_at),
--    and the membership isn't removed. Owners keep their own shop first. A
--    login on more than one team gets the oldest, the same pick as the server.
-- 2. get_my_role() says Owner, Manager, Staff or POS for the sidebar and rules.
-- 3. The 26 rules that read users.business_id themselves now use the function,
--    so team members reach rosters, stock, drivers, reviews, rewards, win-back
--    rules, delivery, notifications and the AI tables too. Nothing else about
--    them changes.
-- 4. business_members is server only. The team is listed and changed through
--    /api/team, which checks the caller's role. Before this an owner's browser
--    could write it, and once members could log in, a member could have given
--    themselves a better role.
-- 5. Only owners and managers can change the shop's own row (settings, name,
--    address, logo) from a browser. Staff and POS pause online orders through
--    /api/orders/pause instead.
--
-- Only rules and functions change. No rows are touched. Safe to run twice.

create or replace function public.get_my_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.business_id from public.users u where u.id = auth.uid()),
    (select m.business_id
       from public.business_members m
       join auth.users a on lower(a.email) = m.email
      where a.id = auth.uid()
        and a.invited_at is not null
        and a.email_confirmed_at is not null
        and m.status not in ('removed', 'revoked')
      order by m.created_at, m.business_id
      limit 1)
  )
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select u.business_id from public.users u where u.id = auth.uid()) is not null then 'Owner'
    else (select m.role
            from public.business_members m
            join auth.users a on lower(a.email) = m.email
           where a.id = auth.uid()
             and a.invited_at is not null
             and a.email_confirmed_at is not null
             and m.status not in ('removed', 'revoked')
           order by m.created_at, m.business_id
           limit 1)
  end
$$;

revoke execute on function public.get_my_role() from public, anon;
grant  execute on function public.get_my_role() to authenticated, service_role;

alter policy "members_read_ai_call_profiles" on public.ai_call_profiles
  using (business_id = public.get_my_business_id());
alter policy "members_write_ai_call_profiles" on public.ai_call_profiles
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());
alter policy "members_read_ai_recommendations" on public.ai_recommendations
  using (business_id = public.get_my_business_id());
alter policy "members_write_ai_recommendations" on public.ai_recommendations
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());
alter policy "members_read_campaign_events" on public.campaign_events
  using (business_id = public.get_my_business_id());
alter policy "members_write_campaign_events" on public.campaign_events
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());
alter policy "delivery_jobs_tenant_insert" on public.delivery_jobs
  with check (business_id = public.get_my_business_id());
alter policy "delivery_jobs_tenant_select" on public.delivery_jobs
  using (business_id = public.get_my_business_id());
alter policy "delivery_jobs_tenant_update" on public.delivery_jobs
  using (business_id = public.get_my_business_id());
alter policy "delivery_quotes_tenant_insert" on public.delivery_quotes
  with check (business_id = public.get_my_business_id());
alter policy "delivery_quotes_tenant_select" on public.delivery_quotes
  using (business_id = public.get_my_business_id());
alter policy "Tenant: drivers" on public.drivers
  using (business_id = public.get_my_business_id());
alter policy "Tenant: loyalty_events" on public.loyalty_events
  using (business_id = public.get_my_business_id());
alter policy "owners_read_own_notifications" on public.notifications
  using (business_id = public.get_my_business_id());
alter policy "owners_update_own_notifications" on public.notifications
  using (business_id = public.get_my_business_id());
alter policy "Tenant: reviews" on public.reviews
  using (business_id = public.get_my_business_id());
alter policy "Tenant: reward_redemptions" on public.reward_redemptions
  using (business_id = public.get_my_business_id());
alter policy "Tenant: rewards_catalogue" on public.rewards_catalogue
  using (business_id = public.get_my_business_id());
alter policy "members_read_roster_shifts" on public.roster_shifts
  using (business_id = public.get_my_business_id());
alter policy "members_write_roster_shifts" on public.roster_shifts
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());
alter policy "stock_counts_tenant_all" on public.stock_counts
  using (business_id = public.get_my_business_id());
alter policy "stock_counts_tenant_select" on public.stock_counts
  using (business_id = public.get_my_business_id());
alter policy "stock_items_tenant_all" on public.stock_items
  using (business_id = public.get_my_business_id());
alter policy "stock_items_tenant_select" on public.stock_items
  using (business_id = public.get_my_business_id());
alter policy "members_read_winback_rules" on public.winback_rules
  using (business_id = public.get_my_business_id());
alter policy "members_write_winback_rules" on public.winback_rules
  using (business_id = public.get_my_business_id())
  with check (business_id = public.get_my_business_id());

drop policy if exists "Tenant: business_members" on public.business_members;
revoke insert, update, delete on public.business_members from anon, authenticated;
revoke select on public.business_members from anon, authenticated;

drop policy if exists "businesses_update" on public.businesses;
create policy "businesses_update" on public.businesses for update
  using (id = public.get_my_business_id() and public.get_my_role() in ('Owner', 'Manager'));

-- Nothing may still read users.business_id on its own, or a team member
-- would miss that table.
do $$
declare left_over text;
begin
  select string_agg(tablename || '.' || policyname, ', ') into left_over
    from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') ~ 'FROM users' or coalesce(with_check, '') ~ 'FROM users');
  if left_over is not null then
    raise exception 'Rules still reading users.business_id: %', left_over;
  end if;
end $$;
