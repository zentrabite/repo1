// Public config read by marketing-site components.
// NEXT_PUBLIC_DASHBOARD_URL in Vercel points at the live CRM (dashboard.zentrabite.com).
export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.zentrabite.com";

export const LOGIN_URL = `${DASHBOARD_URL}/login`;
export const SIGNUP_URL = `${DASHBOARD_URL}/signup`;
