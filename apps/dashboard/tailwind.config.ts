import type { Config } from "tailwindcss";

// ── ZentraBite Brand Tokens (from Brand Identity System) ─────────────────────
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Outfit → headings (H1–H3)
        heading: ["var(--font-outfit)", "Outfit", "sans-serif"],
        // Inter → body text, labels, captions
        body:    ["var(--font-inter)", "Inter", "sans-serif"],
        // JetBrains Mono → IDs, data values, code
        mono:    ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          navy:       "#1C2D48",   // Navigation, card surfaces, logo mark bg
          green:      "#00B67A",   // CTAs, active, success — primary action
          orange:     "#FF6B35",   // Alerts, urgency, Uber badges — accent only
          nearBlack:  "#0F1F2D",   // Page background
          steel:      "#6B7C93",   // Labels, secondary text, metadata
          cloud:      "#F8FAFB",   // Primary foreground text
          mist:       "#E2E8F0",   // Borders, dividers, input outlines
        },
      },
      borderRadius: {
        input:  "8px",   // Brand spec: inputs
        card:   "12px",  // Brand spec: cards
        modal:  "16px",  // Brand spec: modals
      },
    },
  },
  plugins: [],
};

export default config;
