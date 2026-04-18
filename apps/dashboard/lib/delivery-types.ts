// Shared types for the delivery routing engine.
// Kept in lib/ so both the API route and client page can import without
// pulling next/headers into the client bundle.

export interface DeliveryRecommendation {
  provider: "uber_direct" | "tasker" | "tasker_and_uber" | "none";
  taskersNeeded: number;
  uberOrders: number;
  estimatedCost: number;
  uberOnlyCost: number;
  saving: number;
  rationale: string;
}

export interface DeliveryPrediction {
  date: string;
  dayOfWeek: string;
  predictedVolume: number;
  historicalAverage: number;
  historicalData: { date: string; count: number }[];
  recommendation: DeliveryRecommendation;
}
