# ZentraBite — Implementation Plan
_Source of truth for all outstanding fixes and builds. Work through each phase in order — later phases depend on earlier ones._

---

## How to use this document

- Work through phases **in order** — schema must be applied before new pages are built
- Each step lists the **exact files to change**, what to do, and how to verify
- Mark steps complete as you go
- Do not skip to Phase 4+ without Phase 1 applied in Supabase

---

## Decision log (answers from Q&A session)

| # | Decision |
|---|---|
| 1 | Win-back edge function → update to read from `winback_rules` (not `campaigns`) |
| 2 | Trial copy → "1-month free trial" everywhere (was "14-Day Free Trial") |
| 3 | Rewards → remove pay-with-points, rebuild as earn → unlock → redeem catalogue |
| 4 | Earn rules → build out referral (500pts), birthday (200pts), 5-order streak (100pts), direct-order multiplier (1.2×) |
| 5 | Drivers page → build a real `/drivers` page in production CRM |
| 6 | Schema → convert APPLY_NOW.sql into proper `011_` migration + include cron schedules |
| 7 | Cron jobs → include in the 011_ migration so they activate on `supabase db push` |
| 8 | Reviews → build the `/reviews` page AND remove the `cost: 9` from the Admin module catalogue |
| 9 | /demo/super-admin → build it (tenant list, module toggles, usage, impersonation) |
| 10 | Segment warning → show a banner on `/customers` when all segment values are null |
| 11 | Logo upload → build in Settings, store to Supabase Storage, display in sidebar |
| 12 | Delivery costs → Uber Direct live API for actual dispatch quotes; merchant-configurable rates in Settings for Tasker/other providers |

---

## PHASE 1 — Schema & Infrastructure
_Must be done first. Apply in Supabase before any other code changes._

### Step 1 — Create `011_pending_schema.sql`

**What:** Convert `supabase/migrations/APPLY_NOW.sql` into a proper numbered migration and add the cron schedule SQL for both edge functions.

**File to create:** `supabase/migrations/011_pending_schema.sql`

**Contents — copy everything from APPLY_NOW.sql PLUS add at the bottom:**

```sql
-- ─── Cron: nightly analytics (2 AM ACST = 4 PM UTC) ───────────────────────
-- Replace YOUR_ANON_KEY with the value from Supabase → Project Settings → API
SELECT cron.schedule(
  'nightly-analytics',
  '0 16 * * *',
  $$SELECT net.http_post(
    url := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/nightly-analytics',
    headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- ─── Cron: win-back daily (9 AM ACST = 11 PM UTC) ─────────────────────────
SELECT cron.schedule(
  'win-back-daily',
  '0 23 * * *',
  $$SELECT net.http_post(
    url := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/win-back',
    headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- ─── Supabase Storage: business-logos bucket ──────────────────────────────
-- Run this separately in Storage tab if the SQL editor doesn't support it:
-- Storage → New bucket → "business-logos" → Public: ON
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read logos (public); only service role can write
CREATE POLICY IF NOT EXISTS "Public logo read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

-- ─── Earn events table (for referral, birthday, streak tracking) ───────────
CREATE TABLE IF NOT EXISTS loyalty_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- 'order' | 'referral' | 'birthday' | 'streak' | 'review'
  points       INT NOT NULL DEFAULT 0,
  multiplier   NUMERIC(4,2) DEFAULT 1.0,
  source       TEXT,          -- order_id, referral_code, etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_customer
  ON loyalty_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_business
  ON loyalty_events(business_id, event_type, created_at DESC);

-- ─── Rewards catalogue (unlock → redeem items) ────────────────────────────
CREATE TABLE IF NOT EXISTS rewards_catalogue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,           -- e.g. "Free Coffee"
  description  TEXT,                   -- e.g. "Any size, any day"
  points_cost  INT NOT NULL,            -- e.g. 500
  reward_type  TEXT NOT NULL DEFAULT 'free_item', -- 'free_item' | 'discount_pct' | 'discount_dollar' | 'free_delivery'
  reward_value NUMERIC(10,2),           -- e.g. 10.00 for $10 off
  is_active    BOOLEAN DEFAULT true,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rewards_catalogue_business
  ON rewards_catalogue(business_id, is_active, sort_order);

-- ─── Reward redemptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  catalogue_id    UUID REFERENCES rewards_catalogue(id),
  points_spent    INT NOT NULL,
  voucher_code    TEXT,
  redeemed_at     TIMESTAMPTZ,
  order_id        UUID REFERENCES orders(id),
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'redeemed' | 'expired'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer
  ON reward_redemptions(customer_id, created_at DESC);

-- ─── Drivers table (if not already from original schema) ──────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  vehicle_type TEXT DEFAULT 'car',   -- 'car' | 'bike' | 'scooter' | 'van'
  status       TEXT DEFAULT 'offline', -- 'online' | 'offline' | 'on_delivery'
  hourly_rate  NUMERIC(8,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_business
  ON drivers(business_id, status);

-- ─── Reviews table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id),
  customer_name   TEXT,
  source          TEXT NOT NULL DEFAULT 'google', -- 'google' | 'app' | 'website' | 'manual'
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  body            TEXT,
  sentiment       TEXT,   -- 'positive' | 'neutral' | 'negative' (AI-tagged)
  reply           TEXT,
  reply_sent_at   TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'replied' | 'escalated' | 'ignored'
  order_id        UUID REFERENCES orders(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_business
  ON reviews(business_id, status, created_at DESC);

-- ─── Delivery provider settings (per business) ────────────────────────────
-- Stores merchant-configured rates for Tasker and other variable providers.
-- Uber Direct uses live API quotes; others use these configured rates.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT '{}';
-- Expected shape:
-- {
--   "uber_direct_api_key": "...",
--   "uber_direct_customer_id": "...",
--   "tasker_rate_per_hour": 180,
--   "tasker_capacity_per_day": 25,
--   "other_provider_name": "DoorDash Drive",
--   "other_provider_rate_per_order": 7.50
-- }

-- ─── RLS policies for new tables ──────────────────────────────────────────
ALTER TABLE loyalty_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Business scoped loyalty_events"
  ON loyalty_events FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
CREATE POLICY IF NOT EXISTS "Business scoped rewards_catalogue"
  ON rewards_catalogue FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
CREATE POLICY IF NOT EXISTS "Business scoped reward_redemptions"
  ON reward_redemptions FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
CREATE POLICY IF NOT EXISTS "Business scoped reviews"
  ON reviews FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
CREATE POLICY IF NOT EXISTS "Business scoped drivers"
  ON drivers FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
```

