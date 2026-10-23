import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        cond: ["'Barlow Condensed'", "Barlow", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        concrete: "#E9ECEE",
        card: "#FFFFFF",
        ink: "#1F2830",
        steel: "#5C6873",
        line: "#D2D8DD",
        well: "#F3F5F6",
        vis: {
          DEFAULT: "#F0641E",
          dark: "#C94E0F",
          soft: "#FDEBDF",
        },
        go: { DEFAULT: "#1E7A4C", soft: "#E1F2E8" },
        stop: { DEFAULT: "#B4261E", soft: "#FBE4E2" },
      },
      borderRadius: {
        box: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
