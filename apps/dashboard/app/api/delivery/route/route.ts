// POST /api/delivery/route
//
// Main routing engine endpoint. Given an order's details, fetches quotes from
// all configured providers simultaneously, applies the cost-vs-ETA decision
// logic, selects the optimal provider, calculates the customer-facing fee, and
// logs the full decision to delivery_jobs + delivery_quotes for analytics.
//
// Request body: RoutingRequest (see lib/delivery-types.ts)
// Response:     { decision: RoutingDecision, jobId: string }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { fetchAllQuotes, type ProviderCredentials } from "@/lib/delivery-providers";
import type { RoutingRequest, RoutingDecision, ProviderQuote, ProviderId } from "@/lib/delivery-types";

// ─── Constants (overrideable per-business via delivery_settings) ──────────────
const DEFAULT_MAX_ETA_MIN          = 60;
const DEFAULT_ETA_DIFF_THRESHOLD   = 7;    // spec §4: if ETA diff < 7 min, choose cheapest
const DEFAULT_SERVICE_FEE          = 3.99;
const DEFAULT_PRIORITY_SURCHARGE   = 3.50;

// ─── Customer-facing delivery fee calculation ─────────────────────────────────
function calcCustomerFee(
  distanceKm:       number,
  isPeakHour:       boolean,
  isHighDemand:     boolean,
  isBadWeather:     boolean,
  orderValue:       number,
  tier:             "standard" | "priority",
  settings:         Record<string, any>,
): { baseFee: number; surcharges: number; total: number } {
  // Distance bands (spec §Pricing Engine)
  let baseFee: number;
  if (distanceKm <= 3)       baseFee = 6.99;
  else if (distanceKm <= 6)  baseFee = 8.99;
  else                       baseFee = 10.99;

  let surcharges = 0;
  if (isPeakHour)    surcharges += Number(settings.peak_surcharge    ?? 2.00);
  if (isHighDemand)  surcharges += Number(settings.peak_surcharge    ?? 2.00) + (isHighDemand ? 2 : 0); // +$2-$4
  if (isBadWeather)  surcharges += Number(settings.bad_weather_surcharge ?? 3.00);

  // Minimum order logic
  const minOrderThreshold = Number(settings.min_order_threshold ?? 25);
  const highValueThreshold = 40;
  if (orderValue < minOrderThreshold) surcharges += 2.00;
  if (orderValue > highValueThreshold) surcharges -= Number(settings.high_value_discount ?? 2.00);

  // Priority surcharge
  if (tier === "priority") surcharges += Number(settings.priority_surcharge ?? DEFAULT_PRIORITY_SURCHARGE);

  surcharges = Math.max(0, surcharges);
  return { baseFee, surcharges, total: Math.round((baseFee + surcharges) * 100) / 100 };
}