**After creating the file:**
1. Run `supabase db push` OR paste into Supabase SQL Editor → Run
2. Replace `YOUR_ANON_KEY` in the cron SQL with the actual anon key from Supabase → Project Settings → API
3. Verify in Supabase Dashboard that all new tables appear under Table Editor
4. Delete `supabase/migrations/APPLY_NOW.sql` once confirmed applied

**Verify:** `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;` — should include `loyalty_events`, `rewards_catalogue`, `reward_redemptions`, `reviews`, `drivers`

---

## PHASE 2 — Bug Fixes
_Quick code changes. No new pages._

### Step 2 — Fix win-back edge function

**File:** `supabase/functions/win-back/index.ts`

**Problem:** Function queries `campaigns` table with `type='win_back'`. The `/biteback` UI writes to `winback_rules`. They never connect.

**Fix:** Replace the entire data-fetch section. Change:
```ts
const { data: campaigns } = await db
  .from("campaigns")
  .select("*, businesses(id, name, subdomain)")
  .eq("type", "win_back")
  .eq("active", true);

if (!campaigns?.length) { ... }

for (const campaign of campaigns) {
  const business = (campaign as any).businesses;
  ...
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() - campaign.trigger_days);
  ...
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - campaign.cooldown_days);
  ...
  const smsBody = buildSMS(
    campaign.template ?? "...",
    { ..., amount: String(campaign.discount_amount) }
  );
```

To:
```ts
const { data: rules } = await db
  .from("winback_rules")
  .select("*, businesses(id, name, subdomain)")
  .eq("is_active", true);

if (!rules?.length) {
  return new Response(JSON.stringify({ message: "No active win-back rules", ...results }), { status: 200 });
}

for (const rule of rules) {
  const business = (rule as any).businesses;
  ...
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() - rule.inactive_days);  // was: trigger_days
  ...
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - (rule.cooldown_days ?? 30));
  ...
  const smsBody = buildSMS(
    rule.template ?? "Hey {name}, we miss you at {shop}! Here's {amount} off: {link}",
    { ..., amount: String(rule.offer_value) }  // was: discount_amount
  );
```

Also update the `campaign_events` insert at the bottom — change `campaign_id` reference from `campaign.id` to `rule.id`, and change `rule_id` log in `sms_logs` to `rule.id`.

**Verify:** Deploy with `supabase functions deploy win-back`. Trigger manually and check logs — should say "Processed X rules from winback_rules" not "No active win-back campaigns".

---

### Step 3 — Fix trial copy in Settings

**File:** `apps/dashboard/app/settings/page.tsx`

