// ─── Delivery Provider Integrations ──────────────────────────────────────────
// Unified interface to fetch quotes from all 5 delivery providers.
// Each provider returns a ProviderQuote — cost (AUD), pickup ETA, total ETA.
//
// Provider docs / API reference:
//   Uber Direct:    https://developer.uber.com/docs/deliveries/guides/delivery-quotes
//   DoorDash Drive: https://developer.doordash.com/en-US/docs/drive/reference/createquote
//   Sherpa:         https://developer.sherpa.delivery/docs
//   Zoom2u:         https://developer.zoom2u.com/docs
//   GoPeople:       https://developer.gopeople.com.au/docs
//
// SERVER-SIDE ONLY — do not import this in client components.

import type { ProviderQuote, ProviderId } from "./delivery-types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Address {
  street:   string;
  suburb:   string;
  state:    string;
  postcode: string;
  country:  string;
  lat?:     number;
  lng?:     number;
}

interface QuoteRequest {
  pickup:   Address;
  dropoff:  Address;
  distanceKm: number;
}

// ─── Timeout helper ───────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Provider API timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── 1. Uber Direct ───────────────────────────────────────────────────────────
// Docs: https://developer.uber.com/docs/deliveries/guides/delivery-quotes
// Auth: Bearer token (API key)
// Note: Uber returns fee in cents (AUD).

