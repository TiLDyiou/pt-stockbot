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
      colors: {
        stock: {
          up: "#10b981",    // Green for positive
          down: "#ef4444",  // Red for negative
          ref: "#f59e0b",   // Yellow/amber for reference
          ceil: "#8b5cf6",  // Purple for ceiling
          floor: "#06b6d4", // Cyan for floor
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
