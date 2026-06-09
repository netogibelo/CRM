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
  { id: "indigo", nome: "Índigo", header: "bg-indigo-200 text-indigo-900", dot: "bg-indigo-500" },
  { id: "cyan", nome: "Ciano", header: "bg-cyan-200 text-cyan-900", dot: "bg-cyan-500" },
  { id: "lime", nome: "Lima", header: "bg-lime-200 text-lime-900", dot: "bg-lime-500" },
  { id: "fuchsia", nome: "Fúcsia", header: "bg-fuchsia-200 text-fuchsia-900", dot: "bg-fuchsia-500" },
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

// A duplicata `dark:border-l-*` não é redundante: o card aplica
// `dark:border-dark-border` (cor nos 4 lados) com especificidade (0,2,0) por
// causa do seletor `.dark`, o que vence o `border-l-*` sem prefixo (0,1,0) e
// apagava a barra no tema escuro. O `dark:border-l-*` empata a especificidade
// e vence por ordem (utilities de lado vêm depois do shorthand no CSS gerado).
export const CARD_CORES: CardCorInfo[] = [
  { id: "slate", nome: "Ardósia", barra: "border-l-slate-500 dark:border-l-slate-500", swatch: "bg-slate-500" },
  { id: "sky", nome: "Azul-céu", barra: "border-l-sky-500 dark:border-l-sky-500", swatch: "bg-sky-500" },
  { id: "emerald", nome: "Esmeralda", barra: "border-l-emerald-500 dark:border-l-emerald-500", swatch: "bg-emerald-500" },
  { id: "orange", nome: "Laranja", barra: "border-l-orange-500 dark:border-l-orange-500", swatch: "bg-orange-500" },
  { id: "rose", nome: "Rosa", barra: "border-l-rose-500 dark:border-l-rose-500", swatch: "bg-rose-500" },
  { id: "violet", nome: "Violeta", barra: "border-l-violet-500 dark:border-l-violet-500", swatch: "bg-violet-500" },
  { id: "zinc", nome: "Zinco", barra: "border-l-zinc-500 dark:border-l-zinc-500", swatch: "bg-zinc-500" },
  { id: "blue", nome: "Azul", barra: "border-l-blue-500 dark:border-l-blue-500", swatch: "bg-blue-500" },
  { id: "teal", nome: "Turquesa", barra: "border-l-teal-500 dark:border-l-teal-500", swatch: "bg-teal-500" },
  { id: "yellow", nome: "Amarelo", barra: "border-l-yellow-500 dark:border-l-yellow-500", swatch: "bg-yellow-500" },
  { id: "pink", nome: "Pink", barra: "border-l-pink-500 dark:border-l-pink-500", swatch: "bg-pink-500" },
  { id: "purple", nome: "Roxo", barra: "border-l-purple-500 dark:border-l-purple-500", swatch: "bg-purple-500" },
];

export const CARD_COR_IDS: CardCor[] = CARD_CORES.map((c) => c.id);

export function cardBarra(cor: CardCor | null): string | null {
  if (!cor) return null;
  return CARD_CORES.find((c) => c.id === cor)?.barra ?? null;
}