**Change 1** (around line 562):
```tsx
// FROM:
Start your 14-day free trial. No credit card required until the trial ends.
// TO:
Start your 1-month free trial. No credit card required until the trial ends.
```

**Change 2** (around line 579):
```tsx
// FROM:
{checkoutLoading ? "Opening checkout…" : "Start 14-Day Free Trial →"}
// TO:
{checkoutLoading ? "Opening checkout…" : "Start 1-Month Free Trial →"}
```

**Change 3** (around line 586):
```tsx
// FROM:
"✓ Free trial active — 14 days remaining"
// TO:
"✓ Free trial active — 1 month remaining"
```

**Verify:** Load `/settings` in browser. Subscription card should read "1-Month Free Trial" everywhere.

---

### Step 4 — Remove cost from Reviews module in Admin

**File:** `apps/dashboard/app/admin/page.tsx`

**Change** (around line 22):
```ts
// FROM:
{ id: "reviews", label: "Reviews & feedback", cost: 9, desc: "Auto-ask + AI reply draft" },
// TO:
{ id: "reviews", label: "Reviews & feedback", cost: 0, desc: "Auto-ask + AI reply draft" },
```

**Why:** The $9 figure was arbitrary and not agreed upon. Set to 0 until real pricing is decided. The billing calculation at the bottom of the admin page sums all module costs — this prevents a phantom $9 charge appearing on tenant billing.

**Verify:** Load `/admin`, open a tenant, enable Reviews. The monthly cost total should not include $9 for reviews.

---

### Step 5 — Segment warning banner on Customers page

**File:** `apps/dashboard/app/customers/page.tsx`

**What to add:** After data loads, check if all customers have `segment = null`. If so, show an amber info banner above the segment filter tabs explaining that segments haven't been calculated yet.

**Add this state and effect** (after existing state declarations):
```tsx
const [segmentsEmpty, setSegmentsEmpty] = useState(false);

// After customers load, check if segments are all null
useEffect(() => {
  if (customers.length > 0) {
    const allNull = customers.every(c => !c.segment);
    setSegmentsEmpty(allNull);
  }
}, [customers]);
```

**Add this banner** (directly above the segment filter row, i.e. above the `SEGS.map(...)` tabs):
```tsx
{segmentsEmpty && (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "12px 16px", marginBottom: 12, borderRadius: 10,
    background: "rgba(245,158,11,.08)",
    border: "1px solid rgba(245,158,11,.2)",
  }}>
    <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
    <div style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#F59E0B", lineHeight: 1.6 }}>
      <strong>Segments haven't been calculated yet.</strong> The VIP, Regular, New, and At Risk filters
      won't work until the nightly analytics job runs. Make sure the{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>nightly-analytics</code>{" "}
      edge function is scheduled in Supabase.
    </div>
  </div>
)}
```

**Verify:** Temporarily set all customer segments to null in Supabase. Load `/customers`. The amber banner should appear above the filter tabs. Set one customer's segment to "VIP" — the banner should disappear.

---

## PHASE 3 — Settings Enhancements

### Step 6 — Logo upload in Settings + sidebar display

**Part A — Add logo upload field to Settings**

**File:** `apps/dashboard/app/settings/page.tsx`

Add a logo upload section inside the "Business Profile" card, below the subdomain field and above the storefront URL block:

