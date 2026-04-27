// ─── Delivery Routing Engine — Shared Types ──────────────────────────────────
// Used by:
//   apps/dashboard/app/api/delivery/route/route.ts  (server)
//   apps/dashboard/app/api/delivery/fee/route.ts    (server)
//   apps/dashboard/app/delivery/page.tsx            (client)
//   apps/dashboard/app/pos/page.tsx                 (client)
//   apps/dashboard/app/orders/page.tsx              (client)
// Kept in lib/ so client pages can import types without pulling server code.

// ─── Provider IDs ─────────────────────────────────────────────────────────────
export type ProviderId =
  | "uber_direct"
  | "doordash"
  | "sherpa"
  | "zoom2u"
  | "gopeople"
  | "none";

// ─── Delivery tier ────────────────────────────────────────────────────────────
export type DeliveryTier = "standard" | "priority";

// ─── Quote from a single provider ────────────────────────────────────────────
export interface ProviderQuote {
  provider:        ProviderId;
  available:       boolean;
  cost:            number;         // AUD, provider charge
  pickupEtaMin:    number;         // minutes until driver at pickup
  deliveryEtaMin:  number;         // total minutes until customer receives order
  error?:          string;         // set if the API call failed
}

// ─── Routing decision ─────────────────────────────────────────────────────────
export interface RoutingDecision {
  selectedProvider:     ProviderId;
  providerCost:         number;    // what ZentraBite pays the provider
  customerFee:          number;    // what the customer is charged (distance-based)
  serviceFee:           number;    // flat platform service fee
  deliveryMargin:       number;    // customerFee + serviceFee - providerCost
  pickupEtaMin:         number;
  deliveryEtaMin:       number;
  rationale:            string;
  allQuotes:            ProviderQuote[];
}

// ─── Routing request ──────────────────────────────────────────────────────────
export interface RoutingRequest {
  businessId:       string;
  orderId?:         string;
  orderValue:       number;
  distanceKm:       number;
  pickupAddress:    string;
  dropoffAddress:   string;
  deliveryTier:     DeliveryTier;
  isPeakHour?:      boolean;
  isHighDemand?:    boolean;
  isBadWeather?:    boolean;
}

// ─── Dynamic fee calculation ──────────────────────────────────────────────────
export interface DeliveryFeeBreakdown {
  baseDistance:      number;    // distance-band base fee
  peakSurcharge:     number;
  highDemandSurcharge: number;
  badWeatherSurcharge: number;
  lowOrderSurcharge:   number;  // applied if order_value < min threshold
  highValueDiscount:   number;  // applied if order_value > discount threshold
  serviceFee:          number;
  prioritySurcharge:   number;  // 0 for standard, ~$3.50 for priority
  total:               number;
}

// ─── Legacy prediction types (still used by predict endpoint) ────────────────
export interface DeliveryRecommendation {
  provider:      "uber_direct" | "tasker" | "tasker_and_uber" | "none";
  taskersNeeded: number;
  uberOrders:    number;
  estimatedCost: number;
  uberOnlyCost:  number;
  saving:        number;
  rationale:     string;
}

export interface DeliveryPrediction {
  date:              string;
  dayOfWeek:         string;
  predictedVolume:   number;
  historicalAverage: number;
  historicalData:    { date: string; count: number }[];
  recommendation:    DeliveryRecommendation;
}

// ─── Analytics (from delivery_jobs table) ────────────────────────────────────
export interface DeliveryAnalytics {
  totalJobs:           number;
  totalMargin:         number;
  avgMargin:           number;
  avgDeliveryMin:      number;
  successRate:         number;    // %
  providerBreakdown:   { provider: ProviderId; count: number; avgCost: number; avgEtaMin: number }[];
}
