// ─── Ordering page title ────────────────────────────────────────────────────
// The ordering page (and its success page) are client components, so their
// tab title and description live here. Without this the tab showed the CRM's
// title on name.zentrabite.com/order.

import type { Metadata } from "next";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-server";
import { orderUrl } from "@/lib/tenant";

type Props = { params: Promise<{ subdomain: string }> };

const loadBusiness = cache(async (subdomain: string): Promise<{ name: string; logo_url: string | null } | null> => {
  if (!/^[a-z0-9-]{1,63}$/.test(subdomain)) return null;
  try {
    const { data } = await createAdminClient()
      .from("businesses")
      .select("name, logo_url")
      .eq("subdomain", subdomain)
      .maybeSingle();
    return (data as { name: string; logo_url: string | null } | null) ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  const biz = await loadBusiness(subdomain);
  if (!biz) return { title: "Order online", description: "Order online.", robots: { index: false, follow: false } };
  return {
    title: `${biz.name} · Order online`,
    description: `Order online from ${biz.name}.`,
    alternates: { canonical: orderUrl(subdomain) },
    icons: biz.logo_url ? { icon: biz.logo_url, apple: biz.logo_url } : undefined,
  };
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