```tsx
// Add to state:
const [logoUrl, setLogoUrl]       = useState<string | null>(null);
const [logoUploading, setLogoUploading] = useState(false);

// Add to the useEffect that populates from business:
setLogoUrl((business as any).logo_url ?? null);

// Add this UI block inside the Business Profile card, after the Subdomain field:
<Field label="Business Logo">
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {logoUrl ? (
      <img
        src={logoUrl}
        alt="logo"
        style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,.1)" }}
      />
    ) : (
      <div style={{ width: 48, height: 48, borderRadius: 10, background: "#00B67A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#1C2D48", fontWeight: 800 }}>
        ZB
      </div>
    )}
    <label style={{ cursor: "pointer" }}>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        disabled={logoUploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !businessId) return;
          setLogoUploading(true);
          try {
            const ext  = file.name.split(".").pop();
            const path = `${businessId}/logo.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("business-logos")
              .upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage
              .from("business-logos")
              .getPublicUrl(path);
            await supabase.from("businesses").update({ logo_url: publicUrl }).eq("id", businessId);
            setLogoUrl(publicUrl);
            show("Logo updated ✓");
          } catch (err: any) {
            show(err.message ?? "Upload failed");
          } finally {
            setLogoUploading(false);
          }
        }}
      />
      <span className="bg-btn" style={{ fontSize: 11, padding: "7px 14px", cursor: logoUploading ? "wait" : "pointer" }}>
        {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
      </span>
    </label>
    {logoUrl && (
      <button
        style={{ background: "transparent", border: "none", color: "#FF4757", fontSize: 11, cursor: "pointer" }}
        onClick={async () => {
          if (!businessId) return;
          await supabase.from("businesses").update({ logo_url: null }).eq("id", businessId);
          setLogoUrl(null);
          show("Logo removed");
        }}
      >
        Remove
      </button>
    )}
  </div>
</Field>
```

**Part B — Add `logo_url` column to businesses table**

Add to the `011_pending_schema.sql` migration (if not already there):
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

**Part C — Display logo in sidebar**

**File:** `apps/dashboard/components/dashboard-sidebar.tsx`

Update the business logo display. Change the hardcoded `🏪` approach to read real logo:

In the `useBusiness()` destructure, add:
```tsx
const { business, email, isSuperAdmin, role } = useBusiness();
const logoUrl = (business as any)?.logo_url ?? null;
```

In the business info block where `bizLogo` is displayed, replace:
```tsx
<div style={{ fontSize: 22, marginBottom: 5 }}>{bizLogo}</div>
```
With:
```tsx
{logoUrl ? (
  <img src={logoUrl} alt={bizName} style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover", marginBottom: 5 }} />
) : (
  <div style={{ fontSize: 22, marginBottom: 5 }}>🏪</div>
)}
```

Do the same for the bottom business card — replace the `{bizLogo}` span with the same conditional.

**Verify:** Upload a logo in Settings. Refresh. The sidebar should show the uploaded image. Remove the logo. Sidebar should fall back to 🏪.

---

### Step 7 — Delivery cost configuration + Uber Direct API

**Part A — Add delivery settings to Settings page**

**File:** `apps/dashboard/app/settings/page.tsx`

Add a new "Delivery Providers" settings card in the right column (below Subscription, above Team). This stores Tasker and other provider rates, plus Uber Direct API credentials.

Add to state:
```tsx
const [deliverySettings, setDeliverySettings] = useState({
  uber_direct_api_key: "",
  uber_direct_customer_id: "",
  tasker_rate_per_hour: 180,
  tasker_capacity_per_day: 25,
  other_provider_name: "",
  other_provider_rate_per_order: 0,
});
```

Load from business in useEffect:
```tsx
const ds = (settings.delivery_settings ?? {}) as Record<string, any>;
setDeliverySettings(prev => ({ ...prev, ...ds }));
```

Add the card UI:
```tsx
<div className="gc" style={{ padding: 24 }}>
  <SectionTitle>Delivery Providers</SectionTitle>
  <p style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: C.st, marginTop: -10, marginBottom: 16, lineHeight: 1.6 }}>
    Configure your delivery provider rates. Uber Direct uses live API quotes when credentials are set. Tasker and other providers use the rates you enter below.
  </p>

  <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.mist}` }}>
    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 12, color: "#fff", marginBottom: 10 }}>Uber Direct</div>
    <Field label="API Key">
      <input
        type="password"
        placeholder="From Uber Direct developer portal"
        value={deliverySettings.uber_direct_api_key}
        onChange={e => setDeliverySettings(d => ({ ...d, uber_direct_api_key: e.target.value }))}
      />
    </Field>
    <Field label="Customer ID">
      <input
        placeholder="Uber Direct Customer ID"
        value={deliverySettings.uber_direct_customer_id}
        onChange={e => setDeliverySettings(d => ({ ...d, uber_direct_customer_id: e.target.value }))}
      />
    </Field>
    <div style={{ fontSize: 11, color: C.st, marginTop: -8 }}>
      Uber Direct API credentials from developer.uber.com → Direct API. When set, the delivery page will fetch live quotes for each order.
    </div>
  </div>

  <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.mist}` }}>
    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 12, color: "#fff", marginBottom: 10 }}>Tasker</div>
    <Field label="Daily rate ($)">
      <input
        type="number"
        value={deliverySettings.tasker_rate_per_hour}
        onChange={e => setDeliverySettings(d => ({ ...d, tasker_rate_per_hour: Number(e.target.value) }))}
      />
    </Field>
    <Field label="Capacity (orders/day)">
      <input
        type="number"
        value={deliverySettings.tasker_capacity_per_day}
        onChange={e => setDeliverySettings(d => ({ ...d, tasker_capacity_per_day: Number(e.target.value) }))}
      />
    </Field>
  </div>

  <div style={{ marginBottom: 18 }}>
    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 12, color: "#fff", marginBottom: 10 }}>Other Provider</div>
    <Field label="Provider name (e.g. DoorDash Drive)">
      <input
        value={deliverySettings.other_provider_name}
        onChange={e => setDeliverySettings(d => ({ ...d, other_provider_name: e.target.value }))}
      />
    </Field>
    <Field label="Rate per order ($)">
      <input
        type="number"
        step="0.01"
        value={deliverySettings.other_provider_rate_per_order}
        onChange={e => setDeliverySettings(d => ({ ...d, other_provider_rate_per_order: Number(e.target.value) }))}
      />
    </Field>
  </div>

  <button className="bp" style={{ width: "100%", justifyContent: "center" }} onClick={async () => {
    if (!businessId) return;
    const prev = (business?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("businesses").update({
      settings: { ...prev, delivery_settings: deliverySettings },
      delivery_settings: deliverySettings,
    }).eq("id", businessId);
    show("Delivery settings saved ✓");
  }}>
    Save delivery settings
  </button>
</div>
```

**Part B — Update delivery predict API to use live Uber Direct quotes**

**File:** `apps/dashboard/app/api/delivery/predict/route.ts`

At the top of the handler, after loading business settings, add a function to fetch a live Uber Direct quote:

```ts
async function getUberDirectQuote(
  apiKey: string,
  customerId: string,
  pickupAddress: Record<string, string>,
  dropoffAddress: Record<string, string>
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_address: JSON.stringify(pickupAddress),
          dropoff_address: JSON.stringify(dropoffAddress),
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Uber returns fee in cents
    return (data.fee ?? 0) / 100;
  } catch {
    return null;
  }
}
```

In the prediction logic, read `delivery_settings` from the business row. Use:
- `delivery_settings.uber_direct_api_key` + `delivery_settings.uber_direct_customer_id` → live quote (per-order cost)
- `delivery_settings.tasker_rate_per_hour` + `delivery_settings.tasker_capacity_per_day` → replace hardcoded $180/$25
- Fall back to the old hardcoded constants if no settings are configured

**Note for implementation:** Uber Direct API quotes require a specific pickup + dropoff address pair — they can't give a blanket day rate. For the *planning* view (7-day calendar), use the configured rate. Reserve the live Uber Direct API call for the actual dispatch moment (when an order is being booked). The prediction page should display a note: "Live Uber Direct fee shown when dispatching an order."

**Verify:** Set Tasker daily rate to $200 in Settings → Delivery Providers. Load `/delivery`. The cost breakdown should reflect $200/day for Tasker, not the old hardcoded $180.

---

## PHASE 4 — New CRM Pages

### Step 8 — Build `/drivers` page

**File to create:** `apps/dashboard/app/drivers/page.tsx`

**Add to sidebar:** `apps/dashboard/lib/navigation.ts`

Add between Delivery and Customers:
```ts
{ label: "Drivers", href: "/drivers", icon: Users, emoji: "🧑‍✈️", description: "Driver roster, shifts & dispatch status" },
```

**Page requirements:**

The `/drivers` page must include:

1. **Stat cards row** — Total drivers, Online now, On delivery, Offline

2. **Driver roster table** — Columns: Avatar (initials), Name, Phone, Vehicle type, Status badge (Online/Offline/On Delivery), Hourly rate, Notes, Actions (Edit / Toggle status)

3. **Add driver modal** — Fields: Name (required), Phone, Email, Vehicle type (Car/Bike/Scooter/Van), Hourly rate, Notes. Saves to `drivers` table.

4. **Edit driver modal** — Same fields as Add, pre-populated.

5. **Status toggle** — Clicking a driver's status badge cycles: Offline → Online → On Delivery → Offline. Updates `drivers.status` in Supabase.

6. **Dispatch queue panel** — Below the roster. Shows orders with `status = 'ready'` (from `orders` table). Each row: order ID, customer name, address, total. "Assign driver" button opens a mini modal to pick a driver from the online roster.

7. **Empty state** — "No drivers added yet. Add your first driver to start managing dispatch."

**Data queries to add to `lib/queries.ts`:**
```ts
export async function getDrivers(businessId: string)
export async function createDriver(businessId: string, input: {...})
export async function updateDriver(id: string, updates: Partial<Driver>)
export async function deleteDriver(id: string)
export async function getReadyOrders(businessId: string) // orders where status = 'ready'
```

**Verify:** Add a driver, toggle their status, assign them to a ready order. Check Supabase that `drivers` table updates correctly.

---

### Step 9 — Build `/reviews` page

**File to create:** `apps/dashboard/app/reviews/page.tsx`

**Add to sidebar:** `apps/dashboard/lib/navigation.ts`

Add between Automations and Analytics:
```ts
{ label: "Reviews", href: "/reviews", icon: MessageSquare, emoji: "💬", description: "Customer reviews, replies & sentiment" },
```

**Page requirements:**

1. **Stat cards row** — Total reviews, Average rating (★ display), Positive (%), Pending reply count

2. **Filter tabs** — All / Positive / Neutral / Negative / Pending reply

3. **Review cards** (not a table — cards feel more natural for reviews):
   - Customer name + avatar initials
   - Star rating (★★★★☆ style)
   - Source badge (Google / App / Website)
   - Review body text
   - Sentiment badge (Positive/Neutral/Negative) — colour coded green/amber/red
   - Date
   - If replied: show the reply text beneath with a "Sent ✓" badge
   - If not replied: show "Draft reply" button + "Escalate" button

4. **Draft reply flow** — Clicking "Draft reply" opens a modal:
   - AI-generated draft reply (generate using a template based on rating + sentiment — no external AI API needed at this stage, use a rule-based generator)
   - Editable textarea pre-filled with the draft
   - "Send reply" button → saves to `reviews.reply`, sets `reply_sent_at = now()`, sets `status = 'replied'`
   - "Escalate" button → sets `status = 'escalated'`

5. **Add review manually** — "Add review" button → modal with fields: Customer name, Rating (1–5 stars), Source, Review text. Saves to `reviews` table.

6. **Auto-ask rule card** — Below the main list, a settings card: "Auto-ask for reviews X days after order completion." Toggle on/off, number of days input. Saves to `businesses.settings.auto_review_days`. (Actual sending is a future cron job — just save the config for now.)

7. **Empty state** — "No reviews yet. Enable auto-ask to start collecting feedback after orders."

**Draft reply generator (rule-based, no external API):**
```ts
function generateReplyDraft(rating: number, body: string, businessName: string): string {
  if (rating >= 4) {
    return `Thank you so much for your kind words! We're thrilled you had a great experience at ${businessName}. We hope to see you again soon! 😊`;
  } else if (rating === 3) {
    return `Thank you for taking the time to share your feedback. We're glad you visited ${businessName} and we'd love to make your next experience even better. Please don't hesitate to reach out if there's anything we can improve.`;
  } else {
    return `Thank you for your feedback. We're sorry to hear your experience at ${businessName} didn't meet your expectations. We take all feedback seriously and would love the opportunity to make it right. Please reach out to us directly so we can help.`;
  }
}
```

**Data queries to add to `lib/queries.ts`:**
```ts
export async function getReviews(businessId: string)
export async function createReview(businessId: string, input: {...})
export async function updateReview(id: string, updates: Partial<Review>)
export async function replyToReview(id: string, reply: string)
```

**Verify:** Add a test review, click "Draft reply", edit it, click "Send reply". The card should update to show "Sent ✓" with the reply text below.

---

## PHASE 5 — Rewards Rebuild

### Step 10 — Rebuild `/rewards` page

**File:** `apps/dashboard/app/rewards/page.tsx` — full rewrite

**Remove entirely:**
- The "Pay With Points — Checkout Preview" card with the toggle
- The fake earn rules card

**New page structure:**

**Section 1 — Stat cards**
- Total members, Gold/Silver/Bronze counts, Total points in circulation, Redemptions this month

**Section 2 — Tier ladder** (same as current, keep it)
- Bronze 0–299 / Silver 300–999 / Gold 1000+
- Show perk per tier

**Section 3 — Rewards Catalogue** (NEW — replaces pay-with-points)
- A card with a list of redemption items the merchant has configured
- Each row: Reward name, Points required, Type badge (Free item/Discount/Free delivery), Active toggle
- "Add reward" button → modal: Title, Description, Points cost, Reward type, Reward value (dollar amount or %)
- Saves to `rewards_catalogue` table
- Seed 3 default items when no catalogue exists:
  - "Free coffee" — 200 pts — Free item
  - "$5 off your order" — 500 pts — Dollar discount — $5
  - "Free delivery" — 300 pts — Free delivery

**Section 4 — Earn Rules** (NEW — replaces fake static list)
- Display as a card with a toggle and value per rule:
  - **Per $1 spent** → 10 pts (hardcoded, matches POS logic)
  - **Direct order multiplier** → 1.2× (toggle on/off, saves to `businesses.settings.earn_multiplier_direct`)
  - **Referral** → 500 pts per successful referral (toggle on/off, saves to `businesses.settings.earn_referral_pts`)
  - **Birthday bonus** → 200 pts (toggle on/off, saves to `businesses.settings.earn_birthday_pts`)
  - **5-order streak** → 100 bonus pts (toggle on/off, saves to `businesses.settings.earn_streak_pts`)
- Each toggle saves immediately to `businesses.settings`

**Section 5 — Points table** (keep from current version)
- Customer list sorted by points_balance descending
- Avatar, Name, Email, Points, Cash Value, Tier, Status
- CSV export (keep existing logic)

**Section 6 — Recent redemptions feed** (NEW)
- Query `reward_redemptions` for this business, last 20
- Show: Customer name, Reward title, Points spent, Date, Status badge

---

### Step 11 — Build earn rule logic

**What this means in practice:** The earn rules configured in Step 10 need to actually fire when orders are placed and other events happen. This requires changes in multiple places.

**Part A — Direct order multiplier**

**File:** `apps/dashboard/app/pos/page.tsx`

In `placeOrder()`, after inserting the order, read `business.settings.earn_multiplier_direct`. If enabled, apply 1.2× to points awarded:
```ts
const multiplier = (business?.settings as any)?.earn_multiplier_direct ? 1.2 : 1.0;
const ptsEarned  = Math.round(orderTotal * 10 * multiplier);
// update customers.points_balance += ptsEarned
// insert loyalty_events row: { event_type: 'order', points: ptsEarned, multiplier, source: orderId }
```

**Part B — Birthday bonus**

**File:** Create `apps/dashboard/app/api/cron/birthday-bonus/route.ts`

Daily endpoint that:
1. Checks all customers where `date_of_birth` matches today's date (month + day)
2. If `earn_birthday_pts` is enabled for their business
3. Awards points and inserts a `loyalty_events` row with `event_type = 'birthday'`
4. Only runs once per year per customer (check `loyalty_events` for a birthday event in the last 365 days)

Note: `date_of_birth` column needs to be added to `customers` table — add to `011_pending_schema.sql`:
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
```

