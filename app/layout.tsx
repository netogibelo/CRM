import type { Metadata, Viewport } from "next";
import { Exo, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

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
  themeColor: "#00385C",
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
    >
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
