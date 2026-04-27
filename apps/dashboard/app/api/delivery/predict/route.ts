// GET /api/delivery/predict?business_id=xxx&date=YYYY-MM-DD
//
// Returns a delivery provider recommendation for a given date based on
// historical order volume for that day-of-week over the past 8 weeks.
//
// Cost model — loaded from businesses.delivery_settings (set in /settings).
// Falls back to placeholder values if not configured.
// Uber Direct: live API quote when credentials are set; otherwise uses
// a configurable per-order rate from delivery_settings.
//
// Decision logic:
//   volume = 0        → none
//   uberOnly cheaper  → uber_direct
//   tasker cheaper    → tasker (+ uber overflow if needed)

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import type { DeliveryPrediction, DeliveryRecommendation } from "@/lib/delivery-types";

export type { DeliveryPrediction, DeliveryRecommendation };

const WEEKS_LOOKBACK = 8;
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ─── Uber Direct live quote ───────────────────────────────────────────────────
// Called when credentials are configured in /settings → Delivery Providers.
// Returns the fee in AUD, or null if the request fails / no credentials.
// Note: Uber Direct quotes a price for a specific pickup+dropoff pair.
// For the *planning* prediction we call with the business address as both
// pickup and a generic dropoff 3 km away to get an indicative per-order rate.
async function getUberDirectRate(
  apiKey: string,
  customerId: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          pickup_address:  JSON.stringify({ street_address: ["1 George St"], city: "Sydney", state: "NSW", zip_code: "2000", country: "AU" }),
          dropoff_address: JSON.stringify({ street_address: ["1 Collins St"], city: "Sydney", state: "NSW", zip_code: "2000", country: "AU" }),
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Uber returns fee in cents
    return typeof data.fee === "number" ? data.fee / 100 : null;
  } catch {
    return null;
  }
}

// ─── Recommendation engine ────────────────────────────────────────────────────
function buildRecommendation(
  volume: number,
  uberPerDelivery: number,
  taskerDayRate: number,
  taskerCapacity: number,
  taskerLabel: string,
): DeliveryRecommendation {
  if (volume === 0) {
    return { provider:"none", taskersNeeded:0, uberOrders:0, estimatedCost:0, uberOnlyCost:0, saving:0, rationale:"No delivery orders expected." };
  }

  const uberOnlyCost   = volume * uberPerDelivery;
  const taskersNeeded  = Math.ceil(volume / taskerCapacity);
  const taskerCost     = taskersNeeded * taskerDayRate;

  if (volume <= 6 || uberOnlyCost <= taskerCost) {
    return {
      provider:      "uber_direct",
      taskersNeeded: 0,
      uberOrders:    volume,
      estimatedCost: uberOnlyCost,
      uberOnlyCost,
      saving:        0,
      rationale:     `${volume} deliveries — Uber Direct ($${uberOnlyCost.toFixed(2)}) is the better option for this volume.`,
    };
  }

  const overflow        = Math.max(0, volume - taskersNeeded * taskerCapacity);
  const uberOverflow    = overflow * uberPerDelivery;
  const totalCost       = taskerCost + uberOverflow;
  const provider        = overflow > 0 ? "tasker_and_uber" : "tasker";
  return {
    provider,
    taskersNeeded,
    uberOrders:    overflow,
    estimatedCost: totalCost,
    uberOnlyCost,
    saving:        uberOnlyCost - totalCost,
    rationale:     `${taskersNeeded} ${taskerLabel} driver${taskersNeeded > 1 ? "s" : ""} cover${taskersNeeded === 1 ? "s" : ""} up to ${taskersNeeded * taskerCapacity} orders${overflow > 0 ? ` + Uber Direct for ${overflow} overflow orders` : ""}. Saves $${(uberOnlyCost - totalCost).toFixed(2)} vs all-Uber.`,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    const dateParam  = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

    const targetDate = new Date(dateParam);
    const targetDow  = targetDate.getDay();
    const dayName    = DAY_NAMES[targetDow];

    const db = createAdminClient();

    // Load business delivery_settings
    const { data: biz } = await db
      .from("businesses")
      .select("delivery_settings")
      .eq("id", businessId)
      .single();

    const ds = (biz?.delivery_settings ?? {}) as Record<string, any>;

    // Resolve cost constants — use configured values, fall back to unconfigured placeholders
    const uberApiKey      = (ds.uber_direct_api_key       as string | undefined) ?? "";
    const uberCustomerId  = (ds.uber_direct_customer_id   as string | undefined) ?? "";
    const taskerDayRate   = (ds.tasker_rate_per_hour      as number | undefined) ?? 0;
    const taskerCapacity  = (ds.tasker_capacity_per_day   as number | undefined) ?? 0;
    const otherLabel      = (ds.other_provider_name       as string | undefined) ?? "Tasker";
    const otherRatePerOrder = (ds.other_provider_rate_per_order as number | undefined) ?? 0;

    // Prefer Uber Direct live quote when credentials are set
    let uberPerDelivery = otherRatePerOrder > 0 ? otherRatePerOrder : 0;
    let uberRateSource  = "configured";

    if (uberApiKey && uberCustomerId) {
      const liveRate = await getUberDirectRate(uberApiKey, uberCustomerId);
      if (liveRate !== null) {
        uberPerDelivery = liveRate;
        uberRateSource  = "uber_direct_api";
      }
    }

    // Collect lookback dates (same day-of-week for last WEEKS_LOOKBACK weeks)
    const lookbackDates: string[] = [];
    for (let w = 1; w <= WEEKS_LOOKBACK; w++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - 7 * w);
      lookbackDates.push(d.toISOString().slice(0, 10));
    }

    const { data: orders, error } = await db
      .from("orders")
      .select("id, created_at")
      .eq("business_id", businessId)
      .gte("created_at", lookbackDates[lookbackDates.length - 1] + "T00:00:00Z")
      .lte("created_at", lookbackDates[0] + "T23:59:59Z");

    if (error) throw error;

    const countsByDate: Record<string, number> = {};
    for (const date of lookbackDates) countsByDate[date] = 0;
    for (const order of orders ?? []) {
      const d = (order.created_at as string).slice(0, 10);
      if (d in countsByDate) countsByDate[d]++;
    }

    const historicalData = lookbackDates.map(date => ({ date, count: countsByDate[date] }));
    const counts         = historicalData.map(h => h.count);
    const total          = counts.reduce((a, b) => a + b, 0);
    const average        = counts.length > 0 ? Math.round(total / counts.length) : 0;

    const sorted    = [...counts].sort((a, b) => a - b);
    const mid       = Math.floor(sorted.length / 2);
    const predicted = sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

    const recommendation = buildRecommendation(
      predicted,
      uberPerDelivery,
      taskerDayRate,
      taskerCapacity,
      otherLabel,
    );

    const result: DeliveryPrediction = {
      date:              dateParam,
      dayOfWeek:         dayName,
      predictedVolume:   predicted,
      historicalAverage: average,
      historicalData,
      recommendation,
      // Pass rate metadata to the frontend for display
      meta: {
        uberRateSource,
        uberPerDelivery,
        taskerDayRate,
        taskerCapacity,
        taskerLabel: otherLabel,
        settingsConfigured: taskerDayRate > 0 || uberPerDelivery > 0,
      } as any,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
