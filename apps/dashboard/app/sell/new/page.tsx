"use client";

// The sale handover form. The seller fills it in with the owner at the sale,
// and the shop goes to the team as a draft (components/new-shop-form.tsx).

import Link from "next/link";
import { useBusiness } from "@/hooks/use-business";
import NewShopForm from "@/components/new-shop-form";

export default function NewSalePage() {
  const { loading, isSeller, isSuperAdmin } = useBusiness();
  if (loading) return <p style={{ color: "#6B7C93", padding: "40px 0", textAlign: "center" }}>Loading…</p>;
  if (!isSeller && !isSuperAdmin) {
    return <p style={{ color: "#6B7C93" }}>This page is for ZentraBite sellers. <Link href="/dashboard" style={{ color: "#00AD82" }}>Go to the CRM</Link></p>;
  }
  return <NewShopForm mode="seller" />;
}
