# ZentraBite CRM — Developer Blueprint

> **Purpose.** This document combines the original Phase 1 foundation brief with the full developer-ready breakdown of every CRM page. It is a forward-looking spec — a blueprint for how the system should work, what each page does, what tables back it, and what features would make the product stronger.
>
> For the *current* state of each page (what's live, what's mocked, what's pending) see [`crm-breakdown.md`](./crm-breakdown.md). For overall architecture see [`system-architecture.md`](./system-architecture.md).

---

## Contents

- [Part A — Foundation brief (Phase 1 scope)](#part-a--foundation-brief-phase-1-scope)
- [Part B — Page-by-page developer breakdown](#part-b--page-by-page-developer-breakdown)
  - [1. Core system architecture](#1-core-system-architecture)
  - [2. Dashboard](#2-dashboard)
  - [3. Orders](#3-orders)
  - [4. POS](#4-pos)
  - [5. Menu](#5-menu)
  - [6. Stock](#6-stock)
  - [7. AI Calls](#7-ai-calls)
  - [8. Drivers](#8-drivers)
  - [9. Customers](#9-customers)
  - [10. Rewards](#10-rewards)
  - [11. Win Back](#11-win-back)
  - [12. Automation](#12-automation)
  - [13. Analytics](#13-analytics)
  - [14. Finances](#14-finances)
  - [15. Rostering](#15-rostering)
  - [16. Settings](#16-settings)
  - [17. Cross-page integration rules](#17-cross-page-integration-rules)
  - [18. Suggested API / backend structure](#18-suggested-api--backend-structure)
- [Part C — Improvements and extra features](#part-c--improvements-and-extra-features)
- [Part D — Suggested build order](#part-d--suggested-build-order)
- [Part E — Final advice](#part-e--final-advice)

---

# Part A — Foundation brief (Phase 1 scope)

## Role

You are acting as a senior full-stack engineer, SaaS architect, and production systems designer building the **production-grade foundation of the ZentraBite CRM**.

## Important context

- The marketing site and demo already exist at zentrabite.com.
- **Do not** rebuild, overwrite, replace, or modify existing marketing/demo logic unless explicitly told.
- This brief only covers the CRM foundation and Phase 1 scaffolding.

## Primary objective

Create an initial production-ready foundation for the ZentraBite CRM so it can:

- run locally
- be committed to GitHub cleanly
- scale to multiple businesses
- support future integrations and advanced modules
- serve as the real base for continued feature development

## Mandatory core stack

- Next.js 14+ with App Router
- React + TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Realtime, RLS)
- Clean modular architecture

## Architecture requirements

Build like a real multi-tenant SaaS product — designed to later support:

- Stripe billing / subscriptions
- SMS provider integration (e.g. Twilio)
- Email provider integration
- Background jobs / scheduled automations
- File / image storage
- Analytics / events
- External integrations: Square, Xero, delivery providers, AI call systems
- Audit logging
- Role-based permissions
- Multi-location support later

## Product context

ZentraBite must support **both**:

1. **Restaurant / food-business workflows** — direct ordering, orders, POS, menu, drivers, channel attribution, win-back campaigns.
2. **General repeat-service business workflows** — services, bookings, customer lifecycle tracking, reminders based on service cycles, rewards, re-engagement automations.

Do not hard-code architecture for one business type only. Restaurants are supported first, but the domain model must expand cleanly.

## Core product principles

- Multi-tenant from day one
- Secure by default
- Production-ready folder structure
- Separation of concerns
- Reusable UI components
- Reusable service layer
- Easy to extend later
- Strong typing everywhere
- No fake toy architecture, no unnecessary complexity either

## Critical rules

- **Do not** touch the existing marketing site or demo code
- **Do not** build this as a marketing website
- **Do not** use vague pseudo-code
- **Do not** skip required files
- **Do not** assume anything is already installed
- **Do not** generate placeholder junk that would need to be fully rewritten later
- **Do** create realistic starter code that can genuinely run
- **Do** keep the code clean, modular, and scalable
- **Do** include comments where useful, but do not over-comment
- **Do** use best-practice naming

## Phase 1 tasks

### 1. Project structure

Create a production-ready structure including `app`, `components`, `lib`, `services`, `types`, `hooks`, `config`, `supabase`, `middleware`, `styles`, `constants`, `utils`.

### 2. Essential setup / config files

At minimum: `package.json`, `tsconfig.json`, `next.config.js|mjs`, `tailwind.config.js|ts`, `postcss.config.js`, `.env.example`, `.gitignore`, `README.md`.

### 3. Base application shell

- root layout
- sidebar layout
- top bar
- protected app area
- consistent navigation structure
- clean dashboard shell

### 4. Authentication foundations

- Supabase client setup (browser, server, middleware/session handling)
- login page
- auth-aware route protection
- basic user/profile handling
- multi-tenant business-aware auth structure

### 5. Placeholder app routes / pages for all CRM sections

Dashboard, Orders, POS, Menu, Stock, AI Calls, Drivers, Customers, Rewards, Win Back, Automation, Analytics, Finances, Rostering, Settings.

### 6. Shared architecture for future expansion

- types / interfaces
- service modules
- tenant-aware data access
- role / permission support
- navigation config
- reusable page headers / cards / layout blocks

### 7. Database foundation

Don't fully build the production schema yet, but set up starter structures for `businesses`, `profiles/users`, `customers`, `orders`, `menu_items`, `campaigns`, `automation_rules`. Anticipate RLS and business isolation throughout.

## Design decisions

Design the foundation around:

- one shared platform serving many businesses
- each user belonging to a business / tenant
- future business roles: owner, manager, staff, marketing, finance, driver
- future support for business subdomains / tenant-aware environments
- future support for dashboards, campaigns, analytics, scheduled automation jobs

## Quality bar

Realistic, structured, consistent, scalable, easy to continue building on — the starting foundation of serious SaaS software.

---

# Part B — Page-by-page developer breakdown

Assumed stack:

- **Frontend:** Next.js + React + TypeScript
- **Backend:** Supabase / Postgres + Edge / server functions
- **Realtime:** Supabase Realtime / WebSockets
- **Queue jobs:** Cron jobs / background workers
- **Integrations:** Square, Xero, Uber Direct, DeliveryTasker, Uber Eats/DoorDash API or import feeds

---

## 1. Core system architecture

Every part of the CRM should be driven from a shared central data model:

`businesses`, `users`, `customers`, `orders`, `order_items`, `menu_items`, `ingredients`, `stock_movements`, `campaigns`, `campaign_events`, `drivers`, `delivery_jobs`, `reward_accounts`, `reward_transactions`, `finance_entries`, `rosters`, `automation_rules`, `ai_call_profiles`.

That way:

- Dashboard reads from all modules
- POS writes to orders / customers
- Menu controls POS + website + stock usage
- Stock reads menu recipe usage from sold items
- Finances read from all sales channels
- Analytics reads everything

### Suggested database direction

**`businesses`**

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text default 'Australia/Adelaide',
  phone text,
  email text,
  address text,
  gst_registered boolean default true,
  created_at timestamptz default now()
);
```

**`profiles` / staff**

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text,
  role text not null default 'staff',
  created_at timestamptz default now()
);
```

---

## 2. Dashboard

The dashboard should be modular. Each block is a widget. Staff can choose which widgets appear and how they are arranged.

### 2.1 Revenue today total

Shows total paid revenue for today.

```sql
select coalesce(sum(total_amount), 0) as today_revenue
from orders
where business_id = $1
  and payment_status = 'paid'
  and created_at >= date_trunc('day', now())
  and created_at < date_trunc('day', now()) + interval '1 day';
```

Example server function:

```ts
export async function getTodayRevenue(supabase: any, businessId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("business_id", businessId)
    .eq("payment_status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) throw error;

  return data.reduce((sum: number, row: any) => sum + Number(row.total_amount), 0);
}
```

### 2.2 Current orders in the kitchen / live orders

Shows all active orders (`confirmed`, `preparing`, `awaiting_driver`, `out_for_delivery`).

```ts
type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "awaiting_driver"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
```

```sql
select id, order_number, customer_name, status, kitchen_status, total_amount, created_at
from orders
where business_id = $1
  and status in ('confirmed', 'preparing', 'ready', 'awaiting_driver', 'out_for_delivery')
order by created_at asc;
```

Realtime:

```ts
supabase
  .channel("orders-live")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "orders"
  }, payload => {
    console.log("Order changed", payload);
  })
  .subscribe();
```

### 2.3 Recovered revenue from winback engine (last 30 days)

Needs campaign attribution. When a text is sent: create a campaign event record, include discount code or tracked link, and link the customer's next order if coupon/link used or order placed within attribution window.

```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  name text not null,
  type text not null,
  created_at timestamptz default now()
);

create table campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  customer_id uuid references customers(id),
  event_type text not null, -- sent, opened, clicked, redeemed
  order_id uuid references orders(id),
  revenue_attributed numeric(10,2) default 0,
  created_at timestamptz default now()
);
```

```sql
select coalesce(sum(revenue_attributed), 0) as recovered_revenue
from campaign_events ce
join campaigns c on c.id = ce.campaign_id
where c.business_id = $1
  and ce.event_type = 'redeemed'
  and ce.created_at >= now() - interval '30 days';
```

### 2.4 Repeat customer rate (last 30 days)

Repeat = >1 completed order in the last 30 days.

```sql
with recent_orders as (
  select customer_id, count(*) as order_count
  from orders
  where business_id = $1
    and payment_status = 'paid'
    and created_at >= now() - interval '30 days'
    and customer_id is not null
  group by customer_id
),
stats as (
  select
    count(*) as total_customers,
    count(*) filter (where order_count > 1) as repeat_customers
  from recent_orders
)
select
  repeat_customers,
  total_customers,
  case
    when total_customers = 0 then 0
    else round((repeat_customers::numeric / total_customers::numeric) * 100, 2)
  end as repeat_rate
from stats;
```

### 2.5 Live order dashboard

Kanban board: Ordered → Being made → Ready → Out for delivery → Delivered.

```ts
const columns = [
  "new",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered"
];
```

**Improvement:** add timers — minutes since placed, overdue warnings, SLA expected vs actual.

### 2.6 Revenue in the last 14 days

```sql
select
  date(created_at) as day,
  coalesce(sum(total_amount), 0) as revenue
from orders
where business_id = $1
  and payment_status = 'paid'
  and created_at >= now() - interval '14 days'
group by date(created_at)
order by day asc;
```

### 2.7 Revenue by channel (last 30 days)

Uber Eats, DoorDash, In-store, App, Website, Phone, POS.

```sql
alter table orders add column channel text default 'website';

select channel, coalesce(sum(total_amount), 0) as revenue
from orders
where business_id = $1
  and payment_status = 'paid'
  and created_at >= now() - interval '30 days'
group by channel
order by revenue desc;
```

### 2.8 Top customer

```sql
select
  c.id,
  c.full_name,
  c.phone,
  count(o.id) as order_count,
  sum(o.total_amount) as total_spent
from customers c
join orders o on o.customer_id = c.id
where o.business_id = $1
  and o.payment_status = 'paid'
group by c.id, c.full_name, c.phone
order by total_spent desc
limit 1;
```

### 2.9 Winback engine best 3 campaigns

```sql
select
  c.name,
  count(*) filter (where ce.event_type = 'redeemed') as redemptions,
  coalesce(sum(ce.revenue_attributed), 0) as revenue
from campaigns c
left join campaign_events ce on ce.campaign_id = c.id
where c.business_id = $1
  and ce.created_at >= now() - interval '30 days'
group by c.id, c.name
order by revenue desc
limit 3;
```

### 2.10 AI copilot with recommendations

Operational assistant producing recommendations like:

- "You are low on chicken thigh"
- "Friday delivery volume suggests using contractor after 6pm"
- "Winback targeting pizza customers is outperforming burger customers"
- "Top 8 customers have not returned in 21 days"
- "Menu item X has high sales but poor margin"

Two parts: a **rules engine** and an **AI explanation layer**.

Rules-engine examples:

- Stock projected to run out in < 2 days → flag restock
- Repeat rate drops > 10% vs previous 30 days → retention issue
- Campaign ROI > 3× → suggest scaling
- Average kitchen prep time > target → staffing review

```sql
create table ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  type text not null,
  priority text not null,
  title text not null,
  description text not null,
  action_url text,
  status text default 'open',
  created_at timestamptz default now()
);
```

AI flow: scheduled worker computes metrics → stores candidates → AI formats them into natural language.

```ts
if (stock.daysRemaining < 2) {
  recommendations.push({
    type: "stock",
    priority: "high",
    title: "Chicken thigh running low",
    description: `Estimated to run out in ${stock.daysRemaining} days based on current order velocity.`,
    action_url: "/stock"
  });
}
```

### 2.11 Customizable dashboard

Each business/user picks which widgets show, order/layout, and size.

```sql
create table dashboard_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  widgets jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

```json
[
  { "key": "todayRevenue", "enabled": true, "size": "large", "position": 1 },
  { "key": "liveOrders", "enabled": true, "size": "large", "position": 2 },
  { "key": "topCustomer", "enabled": true, "size": "small", "position": 3 }
]
```

---

## 3. Orders

Master running list showing order number, customer, status, channel, items, total, payment status, time, driver, notes.

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  customer_id uuid references customers(id),
  order_number bigint generated always as identity,
  channel text not null,
  status text not null default 'new',
  payment_status text not null default 'unpaid',
  subtotal numeric(10,2) default 0,
  discount_total numeric(10,2) default 0,
  delivery_fee numeric(10,2) default 0,
  total_amount numeric(10,2) default 0,
  delivery_address text,
  notes text,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  item_name text not null,
  quantity int not null,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  modifiers jsonb default '[]'
);
```

```sql
select
  o.id,
  o.order_number,
  o.status,
  o.channel,
  o.total_amount,
  o.created_at,
  c.full_name,
  c.phone
from orders o
left join customers c on c.id = o.customer_id
where o.business_id = $1
order by o.created_at desc
limit 100;
```

**Improvement:** filters by date, status, channel, customer, payment, delivery type.

---

## 4. POS

POS should be controlled by Menu, create in-store/manual orders, capture customer data into CRM, support walk-in or identified customer, support notes, modifiers, discounts, payment method.

When an order is placed:

1. create/find customer
2. create order + order items
3. assign `channel = pos`
4. update rewards if customer identified
5. deduct stock based on recipes

Checkout should ask name, phone, email (optional), address (optional unless delivery), birthday (optional), marketing opt-in.

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  full_name text,
  phone text,
  email text,
  address text,
  birthday date,
  marketing_opt_in boolean default false,
  total_spent numeric(10,2) default 0,
  order_count int default 0,
  last_order_at timestamptz,
  regular_order_summary text,
  created_at timestamptz default now()
);
```

```ts
async function findOrCreateCustomer(supabase: any, businessId: string, phone: string, name?: string) {
  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      phone,
      full_name: name ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## 5. Menu

Menu is the control centre for website menu, app menu, POS menu, stock usage, pricing, modifiers, availability, upsells.

Each menu item has selling info, display info, channel rules, recipe mapping.

```sql
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  name text not null,
  description text,
  price numeric(10,2) not null,
  category text,
  image_url text,
  is_active boolean default true,
  available_on_pos boolean default true,
  available_on_web boolean default true,
  available_on_app boolean default true,
  available_on_uber boolean default false,
  available_on_doordash boolean default false,
  created_at timestamptz default now()
);

create table menu_item_recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity_used numeric(10,3) not null,
  unit text not null
);
```

When sold: check recipe → deduct ingredient quantities → trigger alert if low.

**Improvement:** menu versioning so changes can be rolled back.

---

## 6. Stock

Tracks current stock on hand, usage, projected runout date, expiry risk, reorder needs, shopping list, AI stock insights.

```sql
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  name text not null,
  unit text not null,
  current_quantity numeric(10,3) default 0,
  reorder_threshold numeric(10,3) default 0,
  shelf_life_days int,
  last_purchased_at timestamptz,
  cost_per_unit numeric(10,4),
  created_at timestamptz default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  ingredient_id uuid not null references ingredients(id),
  movement_type text not null, -- purchase, usage, waste, adjustment
  quantity numeric(10,3) not null,
  reason text,
  linked_order_id uuid references orders(id),
  created_at timestamptz default now()
);
```

When an order completes:

```ts
for (const item of orderItems) {
  const recipe = await getRecipe(item.menu_item_id);

  for (const ingredient of recipe) {
    const usedQty = ingredient.quantity_used * item.quantity;

    await insertStockMovement({
      ingredient_id: ingredient.ingredient_id,
      movement_type: "usage",
      quantity: usedQty,
      linked_order_id: order.id
    });

    await decrementIngredientStock(ingredient.ingredient_id, usedQty);
  }
}
```

AI stock insights — daily usage average, projected days remaining, expiry warnings:

```ts
daysRemaining = currentQuantity / avgDailyUsage;
```

Shopping list:

```sql
select name, current_quantity, reorder_threshold
from ingredients
where business_id = $1
  and current_quantity <= reorder_threshold;
```

---

## 7. AI Calls

Lets the business customise the AI phone agent: personality, greeting, business info, opening hours, FAQ answers, menu info, escalation rules, when AI answers (after-hours only, always, overflow).

```sql
create table ai_call_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  enabled boolean default true,
  answer_mode text default 'after_hours', -- after_hours, always, overflow
  personality text,
  greeting text,
  faq_context text,
  escalation_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Flow: call comes in via telephony provider → system checks profile → AI answers or routes → AI can answer questions, take order intent, collect details, send follow-up SMS, create CRM lead/order draft.

**Improvement:** separate flows for general enquiries, order taking, catering, complaint handling, booking.

---

## 8. Drivers

Automatically chooses cheapest/best delivery method: in-house driver, Uber Direct, DeliveryTasker contractor.

Inputs: driver availability, delivery distance/time, current order queue, expected prep completion, cost estimates by provider, SLA target.

Decision rules:

- If in-house driver available and return ETA acceptable → use in-house
- If in-house busy too long → compare external providers
- If predicted order spike → pre-book contractor

```sql
create table drivers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  full_name text not null,
  driver_type text not null, -- in_house, uber_direct, contractor
  status text default 'available',
  current_job_id uuid,
  average_speed_kmh numeric(5,2),
  created_at timestamptz default now()
);

create table delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  order_id uuid not null references orders(id),
  assigned_driver_id uuid references drivers(id),
  provider text not null,
  estimated_cost numeric(10,2),
  estimated_pickup_at timestamptz,
  estimated_delivery_at timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);
```

```ts
function chooseDeliveryProvider(order, availableDrivers, externalQuotes) {
  const inHouse = getBestInHouseDriver(availableDrivers, order);

  if (inHouse && inHouse.canDeliverWithinTarget) {
    return {
      provider: "in_house",
      driverId: inHouse.id,
      cost: inHouse.estimatedInternalCost
    };
  }

  const cheapestExternal = externalQuotes.sort((a, b) => a.cost - b.cost)[0];
  return cheapestExternal;
}
```

---

## 9. Customers

Customer CRM view: name, phone, email, address, total spent, order count, regular order, last order, rewards balance, campaign history.

```sql
select
  c.*,
  coalesce(sum(o.total_amount), 0) as total_spent,
  count(o.id) as order_count,
  max(o.created_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id and o.payment_status = 'paid'
where c.business_id = $1
group by c.id;
```

**Improvement:** segments — VIP, at-risk, lapsed, frequent buyer, discount-only buyer, high margin buyer.

---

## 10. Rewards

Tracks program config, customer points balances, redemptions, total value of outstanding points.

```sql
create table reward_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  customer_id uuid not null references customers(id),
  points_balance int default 0,
  lifetime_points_earned int default 0,
  lifetime_points_redeemed int default 0,
  created_at timestamptz default now()
);

create table reward_transactions (
  id uuid primary key default gen_random_uuid(),
  reward_account_id uuid not null references reward_accounts(id),
  transaction_type text not null, -- earn, redeem, adjust, expire
  points int not null,
  dollar_value numeric(10,2),
  linked_order_id uuid references orders(id),
  created_at timestamptz default now()
);
```

When an order completes: system calculates earn points → writes reward transaction → updates balance.

```ts
const pointsEarned = Math.floor(order.total_amount);
```

Or custom rules: 1 point per $1, double points on Tuesdays, item bonuses.

Total dollar value of points in market:

```sql
select coalesce(sum(points_balance * 0.01), 0) as liability_value
from reward_accounts
where business_id = $1;
```

---

## 11. Win Back

Automated retention texts:

- "We haven't seen you in 2 weeks"
- "Come back today for 20% off"
- "Your favourite item is back"
- "We miss you, here's free delivery"

Campaign engine: segment customers → define trigger → generate offer → send SMS/email/push → track response/revenue.

```sql
create table winback_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  name text not null,
  inactive_days int not null,
  offer_type text not null,
  offer_value numeric(10,2),
  channel text not null default 'sms',
  is_active boolean default true,
  created_at timestamptz default now()
);
```

```ts
async function runWinbackCampaign(businessId: string) {
  const customers = await getInactiveCustomers(businessId, 14);

  for (const customer of customers) {
    await sendSms(customer.phone, "Hi, we haven't seen you in 2 weeks. Order today and get 20% off.");
    await logCampaignEvent(customer.id);
  }
}
```

---

## 12. Automation

Lets businesses define rules: low stock alerts, staff notifications, customer follow-ups, birthday offers, campaign scheduling, failed payment alerts, review requests.

```sql
create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  name text not null,
  trigger_type text not null,
  conditions jsonb not null,
  actions jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

```json
{
  "trigger_type": "stock_below_threshold",
  "conditions": { "ingredient": "mozzarella", "threshold": 5 },
  "actions": [{ "type": "email" }, { "type": "dashboard_alert" }]
}
```

---

## 13. Analytics

Top selling items, highest revenue items, average order value, sales trends, campaign conversion, customer retention, channel performance.

```sql
select
  oi.item_name,
  sum(oi.quantity) as qty_sold,
  sum(oi.line_total) as revenue
from order_items oi
join orders o on o.id = oi.order_id
where o.business_id = $1
  and o.payment_status = 'paid'
  and o.created_at >= now() - interval '30 days'
group by oi.item_name
order by revenue desc;
```

**Improvement:** margin analytics using ingredient costs, not just revenue.

---

## 14. Finances

Revenue by source, fees, net revenue, GST withholding, AOV, average orders per day, finance export, Xero integration.

Ledger-style table:

```sql
create table finance_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  source_type text not null, -- order, fee, refund, adjustment
  source_id uuid,
  channel text,
  gross_amount numeric(10,2) default 0,
  fee_amount numeric(10,2) default 0,
  tax_amount numeric(10,2) default 0,
  net_amount numeric(10,2) default 0,
  entry_date date not null,
  created_at timestamptz default now()
);
```

When an order is created/paid: create finance entry → if third-party channel, apply fee rules → calculate tax portion → sync summary to Xero.

```sql
select
  case when count(*) = 0 then 0
  else round(sum(total_amount) / count(*), 2)
  end as avg_order_value
from orders
where business_id = $1
  and payment_status = 'paid';
```

Xero flow: daily summary posted → sales grouped by tax code → fees booked separately → payroll/roster outputs synced.

---

## 15. Rostering

Create rosters, auto-suggest shifts based on demand, email roster, sync to app, track timesheets, connect to Square/Xero, automate payroll prep.

```sql
create table roster_shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  employee_id uuid not null references profiles(id),
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  role text,
  status text default 'scheduled',
  created_at timestamptz default now()
);
```

Smart rostering uses sales history — Friday/Saturday higher staffing, lunch vs dinner peaks, prep staff based on menu mix. E.g. if previous 4 Fridays 6pm–8pm averaged 22 orders → recommend 2 kitchen, 1 front, 2 drivers.

---

## 16. Settings

Covers team members, permissions, integrations, business profile, channels, notifications, branding, tax settings, operating hours, customer communication defaults.

### Permissions — RBAC

Roles: owner, manager, kitchen, cashier, marketing, finance, driver.

```ts
const permissions = {
  owner: ["*"],
  manager: ["dashboard", "orders", "stock", "analytics", "roster"],
  kitchen: ["orders:view", "orders:updateStatus"],
  driver: ["delivery:viewOwnJobs"],
  marketing: ["customers:view", "winback", "automation", "analytics:viewMarketing"]
};
```

### Integrations

Square, Xero, Uber Direct, DeliveryTasker, SMS provider, AI calls provider, website/app connection.

---

## 17. Cross-page integration rules

The product is only powerful if pages connect.

**Menu → POS / Website / App / Stock.** When a menu item changes: website, app, POS all update; recipe usage updates stock logic.

**Orders → Customers / Rewards / Finances / Analytics.** When an order is placed: customer stats update, rewards update, finance entry created, analytics updated.

**Stock → Dashboard / Automation / AI Copilot.** Low stock appears on dashboard, sends alert, AI suggests shopping list.

**Drivers → Orders / Dashboard / Finances.** Delivery assigned: order status updates, delivery fee logged, ETA visible live.

---

## 18. Suggested API / backend structure

```
/lib
  /dashboard
  /orders
  /customers
  /menu
  /stock
  /drivers
  /campaigns
  /finance
  /roster
  /ai
/app
  /dashboard
  /orders
  /pos
  /menu
  /stock
  /ai-calls
  /drivers
  /customers
  /rewards
  /winback
  /automation
  /analytics
  /finances
  /rostering
  /settings
```

Service split: `ordersService.ts`, `menuService.ts`, `stockService.ts`, `financeService.ts`, `campaignService.ts`.

---

# Part C — Improvements and extra features

### 19.1 Margin dashboard

Not just revenue — gross margin by item, by channel, by time of day. Flag high-selling but low-profit items.

### 19.2 Smart menu engineering

AI recommends removing low-margin low-volume items, promoting high-margin popular items, bundling underperformers, adjusting prices as ingredient costs rise.

### 19.3 Predicted busy periods

Past order history + day/time trends → predict kitchen load, staffing needs, delivery load, stock needs. Strengthens drivers, rostering, and stock together.

### 19.4 Customer health score

Score per customer based on spend, recency, frequency, campaign response, favourite items. Segments: loyal, at risk, lost, VIP, discount chaser.

### 19.5 Promotion simulator

Before launching a campaign estimate expected redemption, margin impact, channel effect, likely revenue lift.

### 19.6 Multi-location support

Multi-store dashboards, cross-store stock transfer, location comparison, area manager access.

### 19.7 Waste tracking

Track spoilage, overproduction, staff waste, shrinkage, damaged stock.

### 19.8 Delivery profitability tracker

Per delivery: fee charged, driver cost, external provider cost, wait time, refund risk, net profit.

### 19.9 Review generation engine

After successful orders: send review request → Google review link → optional small points bonus (where platform policy allows).

### 19.10 Staff performance dashboard

Orders handled, prep speed, POS upsells, driver on-time rate, attendance, labour cost per sales dollar.

### 19.11 Smart reorder assistant

Not just "buy more chicken" — recommended supplier order, estimated quantity until next delivery day, expected cost, margin impact if not reordered.

### 19.12 Refund and issue workflow

Dedicated issue centre: late delivery, wrong item, refund, remake, complaint follow-up, customer recovery offer.

### 19.13 Advanced notification centre

Proper centre with priorities: urgent, action needed, suggestion, completed.

### 19.14 Campaign A/B testing

Test two offer types, two message styles, two send times. Show which wins.

### 19.15 Forecasted cashflow

Next week expected revenue, wages, supplier costs, GST set aside, likely net cash available.

### 19.16 Funnel tracking

Marketplace order → first direct order → second direct order → rewards use → loyal customer. Shows how ZentraBite converts third-party traffic into owned customers.

### 19.17 Digital prep board

Kitchen mode: ticket display, prep timers, station assignment, bump/complete buttons, allergen flagging.

### 19.18 Data security features

RLS by business, audit logs, staff action logs, role permissions, secure PII handling, consent tracking for marketing.

---

# Part D — Suggested build order

### Phase 1

- Auth + businesses + users
- Orders
- Customers
- Dashboard basics
- POS
- Menu

### Phase 2

- Stock
- Rewards
- Winback
- Analytics
- Finances basics

### Phase 3

- Drivers logic
- Rostering
- AI calls
- AI copilot
- Advanced automations

### Phase 4

- Margin intelligence
- Forecasting
- Multi-location
- Advanced AI optimisation

---

# Part E — Final advice

The most important thing for ZentraBite is that it does not become a bunch of separate pages pretending to be integrated. The strength of the product is the links between systems:

- Menu drives POS, stock, and website
- Orders drive customers, rewards, finances, delivery, analytics
- Stock feeds AI copilot and automation
- Drivers feed delivery cost and SLA performance
- Winback feeds recovered revenue and repeat rate
- Finance ties everything together

That is where the real value is.
