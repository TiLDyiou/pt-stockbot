import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        oled: {
          bg: "#05070a",
          card: "#0c1017",
          subtle: "#141a24",
          border: "rgba(255, 255, 255, 0.08)",
        },
        stock: {
          up: "#10b981",    // Crisp Emerald
          down: "#f43f5e",  // Neon Rose
          ref: "#f59e0b",   // Amber
          ceil: "#a855f7",  // Purple
          floor: "#06b6d4", // Cyan
        },
      },
      boxShadow: {
        "inner-glow": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)",
        "ambient-sm": "0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
        "ambient-lg": "0 24px 48px -12px rgba(0, 0, 0, 0.25), 0 12px 24px -6px rgba(0, 0, 0, 0.15)",
        "emerald-glow": "0 0 20px -3px rgba(16, 185, 129, 0.35)",
      },
      transitionTimingFunction: {
        haptic: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
