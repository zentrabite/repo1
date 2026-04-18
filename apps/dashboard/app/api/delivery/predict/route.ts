// GET /api/delivery/predict?business_id=xxx&date=YYYY-MM-DD
//
// Returns a delivery provider recommendation for a given date, based on
// historical order volume for that day-of-week over the past 8 weeks.
//
// Cost model (AUD, configurable in the future):
//   Uber Direct  : $6.50 per delivery (variable, no commitment)
//   Tasker driver: $180/day flat, handles up to 25 deliveries per person
//
// Decision logic:
//   0–6   → Uber Direct only
//   7–25  → 1 Tasker
//   26–50 → 2 Taskers
//   51–75 → 3 Taskers
//   76+   → N Taskers (ceil(volume/25)) + Uber Direct for overflow when needed
//   In any case where Uber Direct is cheaper, fallback to Uber Direct.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

const UBER_PER_DELIVERY = 6.5;
const TASKER_DAY_RATE   = 180;
const TASKER_CAPACITY   = 25; // deliveries per Tasker per day
const WEEKS_LOOKBACK    = 8;

export interface DeliveryPrediction {
  date: string;
  dayOfWeek: string;
  predictedVolume: number;        // orders
  historicalAverage: number;
  historicalData: { date: string; count: number }[];
  recommendation: DeliveryRecommendation;
}

export interface DeliveryRecommendation {
  provider: "uber_direct" | "tasker" | "tasker_and_uber" | "none";
  taskersNeeded: number;
  uberOrders: number;             // orders handled by Uber Direct
  estimatedCost: number;          // AUD
  uberOnlyCost: number;           // cost if all Uber Direct
  saving: number;                 // vs pure Uber Direct
  rationale: string;
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function buildRecommendation(volume: number): DeliveryRecommendation {
  if (volume === 0) {
    return { provider:"none", taskersNeeded:0, uberOrders:0, estimatedCost:0, uberOnlyCost:0, saving:0, rationale:"No delivery orders expected." };
  }

  const uberOnlyCost = volume * UBER_PER_DELIVERY;

  // How many Taskers do we need?
  const taskersNeeded = Math.ceil(volume / TASKER_CAPACITY);
  const taskerCost    = taskersNeeded * TASKER_DAY_RATE;

  if (volume <= 6) {
    // Pure Uber Direct is cheaper for small volumes
    return {
      provider:       "uber_direct",
      taskersNeeded:  0,
      uberOrders:     volume,
      estimatedCost:  uberOnlyCost,
      uberOnlyCost,
      saving:         0,
      rationale:      `Only ${volume} deliveries expected — Uber Direct ($${uberOnlyCost.toFixed(2)}) is cheaper than a full-day Tasker ($${TASKER_DAY_RATE}).`,
    };
  }

  if (taskerCost <= uberOnlyCost) {
    // Pure Tasker is cheapest
    const overflow = Math.max(0, volume - taskersNeeded * TASKER_CAPACITY);
    const uberOverflowCost = overflow * UBER_PER_DELIVERY;
    const totalCost = taskerCost + uberOverflowCost;
    const provider = overflow > 0 ? "tasker_and_uber" : "tasker";
    return {
      provider,
      taskersNeeded,
      uberOrders:    overflow,
      estimatedCost: totalCost,
      uberOnlyCost,
      saving:        uberOnlyCost - totalCost,
      rationale:     `${taskersNeeded} Tasker${taskersNeeded > 1 ? "s" : ""} cover${taskersNeeded === 1 ? "s" : ""} up to ${taskersNeeded * TASKER_CAPACITY} orders at $${taskerCost}${overflow > 0 ? ` + Uber Direct for ${overflow} overflow orders ($${uberOverflowCost.toFixed(2)})` : ""}. Saves $${(uberOnlyCost - totalCost).toFixed(2)} vs all-Uber.`,
    };
  }

  // Edge case: Uber cheaper (very high volume with fractional Tasker)
  return {
    provider:      "uber_direct",
    taskersNeeded: 0,
    uberOrders:    volume,
    estimatedCost: uberOnlyCost,
    uberOnlyCost,
    saving:        0,
    rationale:     `Uber Direct ($${uberOnlyCost.toFixed(2)}) is cheaper than ${taskersNeeded} Taskers ($${taskerCost}).`,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    const dateParam  = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

    const targetDate   = new Date(dateParam);
    const targetDow    = targetDate.getDay(); // 0=Sun … 6=Sat
    const dayName      = DAY_NAMES[targetDow];

    // Collect the same day-of-week for the past WEEKS_LOOKBACK weeks
    const lookbackDates: string[] = [];
    for (let w = 1; w <= WEEKS_LOOKBACK; w++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - 7 * w);
      lookbackDates.push(d.toISOString().slice(0, 10));
    }

    const db = createAdminClient();

    // Pull all orders for those dates with source = 'direct' or 'storefront' (i.e. delivery-eligible)
    const { data: orders, error } = await db
      .from("orders")
      .select("id, created_at")
      .eq("business_id", businessId)
      .gte("created_at", lookbackDates[lookbackDates.length - 1] + "T00:00:00Z")
      .lte("created_at", lookbackDates[0] + "T23:59:59Z");

    if (error) throw error;

    // Count orders per date
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

    // Use the median as the prediction (more robust than average for skewed data)
    const sorted    = [...counts].sort((a, b) => a - b);
    const mid       = Math.floor(sorted.length / 2);
    const predicted = sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

    const recommendation = buildRecommendation(predicted);

    const result: DeliveryPrediction = {
      date:              dateParam,
      dayOfWeek:         dayName,
      predictedVolume:   predicted,
      historicalAverage: average,
      historicalData,
      recommendation,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
