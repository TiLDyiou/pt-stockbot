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
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        terminal: {
          bg: "#0b0f17",
          panel: "#111722",
          header: "#161e2e",
          border: "#1e293b",
          subtle: "#1c2536",
          hover: "#222d42",
        },
        stock: {
          up: "#10b981",    // Green (Tăng)
          down: "#ef4444",  // Red (Giảm)
          ref: "#f59e0b",   // Yellow (Tham chiếu)
          ceil: "#a855f7",  // Purple (Trần)
          floor: "#06b6d4", // Cyan (Sàn)
        },
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
