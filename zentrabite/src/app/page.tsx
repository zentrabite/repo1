import { redirect } from "next/navigation";

// Root redirects to the login page.
// Once auth is wired up, check for an active session here and redirect to
// /dashboard if one exists, otherwise fall through to /login.
export default function Home() {
  redirect("/login");
}