**Part C — Referral tracking**

For now: Add a "Referral code" field to each customer's detail drawer on `/customers`. When a referred customer places their first order and uses the code, award 500 pts to the referrer. This requires:
- `customers.referral_code TEXT` column (add to 011 migration)
- `customers.referred_by UUID REFERENCES customers(id)` column (add to 011 migration)
- In the storefront checkout (`/api/store/checkout`): check for a referral code query param, link `referred_by`, fire a `loyalty_events` row on first completed order

**Part D — 5-order streak**

**File:** `apps/dashboard/app/pos/page.tsx` (and storefront checkout)

After updating customer stats, check if `total_orders % 5 === 0` (i.e. 5th, 10th, 15th order...). If `earn_streak_pts` is enabled, award 100 bonus points and insert a `loyalty_events` row with `event_type = 'streak'`.

**Verify:** Place a 5th test order through POS. Check `loyalty_events` table — should have a 'streak' row. Check `customers.points_balance` — should have the 100 bonus pts added.

---

## PHASE 6 — Demo Super Admin

### Step 12 — Build `/demo/super-admin`

**File to create:** `apps/web/app/demo/super-admin/page.tsx`

This is a **static demo page** using hardcoded data (same pattern as `/demo/live/*`). No Supabase connection — all data from a local `data.ts` or inline.

