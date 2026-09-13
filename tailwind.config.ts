import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121826",
        muted: "#64748B",
        line: "#DDE5EF",
        paper: "#F4F7FB",
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          900: "#172554"
        },
        success: "#16803C",
        warning: "#B45309",
        danger: "#B91C1C"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.08)"
      }
    },
  },
  plugins: [],
};

export default config;