// ─── Core selection algorithm ────────────────────────────────────────────────
function selectProvider(
  quotes:           ProviderQuote[],
  tier:             "standard" | "priority",
  maxEtaMin:        number,
  etaDiffThreshold: number,
): { selected: ProviderQuote; rationale: string } | null {
  // Step 2: Filter — remove unavailable and ETA-exceeded providers
  const valid = quotes.filter(q => q.available && !q.error && q.deliveryEtaMin <= maxEtaMin);
  if (valid.length === 0) return null;

  // Step 3 & 4: Tier-based selection
  if (tier === "standard") {
    // Prioritise lowest cost. If ETA diff < threshold, cheapest wins outright.
    const byCost = [...valid].sort((a, b) => a.cost - b.cost);
    const cheapest = byCost[0]!;
    const fastest  = [...valid].sort((a, b) => a.deliveryEtaMin - b.deliveryEtaMin)[0]!;

    if (cheapest.provider === fastest.provider) {
      return { selected: cheapest, rationale: `${cheapest.provider} is both cheapest ($${cheapest.cost.toFixed(2)}) and fastest (${cheapest.deliveryEtaMin} min). Clear winner.` };
    }

    const etaDiff = fastest.deliveryEtaMin - cheapest.deliveryEtaMin;
    // If cheapest is faster (or within threshold), pick cheapest
    if (cheapest.deliveryEtaMin <= fastest.deliveryEtaMin || etaDiff < etaDiffThreshold) {
      return { selected: cheapest, rationale: `${cheapest.provider} ($${cheapest.cost.toFixed(2)}, ${cheapest.deliveryEtaMin} min) is cheapest. ETA difference vs fastest is ${etaDiff} min — under ${etaDiffThreshold}-min threshold. Standard tier: cost priority.` };
    }

    // ETA difference is significant — consider the fastest within acceptable cost range
    // "Acceptable": up to 30% more expensive than cheapest
    const maxAcceptableCost = cheapest.cost * 1.3;
    const fastestAffordable = [...valid]
      .filter(q => q.cost <= maxAcceptableCost)
      .sort((a, b) => a.deliveryEtaMin - b.deliveryEtaMin)[0] ?? cheapest;

    return {
      selected: fastestAffordable,
      rationale: `${fastestAffordable.provider} ($${fastestAffordable.cost.toFixed(2)}, ${fastestAffordable.deliveryEtaMin} min). ETA difference is ${etaDiff} min — exceeds ${etaDiffThreshold}-min threshold. Chose fastest within 30% cost premium.`,
    };

  } else {
    // Priority tier — fastest ETA first, allow higher cost
    const byEta     = [...valid].sort((a, b) => a.deliveryEtaMin - b.deliveryEtaMin);
    const fastest   = byEta[0]!;
    const secondEta = byEta[1];

    // If second-fastest is within threshold and cheaper, pick it
    if (secondEta) {
      const etaDiff = secondEta.deliveryEtaMin - fastest.deliveryEtaMin;
      if (etaDiff < etaDiffThreshold && secondEta.cost < fastest.cost) {
        return { selected: secondEta, rationale: `${secondEta.provider} ($${secondEta.cost.toFixed(2)}, ${secondEta.deliveryEtaMin} min). Only ${etaDiff} min slower than ${fastest.provider} but $${(fastest.cost - secondEta.cost).toFixed(2)} cheaper. Priority tier: fastest within threshold.` };
      }
    }

    return { selected: fastest, rationale: `${fastest.provider} is fastest at ${fastest.deliveryEtaMin} min ($${fastest.cost.toFixed(2)}). Priority tier: ETA first.` };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body: RoutingRequest = await req.json();
    const { businessId, orderId, orderValue, distanceKm, pickupAddress, dropoffAddress, deliveryTier, isPeakHour, isHighDemand, isBadWeather } = body;

    if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });
    if (!distanceKm || !pickupAddress || !dropoffAddress) return NextResponse.json({ error: "distanceKm, pickupAddress and dropoffAddress required" }, { status: 400 });

    const db = createAdminClient();

    // Load delivery_settings
    const { data: biz } = await db.from("businesses").select("delivery_settings").eq("id", businessId).single();
    const ds = (biz?.delivery_settings ?? {}) as Record<string, any>;

    const creds: ProviderCredentials = {
      uber_direct_api_key:     ds.uber_direct_api_key,
      uber_direct_customer_id: ds.uber_direct_customer_id,
      doordash_developer_id:   ds.doordash_developer_id,
      doordash_key_id:         ds.doordash_key_id,
      doordash_signing_secret: ds.doordash_signing_secret,
      sherpa_api_key:          ds.sherpa_api_key,
      zoom2u_api_key:          ds.zoom2u_api_key,
      gopeople_api_key:        ds.gopeople_api_key,
    };

    // Parse addresses into structured form
    // Addresses are passed as free-text strings — parse suburb/state/postcode from trailing portion.
    // Format expected: "123 George St, Sydney NSW 2000"
    function parseAddress(addr: string) {
      const parts = addr.split(",").map(s => s.trim());
      const street = parts[0] ?? addr;
      const rest   = (parts[1] ?? "").trim();
      // Try to match "Suburb STATE POSTCODE"
      const m = rest.match(/^(.+?)\s+([A-Z]{2,3})\s+(\d{4})$/);
      return {
        street,
        suburb:   m ? m[1]! : rest,
        state:    m ? m[2]! : "NSW",
        postcode: m ? m[3]! : "2000",
        country:  "AU",
      };
    }

    const pickup  = parseAddress(pickupAddress);
    const dropoff = parseAddress(dropoffAddress);

    // Fetch all provider quotes simultaneously
    const allQuotes = await fetchAllQuotes(creds, { pickup, dropoff, distanceKm });

    // Apply routing decision
    const maxEtaMin        = Number(ds.max_eta_minutes      ?? DEFAULT_MAX_ETA_MIN);
    const etaDiffThreshold = Number(ds.eta_diff_threshold_min ?? DEFAULT_ETA_DIFF_THRESHOLD);
    const tier             = (deliveryTier ?? "standard") as "standard" | "priority";

    const selection = selectProvider(allQuotes, tier, maxEtaMin, etaDiffThreshold);

    // Calculate customer-facing fee
    const { baseFee, surcharges, total: customerFee } = calcCustomerFee(
      distanceKm, isPeakHour ?? false, isHighDemand ?? false, isBadWeather ?? false,
      orderValue ?? 0, tier, ds,
    );
    const serviceFee = Number(ds.service_fee ?? DEFAULT_SERVICE_FEE);

    let decision: RoutingDecision;

    if (!selection) {
      // Step 5: No provider available — fallback
      decision = {
        selectedProvider: "none",
        providerCost:     0,
        customerFee,
        serviceFee,
        deliveryMargin:   customerFee + serviceFee,  // margin = full fee (no provider cost)
        pickupEtaMin:     0,
        deliveryEtaMin:   0,
        rationale:        "No delivery providers available within the ETA limit. Consider extending the max ETA in Settings → Delivery Providers.",
        allQuotes,
      };
    } else {
      const { selected, rationale } = selection;
      decision = {
        selectedProvider: selected.provider,
        providerCost:     selected.cost,
        customerFee,
        serviceFee,
        deliveryMargin:   Math.round((customerFee + serviceFee - selected.cost) * 100) / 100,
        pickupEtaMin:     selected.pickupEtaMin,
        deliveryEtaMin:   selected.deliveryEtaMin,
        rationale,
        allQuotes,
      };
    }

    // Log to delivery_jobs + delivery_quotes
    const { data: job, error: jobErr } = await db
      .from("delivery_jobs")
      .insert({
        business_id:             businessId,
        order_id:                orderId ?? null,
        order_value:             orderValue ?? 0,
        distance_km:             distanceKm,
        pickup_address:          pickupAddress,
        dropoff_address:         dropoffAddress,
        delivery_tier:           tier,
        selected_provider:       decision.selectedProvider,
        provider_cost:           decision.providerCost,
        customer_fee:            decision.customerFee,
        service_fee:             decision.serviceFee,
        delivery_margin:         decision.deliveryMargin,
        selection_reason:        decision.rationale,
        estimated_pickup_eta_min:   decision.pickupEtaMin,
        estimated_delivery_eta_min: decision.deliveryEtaMin,
        status:                  decision.selectedProvider === "none" ? "failed" : "pending",
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;
    const jobId = job!.id;

    // Log individual provider quotes
    if (allQuotes.length > 0) {
      await db.from("delivery_quotes").insert(
        allQuotes.map(q => ({
          job_id:          jobId,
          business_id:     businessId,
          provider:        q.provider,
          cost:            q.cost,
          pickup_eta_min:  q.pickupEtaMin,
          delivery_eta_min: q.deliveryEtaMin,
          available:       q.available,
          error_message:   q.error ?? null,
        }))
      );
    }

    return NextResponse.json({ decision, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
