import type { Metadata, Viewport } from "next";
import { Exo, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/lib/theme";

// Fontes oficiais da marca Gibelo Construtora (Manual de Marca v1.0).
// Exo · display + sistema (Extra Bold para hero, Medium para subtítulos, Regular para corpo).
// Source Serif 4 · slogan, manifesto e leads editoriais — sempre em itálico.
const exo = Exo({
  subsets: ["latin"],
  variable: "--font-exo",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pipeline de Vendas — Gibelo Construtora",
  description:
    "Funil de vendas para obras por taxa de administração — Gibelo Construtora.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00385C" },
    { media: "(prefers-color-scheme: dark)", color: "#10182D" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${exo.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Script anti-flash: define a classe `dark` no <html> antes do paint
            quando o tema salvo é escuro. Não toca em React. */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
