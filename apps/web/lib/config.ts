// Public config read by marketing-site components.
// Swap NEXT_PUBLIC_DASHBOARD_URL in Vercel once dashboard.zentrabite.com.au is live.
export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.zentrabite.com";

export const LOGIN_URL = `${DASHBOARD_URL}/login`;
export const SIGNUP_URL = `${DASHBOARD_URL}/signup`;