**Layout:** Use the same demo shell as `/demo/live` (or create a variant with a platform-admin skin — dark navy, ZentraBite green, no merchant branding).

**Screen 1 — Tenant List (default view)**

Header: "ZentraBite Platform Admin · 3 active tenants"

Table of 3 demo tenants:
| Business | Type | Plan | Modules | MRR | Orders/mo | Last active | Status |
|---|---|---|---|---|---|---|---|
| Harbour Lane Pizza Co | Restaurant | Full | 9/12 | $247 | 847 | 2 min ago | 🟢 |
| The Bloom Room | Florist | Starter | 5/12 | $108 | 124 | 1 hour ago | 🟢 |
| Coastal Cuts | Hair Salon | Standard | 7/12 | $166 | 203 | Yesterday | 🟡 |

Click any row → opens Tenant Detail panel (right side panel or full view, your choice)

**Screen 2 — Tenant Detail (for Harbour Lane)**

Three tabs:

**Tab 1: Modules & Plan**
- 12 module toggles (use the same list from `/admin`)
- Each toggle is interactive (state updates locally in demo)
- Show a "Plan total: $247/mo" counter that recalculates as toggles change
- "Save changes" button → shows toast "Config saved for Harbour Lane Pizza Co ✓"

**Tab 2: Usage & Billing**
- Orders this month: 847
- AI credits used: 1,240 / 2,000
- AI credits bar (progress bar, amber when > 80%)
- SMS sent this month: 312
- Stripe payout status: Connected ✓
- Last invoice: $247.00 — Paid ✓
- Invoice history table: last 3 months

