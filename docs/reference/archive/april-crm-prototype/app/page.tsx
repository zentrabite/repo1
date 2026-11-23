// ============================================================
// app/page.tsx
// ROOT PAGE — redirects anyone who visits "/" to "/dashboard"
// ============================================================

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
