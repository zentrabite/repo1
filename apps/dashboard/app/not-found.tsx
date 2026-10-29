// ─── 404 ─────────────────────────────────────────────────────────────────────
// Next shows this for any address that doesn't match a page, and for
// notFound() calls with no closer not-found file.
//
// This app also serves restaurant sites on name.zentrabite.com (proxy.ts).
// A missing page there must never show the CRM, so restaurant hosts get the
// plain public 404. NotFoundView also does that for the public /site and
// /store pages on the CRM host. Everything else gets the CRM's own 404.

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { tenantFromHost } from "@/lib/tenant";
import { PUBLIC_NOT_FOUND_BG } from "@/components/public-not-found";
import NotFoundView from "@/components/not-found-view";

async function onRestaurantHost(): Promise<boolean> {
  return tenantFromHost((await headers()).get("host")) !== null;
}

// Neutral on purpose. The root layout's title says "Merchant CRM".
export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist.",
};

export async function generateViewport(): Promise<Viewport> {
  return (await onRestaurantHost()) ? { themeColor: PUBLIC_NOT_FOUND_BG } : {};
}

export default async function NotFound() {
  return <NotFoundView onRestaurantHost={await onRestaurantHost()} />;
}
