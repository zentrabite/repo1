import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          nearBlack: "#0A1628",
          darkNavy:  "#0F1F2D",
          green:     "#00B67A",
          orange:    "#FF6B35",
          cloud:     "#E2E8F0",
          muted:     "#7A8FA6",
          border:    "#1E3448",
          cardBg:    "#132236",
        },
      },
      fontFamily: {
        heading: ["Outfit", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
