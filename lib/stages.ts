// Helpers puros sobre a coleção de etapas (que agora é dado cadastrável).
// Nenhuma etapa é hardcoded aqui — os defaults vivem em `seed.ts`.

import type { Etapa } from "./types";

/** Paleta usada para colorir as colunas do board conforme a ordem. */
export const PALETA_ETAPAS = [
  "#94a3b8",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function corDaEtapa(ordem: number): string {
  return PALETA_ETAPAS[ordem % PALETA_ETAPAS.length];
}

/** Retorna as etapas ordenadas pelo campo `ordem`. */
export function ordenarEtapas(etapas: Etapa[]): Etapa[] {
  return [...etapas].sort((a, b) => a.ordem - b.ordem);
}

/** Etapas que viram coluna no board ativo (excluem a etapa final/ganho). */
export function etapasAtivas(etapas: Etapa[]): Etapa[] {
  return ordenarEtapas(etapas).filter((e) => !e.final);
}

/** A etapa final do funil (negócio ganho), se existir. */
export function etapaFinal(etapas: Etapa[]): Etapa | undefined {
  return etapas.find((e) => e.final);
}

/** Probabilidade (0..1) da etapa informada. */
export function getProbabilidade(etapas: Etapa[], etapaId: string): number {
  return etapas.find((e) => e.id === etapaId)?.probabilidade ?? 0;
}

/** Nome da etapa informada. */
export function nomeEtapa(etapas: Etapa[], etapaId: string): string {
  return etapas.find((e) => e.id === etapaId)?.nome ?? "—";
}
