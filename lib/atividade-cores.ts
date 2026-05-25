import type { CardCor, ListaCor } from "./types";

// Classes literais completas (não interpoladas) para o Tailwind gerar — por isso
// `lib/` está incluído no `content` do tailwind.config.ts.

// ── Cores das listas (cabeçalho) ─────────────────────────────────────────────
export interface ListaCorInfo {
  id: ListaCor;
  nome: string;
  /** Fundo + texto do cabeçalho da lista. */
  header: string;
  /** Bolinha do seletor de cor. */
  dot: string;
}

export const LISTA_CORES: ListaCorInfo[] = [
  { id: "gray", nome: "Cinza", header: "bg-slate-200 text-slate-800", dot: "bg-slate-400" },
  { id: "blue", nome: "Azul", header: "bg-blue-200 text-blue-900", dot: "bg-blue-500" },
  { id: "green", nome: "Verde", header: "bg-green-200 text-green-900", dot: "bg-green-600" },
  { id: "amber", nome: "Âmbar", header: "bg-amber-200 text-amber-900", dot: "bg-amber-500" },
  { id: "red", nome: "Vermelho", header: "bg-red-200 text-red-900", dot: "bg-red-500" },
  { id: "purple", nome: "Roxo", header: "bg-purple-200 text-purple-900", dot: "bg-purple-600" },
  { id: "teal", nome: "Turquesa", header: "bg-teal-200 text-teal-900", dot: "bg-teal-600" },
  { id: "pink", nome: "Rosa", header: "bg-pink-200 text-pink-900", dot: "bg-pink-600" },
];

export const LISTA_COR_IDS: ListaCor[] = LISTA_CORES.map((c) => c.id);

export function listaHeader(cor: ListaCor): string {
  return LISTA_CORES.find((c) => c.id === cor)?.header ?? "bg-navy-100 text-navy-800";
}

export function listaDot(cor: ListaCor): string {
  return LISTA_CORES.find((c) => c.id === cor)?.dot ?? "bg-navy-300";
}

// ── Cores dos cards (barra lateral esquerda) ─────────────────────────────────
export interface CardCorInfo {
  id: CardCor;
  nome: string;
  /** Cor da barra lateral (border-left). */
  barra: string;
  /** Bolinha do seletor de cor. */
  swatch: string;
}

export const CARD_CORES: CardCorInfo[] = [
  { id: "slate", nome: "Ardósia", barra: "border-l-slate-500", swatch: "bg-slate-500" },
  { id: "sky", nome: "Azul", barra: "border-l-sky-500", swatch: "bg-sky-500" },
  { id: "emerald", nome: "Verde", barra: "border-l-emerald-500", swatch: "bg-emerald-500" },
  { id: "orange", nome: "Laranja", barra: "border-l-orange-500", swatch: "bg-orange-500" },
  { id: "rose", nome: "Rosa", barra: "border-l-rose-500", swatch: "bg-rose-500" },
  { id: "violet", nome: "Violeta", barra: "border-l-violet-500", swatch: "bg-violet-500" },
];

export const CARD_COR_IDS: CardCor[] = CARD_CORES.map((c) => c.id);

export function cardBarra(cor: CardCor | null): string | null {
  if (!cor) return null;
  return CARD_CORES.find((c) => c.id === cor)?.barra ?? null;
}