**Tab 3: Ops**
- Business details: name, type, suburb, subdomain, ABN, contact
- "Impersonate as merchant" button → shows a toast: "Impersonating Harbour Lane Pizza Co — you'd now see their CRM. (This is a demo — in production this would redirect you to their dashboard with an admin cookie.)"
- "View storefront" link → `/demo/merchant`
- Audit log: last 5 entries (hardcoded: "Module 'AI Calls' enabled · Admin · 3h ago", etc.)

**Screen 3 — Platform Health panel (accessible from top nav)**
- 4 stat cards: Total MRR ($521), Active tenants (3), Orders today (84), AI credits burned today (320)
- API latency sparkline (static SVG)
- Webhook health: Stripe ✓, Twilio ✓, Supabase ✓
- Recent platform events log (hardcoded 5 entries)

**Navigation for the demo super admin:**
- Top bar with "ZentraBite Platform Admin" branding (green accent, navy background — matches CRM)
- Left sidebar: Tenants · Platform Health · Module Catalogue
- "Exit admin" link → `/demo`
- "View as merchant" link → `/demo/live`

**Verify:** Open `/demo/super-admin`. Click Harbour Lane row. Toggle a module. Counter should update. Click "Impersonate" → toast fires. Click Platform Health → stats show. All three sidebar items navigate correctly.