export async function quoteUberDirect(
  apiKey: string,
  customerId: string,
  req: QuoteRequest
): Promise<ProviderQuote> {
  const base: ProviderQuote = { provider: "uber_direct", available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0 };
  if (!apiKey || !customerId) return { ...base, error: "Uber Direct not configured" };

  try {
    const res = await withTimeout(fetch(
      `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_address:  JSON.stringify({ street_address: [req.pickup.street],  city: req.pickup.suburb,  state: req.pickup.state,  zip_code: req.pickup.postcode,  country: req.pickup.country }),
          dropoff_address: JSON.stringify({ street_address: [req.dropoff.street], city: req.dropoff.suburb, state: req.dropoff.state, zip_code: req.dropoff.postcode, country: req.dropoff.country }),
        }),
      }
    ));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `Uber Direct API error: ${(err as any).message ?? res.status}` };
    }

    const data = await res.json();
    // Uber returns fee in cents
    const cost          = typeof data.fee === "number" ? data.fee / 100 : 0;
    // pickup_duration is seconds; total duration is pickup + delivery
    const pickupEtaMin  = Math.ceil((data.pickup_duration ?? 600) / 60);
    const deliveryEtaMin = Math.ceil(((data.pickup_duration ?? 600) + (data.dropoff_duration ?? 1200)) / 60);

    return { provider: "uber_direct", available: true, cost, pickupEtaMin, deliveryEtaMin };
  } catch (e: any) {
    return { ...base, error: e?.message ?? "Uber Direct failed" };
  }
}

// ─── 2. DoorDash Drive ────────────────────────────────────────────────────────
// Docs: https://developer.doordash.com/en-US/docs/drive/reference/createquote
// Auth: JWT — signed with developer_id, key_id, signing_secret (HS256)
// The JWT must be regenerated for each request (short TTL).
// Note: DoorDash quotes fee in cents (USD). Convert to AUD using a fixed rate
// (~1.55 USD → AUD). For production, fetch the live FX rate.

const USD_TO_AUD = 1.55; // approximate — replace with live FX in production

function buildDoorDashJWT(developerId: string, keyId: string, signingSecret: string): string {
  // DoorDash requires a JWT with the header { "dd-ver": "DD-JWT-V1" }.
  // We build it manually using btoa / SubtleCrypto (no external JWT library).
  const header  = { alg: "HS256", "dd-ver": "DD-JWT-V1" };
  const now     = Math.floor(Date.now() / 1000);
  const payload = { aud: "doordash", iss: developerId, kid: keyId, iat: now, exp: now + 300 };

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // NOTE: In a Node.js / Edge runtime, SubtleCrypto is available via globalThis.crypto.
  // The actual signing happens asynchronously; we return a placeholder and sign below.
  // This function is intentionally sync for the header/payload portion only.
  return `${b64url(header)}.${b64url(payload)}`;  // signature appended in signDoorDashJWT
}

async function signDoorDashJWT(developerId: string, keyId: string, signingSecret: string): Promise<string> {
  const header  = { alg: "HS256", "dd-ver": "DD-JWT-V1" };
  const now     = Math.floor(Date.now() / 1000);
  const payload = { aud: "doordash", iss: developerId, kid: keyId, iat: now, exp: now + 300 };

  const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const headerB64  = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data       = `${headerB64}.${payloadB64}`;

  const enc      = new TextEncoder();
  const keyData  = enc.encode(signingSecret);
  const msgData  = enc.encode(data);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig      = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sigB64   = b64url(String.fromCharCode(...new Uint8Array(sig)));

  return `${data}.${sigB64}`;
}

export async function quoteDoorDash(
  developerId: string,
  keyId: string,
  signingSecret: string,
  req: QuoteRequest
): Promise<ProviderQuote> {
  const base: ProviderQuote = { provider: "doordash", available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0 };
  if (!developerId || !keyId || !signingSecret) return { ...base, error: "DoorDash not configured" };

  try {
    const jwt = await signDoorDashJWT(developerId, keyId, signingSecret);

    const res = await withTimeout(fetch("https://openapi.doordash.com/drive/v2/quotes", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        external_delivery_id: `zentrabite-quote-${Date.now()}`,
        pickup_address:  `${req.pickup.street}, ${req.pickup.suburb} ${req.pickup.state} ${req.pickup.postcode}`,
        dropoff_address: `${req.dropoff.street}, ${req.dropoff.suburb} ${req.dropoff.state} ${req.dropoff.postcode}`,
        order_value: 2000, // cents — required by DoorDash; use $20 as a proxy for quote
      }),
    }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `DoorDash API error: ${(err as any).message ?? res.status}` };
    }

    const data = await res.json();
    // DoorDash returns fee in cents (USD)
    const costUsd       = typeof data.fee === "number" ? data.fee / 100 : 0;
    const cost          = costUsd * USD_TO_AUD;
    const pickupEtaMin  = Math.ceil((data.pickup_time_estimated ?? 600) / 60);
    const deliveryEtaMin = Math.ceil((data.dropoff_time_estimated ?? 1800) / 60);

    return { provider: "doordash", available: true, cost, pickupEtaMin, deliveryEtaMin };
  } catch (e: any) {
    return { ...base, error: e?.message ?? "DoorDash failed" };
  }
}

// ─── 3. Sherpa ────────────────────────────────────────────────────────────────
// Docs: https://developer.sherpa.delivery/
// Auth: Bearer token (API key)
// Australian same-day courier network.
// Returns cost in AUD cents.

export async function quoteSherpa(
  apiKey: string,
  req: QuoteRequest
): Promise<ProviderQuote> {
  const base: ProviderQuote = { provider: "sherpa", available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0 };
  if (!apiKey) return { ...base, error: "Sherpa not configured" };

  try {
    const res = await withTimeout(fetch("https://api.sherpa.delivery/v2/quotes", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup: {
          address: req.pickup.street,
          suburb:  req.pickup.suburb,
          state:   req.pickup.state,
          postcode: req.pickup.postcode,
        },
        dropoff: {
          address: req.dropoff.street,
          suburb:  req.dropoff.suburb,
          state:   req.dropoff.state,
          postcode: req.dropoff.postcode,
        },
        parcel: { weight_kg: 2, length_cm: 30, width_cm: 30, height_cm: 15 },
      }),
    }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `Sherpa API error: ${(err as any).message ?? res.status}` };
    }

    const data = await res.json();
    // Sherpa returns price in AUD cents
    const cost           = typeof data.price === "number" ? data.price / 100 : 0;
    const pickupEtaMin   = data.pickup_eta_minutes ?? 20;
    const deliveryEtaMin = data.delivery_eta_minutes ?? (pickupEtaMin + Math.ceil(req.distanceKm * 3));

    return { provider: "sherpa", available: true, cost, pickupEtaMin, deliveryEtaMin };
  } catch (e: any) {
    return { ...base, error: e?.message ?? "Sherpa failed" };
  }
}

// ─── 4. Zoom2u ────────────────────────────────────────────────────────────────
// Docs: https://developer.zoom2u.com/
// Auth: X-Api-Key header
// Australian courier aggregator (operates major metro areas).
// Returns cost in AUD.

export async function quoteZoom2u(
  apiKey: string,
  req: QuoteRequest
): Promise<ProviderQuote> {
  const base: ProviderQuote = { provider: "zoom2u", available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0 };
  if (!apiKey) return { ...base, error: "Zoom2u not configured" };

  try {
    const res = await withTimeout(fetch("https://api.zoom2u.com/api/v3/delivery/get-quote", {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_address:  `${req.pickup.street}, ${req.pickup.suburb} ${req.pickup.state} ${req.pickup.postcode}`,
        delivery_address: `${req.dropoff.street}, ${req.dropoff.suburb} ${req.dropoff.state} ${req.dropoff.postcode}`,
        delivery_type: "3hour",  // fastest same-day option
        parcel_weight_kg: 2,
      }),
    }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `Zoom2u API error: ${(err as any).message ?? res.status}` };
    }

    const data = await res.json();
    // Zoom2u returns cost in AUD
    const cost           = typeof data.cost === "number" ? data.cost : (typeof data.price === "number" ? data.price : 0);
    const pickupEtaMin   = data.pickup_eta_minutes ?? 25;
    const deliveryEtaMin = data.delivery_eta_minutes ?? (pickupEtaMin + Math.ceil(req.distanceKm * 3));

    return { provider: "zoom2u", available: true, cost, pickupEtaMin, deliveryEtaMin };
  } catch (e: any) {
    return { ...base, error: e?.message ?? "Zoom2u failed" };
  }
}

// ─── 5. GoPeople ─────────────────────────────────────────────────────────────
// Docs: https://developer.gopeople.com.au/
// Auth: Authorization: Bearer {apiKey}
// Australian last-mile courier (Sydney, Melbourne, Brisbane focus).
// Returns cost in AUD cents.

export async function quoteGoPeople(
  apiKey: string,
  req: QuoteRequest
): Promise<ProviderQuote> {
  const base: ProviderQuote = { provider: "gopeople", available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0 };
  if (!apiKey) return { ...base, error: "GoPeople not configured" };

  try {
    const res = await withTimeout(fetch("https://app.gopeople.com.au/api/v2/parcel/quote", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_address:    `${req.pickup.street}, ${req.pickup.suburb} ${req.pickup.state} ${req.pickup.postcode}`,
        delivery_address:  `${req.dropoff.street}, ${req.dropoff.suburb} ${req.dropoff.state} ${req.dropoff.postcode}`,
        service_type:      "sameday",
        weight_kg:         2,
        length_cm:         30,
        width_cm:          30,
        height_cm:         15,
      }),
    }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `GoPeople API error: ${(err as any).message ?? res.status}` };
    }

    const data = await res.json();
    // GoPeople returns price_cents in AUD cents
    const cost           = typeof data.price_cents === "number" ? data.price_cents / 100 : (typeof data.price === "number" ? data.price : 0);
    const pickupEtaMin   = data.pickup_eta_minutes ?? 30;
    const deliveryEtaMin = data.delivery_eta_minutes ?? (pickupEtaMin + Math.ceil(req.distanceKm * 4));

    return { provider: "gopeople", available: true, cost, pickupEtaMin, deliveryEtaMin };
  } catch (e: any) {
    return { ...base, error: e?.message ?? "GoPeople failed" };
  }
}

// ─── Fetch all provider quotes in parallel ────────────────────────────────────
export interface ProviderCredentials {
  uber_direct_api_key?:      string;
  uber_direct_customer_id?:  string;
  doordash_developer_id?:    string;
  doordash_key_id?:          string;
  doordash_signing_secret?:  string;
  sherpa_api_key?:           string;
  zoom2u_api_key?:           string;
  gopeople_api_key?:         string;
}

export async function fetchAllQuotes(
  creds: ProviderCredentials,
  req: QuoteRequest
): Promise<ProviderQuote[]> {
  const calls: Promise<ProviderQuote>[] = [
    quoteUberDirect(creds.uber_direct_api_key ?? "", creds.uber_direct_customer_id ?? "", req),
    quoteDoorDash(creds.doordash_developer_id ?? "", creds.doordash_key_id ?? "", creds.doordash_signing_secret ?? "", req),
    quoteSherpa(creds.sherpa_api_key ?? "", req),
    quoteZoom2u(creds.zoom2u_api_key ?? "", req),
    quoteGoPeople(creds.gopeople_api_key ?? "", req),
  ];

  // All calls in parallel — individual failures return an error quote, not a rejection.
  const results = await Promise.allSettled(calls);
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const providers: ProviderId[] = ["uber_direct","doordash","sherpa","zoom2u","gopeople"];
    return { provider: providers[i]!, available: false, cost: 0, pickupEtaMin: 0, deliveryEtaMin: 0, error: String((r as PromiseRejectedResult).reason) };
  });
}
