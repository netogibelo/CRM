import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

/**
 * Paleta Gibelo Construtora (Manual de Marca v1.0):
 *   Azul Profundo  · #00385C · Pantone 302C  · primária 1
 *   Preto Tinta    · #10182D · Pantone Black 6C · primária 2
 *   Off-white      · #F4F1EB · apoio fundo
 *   Areia          · #C8B89D · apoio detalhe
 *   Cinza Quente   · #908475 · apoio corpo (texto longo)
 *   Cinza Frio     · #7CB780 · secundária — selos
 *   Azul Médio     · #617486 · acento — ícones
 *
 * O token `navy` é mantido como nome interno (referenciado em todo o app),
 * mas reancorado em #00385C — Azul Profundo do manual. As gradações são
 * derivadas da nova cor primária.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#00385C",
          50: "#F4F7FB",
          100: "#E2EAF2",
          200: "#C2D2E1",
          300: "#95B0C9",
          400: "#5F89AC",
          500: "#3F6A8E",
          600: "#265679",
          700: "#0F4B70",
          800: "#054268",
          900: "#00385C",
          950: "#001D2F",
        },
        gibelo: {
          azul: "#00385C",
          "azul-medio": "#617486",
          preto: "#10182D",
          offwhite: "#F4F1EB",
          areia: "#C8B89D",
          "cinza-quente": "#908475",
          "cinza-frio": "#7CB780",
        },
        /**
         * Superfícies do modo dark — derivadas da paleta Gibelo Construtora
         * para manter consistência visual da marca no tema escuro.
         */
        dark: {
          bg: "#10182D",       // Preto Tinta — fundo geral
          surface: "#1A2540",  // cards, modais, header
          elevated: "#1E2D47", // inputs, dropdowns, tooltip
          border: "#2A3A5A",   // bordas sutis
          divider: "#1F2C45",  // divisores fracos
        },
        brand: {
          gold: "#C8B89D",
        },
      },
      fontFamily: {
        sans: ["var(--font-exo)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 56, 92, 0.08), 0 1px 2px rgba(0, 56, 92, 0.04)",
        "card-hover":
          "0 8px 24px rgba(0, 56, 92, 0.12), 0 2px 6px rgba(0, 56, 92, 0.06)",
      },
    },
  },
  plugins: [containerQueries],
};

export default config;