---

## Post-implementation checklist

After all phases are complete, run through this verification list:

- [ ] `supabase db push` runs clean (or 011 SQL pasted + verified in Table Editor)
- [ ] Both edge functions deployed: `supabase functions deploy nightly-analytics && supabase functions deploy win-back`
- [ ] Cron schedules confirmed active in Supabase Dashboard → Database → Cron Jobs
- [ ] `business-logos` storage bucket exists and is public
- [ ] Upload a logo in Settings → appears in sidebar
- [ ] Create a winback rule in `/biteback` → trigger the edge function manually → confirm it reads from `winback_rules`
- [ ] Settings page says "1-Month Free Trial" everywhere (not 14 days)
- [ ] Reviews module in Admin shows cost: $0 (not $9)
- [ ] Add a customer with null segment → amber warning banner appears on Customers page
- [ ] `/drivers` page loads, add a driver, toggle status, assign to a ready order
- [ ] `/reviews` page loads, add a test review, draft reply, send it, card shows "Sent ✓"
- [ ] `/rewards` shows catalogue section, add a reward item, toggle earn rules
- [ ] Place a POS order as a 5th order → check `loyalty_events` for streak row
- [ ] `/demo/super-admin` loads, all 3 screens navigable, module toggles update plan total
- [ ] `npx tsc --noEmit` from `apps/dashboard` exits clean

---

## File change summary

| File | Change type |
|---|---|
| `supabase/migrations/011_pending_schema.sql` | CREATE (new migration) |
| `supabase/migrations/APPLY_NOW.sql` | DELETE (absorbed into 011) |
| `supabase/functions/win-back/index.ts` | EDIT (campaigns → winback_rules) |
| `apps/dashboard/app/settings/page.tsx` | EDIT (trial copy, logo upload, delivery settings card) |
| `apps/dashboard/app/admin/page.tsx` | EDIT (reviews cost: 9 → 0) |
| `apps/dashboard/app/customers/page.tsx` | EDIT (segment warning banner) |
| `apps/dashboard/components/dashboard-sidebar.tsx` | EDIT (logo_url display) |
| `apps/dashboard/lib/navigation.ts` | EDIT (add Drivers + Reviews nav items) |
| `apps/dashboard/lib/queries.ts` | EDIT (add driver + review + loyalty + catalogue queries) |
| `apps/dashboard/app/drivers/page.tsx` | CREATE (new page) |
| `apps/dashboard/app/reviews/page.tsx` | CREATE (new page) |
| `apps/dashboard/app/rewards/page.tsx` | REWRITE (earn→redeem model) |
| `apps/dashboard/app/pos/page.tsx` | EDIT (multiplier + streak earn logic) |
| `apps/dashboard/app/api/cron/birthday-bonus/route.ts` | CREATE (birthday earn cron) |
| `apps/dashboard/app/api/delivery/predict/route.ts` | EDIT (use configured rates + Uber Direct API hook) |
| `apps/web/app/demo/super-admin/page.tsx` | CREATE (new demo page) |
