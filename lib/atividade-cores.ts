import type { AtividadeCor } from "./types";

export interface CorInfo {
  id: AtividadeCor;
  nome: string;
  /** Classe de fundo sólido para o swatch e a barra do card. */
  swatch: string;
}

export const ATIVIDADE_CORES: CorInfo[] = [
  { id: "azul", nome: "Azul", swatch: "bg-sky-500" },
  { id: "verde", nome: "Verde", swatch: "bg-emerald-500" },
  { id: "ambar", nome: "Âmbar", swatch: "bg-amber-500" },
  { id: "vermelho", nome: "Vermelho", swatch: "bg-red-500" },
  { id: "roxo", nome: "Roxo", swatch: "bg-violet-500" },
  { id: "cinza", nome: "Cinza", swatch: "bg-navy-400" },
];

export function corSwatch(cor: AtividadeCor | null): string | null {
  if (!cor) return null;
  return ATIVIDADE_CORES.find((c) => c.id === cor)?.swatch ?? null;
}
