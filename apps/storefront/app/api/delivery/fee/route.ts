// GET /api/delivery/fee
//
// Lightweight delivery fee calculator for the storefront checkout preview.
// Uses default rates — no database access required — so the customer sees an
// instant fee estimate as they fill in their address without any Supabase
// round-trip. Business-specific overrides only apply when the actual routing
// job is dispatched later via /api/delivery/route on the dashboard.
//
// Params: distance_km, order_value, tier (standard|priority), peak (0|1), demand (0|1), weather (0|1)

import { NextResponse } from "next/server";

// Default rates (match delivery_settings defaults in dashboard fee route)
const DEFAULTS = {
  peak_surcharge:        2.00,
  bad_weather_surcharge: 3.00,
  priority_surcharge:    3.50,
  min_order_threshold:   25,
  high_value_threshold:  40,
  high_value_discount:   2.00,
  service_fee:           3.99,
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const distanceKm   = parseFloat(searchParams.get("distance_km") ?? "0");
    const orderValue   = parseFloat(searchParams.get("order_value")  ?? "0");
    const tier         = (searchParams.get("tier") ?? "standard") as "standard" | "priority";
    const isPeak       = searchParams.get("peak")    === "1";
    const isHighDemand = searchParams.get("demand")  === "1";
    const isBadWeather = searchParams.get("weather") === "1";

    // Distance band
    let baseDistance: number;
    if (distanceKm <= 3)      baseDistance = 6.99;
    else if (distanceKm <= 6) baseDistance = 8.99;
    else                      baseDistance = 10.99;

    const peakSurcharge       = isPeak       ? DEFAULTS.peak_surcharge        : 0;
    const highDemandSurcharge = isHighDemand ? DEFAULTS.peak_surcharge + 2    : 0;
    const badWeatherSurcharge = isBadWeather ? DEFAULTS.bad_weather_surcharge : 0;
    const lowOrderSurcharge   = orderValue > 0 && orderValue < DEFAULTS.min_order_threshold ? 2.00 : 0;
    const highValueDiscount   = orderValue > DEFAULTS.high_value_threshold ? DEFAULTS.high_value_discount : 0;
    const prioritySurcharge   = tier === "priority" ? DEFAULTS.priority_surcharge : 0;

    const deliveryFee = Math.max(
      0,
      baseDistance + peakSurcharge + highDemandSurcharge + badWeatherSurcharge +
      lowOrderSurcharge - highValueDiscount + prioritySurcharge
    );
    const total = Math.round((deliveryFee + DEFAULTS.service_fee) * 100) / 100;

    return NextResponse.json({
      baseDistance,
      peakSurcharge,
      highDemandSurcharge,
      badWeatherSurcharge,
      lowOrderSurcharge,
      highValueDiscount,
      prioritySurcharge,
      serviceFee: DEFAULTS.service_fee,
      total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
