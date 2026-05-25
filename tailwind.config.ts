import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0D2137",
          50: "#f3f6f9",
          100: "#e2e9f1",
          200: "#c7d5e3",
          300: "#9fb6cd",
          400: "#7090b1",
          500: "#4f6f93",
          600: "#3d587a",
          700: "#334863",
          800: "#1c2f47",
          900: "#0D2137",
          950: "#081627",
        },
        brand: {
          gold: "#b08d57",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(13, 33, 55, 0.08), 0 1px 2px rgba(13, 33, 55, 0.04)",
        "card-hover":
          "0 8px 24px rgba(13, 33, 55, 0.12), 0 2px 6px rgba(13, 33, 55, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
