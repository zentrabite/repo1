// ─── Loyalty engine ──────────────────────────────────────────────────────────
// Single source of truth for awarding points. Always do both:
//   1. Increment customers.points_balance
//   2. Write a row to loyalty_events (audit trail)
//
// The multipliers are read from businesses.settings.loyalty so each merchant
// can tune their own rates. Sensible defaults are baked in.

import { supabase } from "@/lib/supabase";

export type EarnEvent =
  | "order"      // standard order points
  | "referral"   // referrer/referee bonus on first order
  | "birthday"   // birthday bonus
  | "streak"     // N-week consecutive orders bonus
  | "review"     // left a review
  | "manual";    // owner-added points

export interface LoyaltySettings {
  // Base rate — points per $1 spent on a direct order. Default: 10
  base_rate: number;
  // Multipliers
  direct_multiplier:     number; // default 1.0
  aggregator_multiplier: number; // default 0.5 (encourage direct)
  // Fixed point bonuses
  birthday_points:    number; // default 200
  referral_points:    number; // default 250 (to both referrer + referee)
  streak_points:      number; // default 100 (per 4-order streak)
  review_points:      number; // default 50
}

const DEFAULTS: LoyaltySettings = {
  base_rate:             10,
  direct_multiplier:     1.0,
  aggregator_multiplier: 0.5,
  birthday_points:       200,
  referral_points:       250,
  streak_points:         100,
  review_points:         50,
};

export async function getLoyaltySettings(businessId: string): Promise<LoyaltySettings> {
  const { data } = await supabase
    .from("businesses")
    .select("settings")
    .eq("id", businessId)
    .single();
  const stored = (data?.settings as any)?.loyalty ?? {};
  return { ...DEFAULTS, ...stored };
}

// Calculate points for an order based on channel + spend.
// Caller decides which channel — POS = "direct", aggregator pull = "uber_eats" etc.
export function pointsForOrder(
  total: number,
  channel: string,
  s: LoyaltySettings,
): { points: number; multiplier: number } {
  const isDirect = channel === "direct" || channel === "pos";
  const multiplier = isDirect ? s.direct_multiplier : s.aggregator_multiplier;
  const points = Math.round(total * s.base_rate * multiplier);
  return { points, multiplier };
}

// Award points to a customer + log the event. Single atomic-ish call.
// Returns the new balance.
export async function awardPoints(input: {
  businessId: string;
  customerId: string;
  points: number;
  multiplier?: number;
  eventType: EarnEvent;
  source?: string;
}): Promise<number | null> {
  if (input.points === 0) return null;

  // Read current balance
  const { data: cust } = await supabase
    .from("customers")
    .select("points_balance")
    .eq("id", input.customerId)
    .single();
  if (!cust) return null;

  const newBalance = (cust.points_balance ?? 0) + input.points;

  // Update balance + log audit row (best-effort sequencing — no Postgres txn here)
  await supabase
    .from("customers")
    .update({ points_balance: newBalance })
    .eq("id", input.customerId);

  await supabase.from("loyalty_events").insert({
    business_id: input.businessId,
    customer_id: input.customerId,
    event_type:  input.eventType,
    points:      input.points,
    multiplier:  input.multiplier ?? 1.0,
    source:      input.source ?? null,
  });

  return newBalance;
}

// ─── Referral redemption ─────────────────────────────────────────────────────
// Call when a NEW customer places their first order with a referral code.
// Awards points to BOTH the referrer and the referee.
export async function awardReferral(input: {
  businessId: string;
  referrerId: string;   // existing customer who referred
  refereeId:  string;   // brand-new customer who just placed first order
  orderId:    string;
}): Promise<void> {
  const settings = await getLoyaltySettings(input.businessId);
  const points = settings.referral_points;

  await Promise.all([
    awardPoints({
      businessId: input.businessId,
      customerId: input.referrerId,
      points,
      eventType:  "referral",
      source:     `referee:${input.refereeId}`,
    }),
    awardPoints({
      businessId: input.businessId,
      customerId: input.refereeId,
      points,
      eventType:  "referral",
      source:     `referrer:${input.referrerId}`,
    }),
  ]);
}
