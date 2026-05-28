"use client";

import { useMemo } from "react";
import { useDeals, useOrigins, useStages } from "@/lib/crm-store";
import { calcularMetrics } from "@/lib/metrics";
import { btnPrimary } from "@/lib/ui";
import { Dashboard } from "./Dashboard";
import { Board } from "./Board";
import { useDealForm } from "./useDealForm";
import {
  FiltrosFunil,
  aplicarFiltros,
  useFiltrosFunil,
} from "./FiltrosFunil";

export function FunilView() {
  const { deals, atualizar } = useDeals();
  const { etapas } = useStages();
  const { origens } = useOrigins();
  const { abrir, abrirNovo, elemento } = useDealForm();
  const [filtros, setFiltros] = useFiltrosFunil();

  const abertos = useMemo(
    () => deals.filter((d) => d.status === "aberto"),
    [deals],
  );
  const abertosFiltrados = useMemo(
    () => aplicarFiltros(abertos, filtros),
    [abertos, filtros],
  );

  /**
   * Métricas respeitam os filtros aplicados.
   *
   * - Para "abertos", usamos abertosFiltrados.
   * - Para ganhos/perdidos, aplicamos o mesmo conjunto de filtros sobre os
   *   deals fechados, exceto o filtro de etapa (deal ganho está sempre na
   *   etapa final; filtrar por etapa zeraria ganhos). Decisão: status
   *   ganho/perdido entra na conta de taxa de fechamento usando os mesmos
   *   filtros estruturais (responsável, origem, tipo de obra, cidade, valor).
   */
  const dealsFiltradosParaMetrics = useMemo(() => {
    const fechados = deals.filter((d) => d.status !== "aberto");
    const fechadosFiltrados = aplicarFiltros(fechados, filtros);
    return [...abertosFiltrados, ...fechadosFiltrados];
  }, [deals, filtros, abertosFiltrados]);

  const metrics = useMemo(
    () => calcularMetrics(dealsFiltradosParaMetrics, etapas, origens),
    [dealsFiltradosParaMetrics, etapas, origens],
  );

  async function mover(dealId: string, etapaId: string) {
    const alvo = deals.find((d) => d.id === dealId);
    if (!alvo || alvo.etapaId === etapaId) return;
    await atualizar(dealId, { etapaId });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Funil de oportunidades
        </h2>
        <button type="button" onClick={abrirNovo} className={btnPrimary}>
          + Nova oportunidade
        </button>
      </div>

      <Dashboard m={metrics} />

      <FiltrosFunil
        filtros={filtros}
        onChange={setFiltros}
        origens={origens}
        totalDeals={abertos.length}
        filtradosCount={abertosFiltrados.length}
      />

      {abertosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 dark:border-dark-border dark:border-dark-border bg-white dark:bg-dark-surface px-6 py-14 text-center">
          <p className="text-sm font-medium text-navy-700 dark:text-gibelo-offwhite">
            {abertos.length === 0
              ? "Nenhuma oportunidade aberta no funil."
              : "Nenhuma oportunidade corresponde aos filtros."}
          </p>
          <p className="mt-1 text-sm text-navy-700 dark:text-gibelo-areia">
            {abertos.length === 0
              ? "Crie a primeira oportunidade para começar a acompanhar."
              : "Ajuste ou limpe os filtros para ver as oportunidades."}
          </p>
          {abertos.length === 0 && (
            <button
              type="button"
              onClick={abrirNovo}
              className={`${btnPrimary} mt-4`}
            >
              Nova oportunidade
            </button>
          )}
        </div>
      ) : (
        <Board deals={abertosFiltrados} onAbrir={abrir} onMover={mover} />
      )}

      {elemento}
    </div>
  );
}
