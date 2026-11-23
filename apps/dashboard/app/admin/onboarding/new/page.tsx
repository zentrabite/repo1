"use client";

export const dynamic = "force-dynamic";

// Super Admin → New business. The form is shared with the sellers' handover
// form (components/new-shop-form.tsx).

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBusiness } from "@/hooks/use-business";
import NewShopForm from "@/components/new-shop-form";

export default function NewOnboardingPage() {
  const router = useRouter();
  const { isSuperAdmin, loading } = useBusiness();

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace("/dashboard");
  }, [loading, isSuperAdmin, router]);

  if (loading) return <div style={{ padding: 80, color: "#8B9DB5", textAlign: "center" }}>Loading…</div>;
  if (!isSuperAdmin) return null;
  return <NewShopForm mode="staff" />;
}
