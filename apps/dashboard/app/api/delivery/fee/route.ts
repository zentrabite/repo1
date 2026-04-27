// GET /api/delivery/fee?business_id=xxx&distance_km=4.2&order_value=38&tier=standard&peak=0&demand=0&weather=0
//
// Returns the customer-facing delivery fee breakdown without dispatching a
// delivery or logging a job. Used by:
//   - Storefront checkout (fee preview as customer enters address)
//   - POS (fee shown when staff selects delivery mode)
//   - Any UI that needs to preview the fee before committing to an order.
//
// No provider API calls are made — purely fee calculation logic.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import type { DeliveryFeeBreakdown } from "@/lib/delivery-types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId   = searchParams.get("business_id");
    const distanceKm   = parseFloat(searchParams.get("distance_km") ?? "0");
    const orderValue   = parseFloat(searchParams.get("order_value")  ?? "0");
    const tier         = (searchParams.get("tier") ?? "standard") as "standard" | "priority";
    const isPeak       = searchParams.get("peak")    === "1";
    const isHighDemand = searchParams.get("demand")  === "1";
    const isBadWeather = searchParams.get("weather") === "1";

    if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

    const db = createAdminClient();
    const { data: biz } = await db.from("businesses").select("delivery_settings").eq("id", businessId).single();
    const ds = (biz?.delivery_settings ?? {}) as Record<string, any>;

    // ─── Distance band ────────────────────────────────────────────────────────
    let baseDistance: number;
    if (distanceKm <= 3)      baseDistance = 6.99;
    else if (distanceKm <= 6) baseDistance = 8.99;
    else                      baseDistance = 10.99;

    // ─── Surcharges ───────────────────────────────────────────────────────────
    const peakRate        = Number(ds.peak_surcharge         ?? 2.00);
    const weatherRate     = Number(ds.bad_weather_surcharge  ?? 3.00);
    const priorityRate    = Number(ds.priority_surcharge     ?? 3.50);
    const minOrderThresh  = Number(ds.min_order_threshold    ?? 25);
    const highValueThresh = 40;
    const highValueDisc   = Number(ds.high_value_discount    ?? 2.00);
    const serviceFeeRate  = Number(ds.service_fee            ?? 3.99);

    const peakSurcharge         = isPeak       ? peakRate   : 0;
    const highDemandSurcharge   = isHighDemand ? peakRate + 2 : 0;  // $2–$4 per spec
    const badWeatherSurcharge   = isBadWeather ? weatherRate : 0;
    const lowOrderSurcharge     = orderValue > 0 && orderValue < minOrderThresh ? 2.00 : 0;
    const highValueDiscount     = orderValue > highValueThresh ? highValueDisc : 0;
    const prioritySurcharge     = tier === "priority" ? priorityRate : 0;

    const totalSurcharges = peakSurcharge + highDemandSurcharge + badWeatherSurcharge + lowOrderSurcharge - highValueDiscount + prioritySurcharge;
    const deliveryFee     = Math.max(0, baseDistance + totalSurcharges);
    const total           = Math.round((deliveryFee + serviceFeeRate) * 100) / 100;

    const breakdown: DeliveryFeeBreakdown = {
      baseDistance,
      peakSurcharge,
      highDemandSurcharge,
      badWeatherSurcharge,
      lowOrderSurcharge,
      highValueDiscount,
      serviceFee:       serviceFeeRate,
      prioritySurcharge,
      total,
    };

    return NextResponse.json(breakdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
