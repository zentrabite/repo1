// ============================================================
// tailwind.config.ts
// Tailwind CSS configuration — ZentraBite custom fonts + colors
// ============================================================

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Map our Google Fonts (loaded in layout.tsx) to Tailwind classes
      // Usage: font-heading, font-body, font-mono
      fontFamily: {
        heading: ["var(--font-outfit)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      // ZentraBite brand colours as Tailwind classes
      // Usage: text-brand-green, bg-brand-navy, etc.
      colors: {
        brand: {
          green: "#00B67A",
          orange: "#FF6B35",
          navy: "#0F1F2D",
          "near-black": "#0A1628",
          cloud: "#E2E8F0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
