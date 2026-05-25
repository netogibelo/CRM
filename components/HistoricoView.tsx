"use client";

import { useMemo } from "react";
import { useDeals, useOrigins, useStages } from "@/lib/crm-store";
import { calcularMetrics } from "@/lib/metrics";
import { OriginAnalysis } from "./OriginAnalysis";
import { HistorySection } from "./HistorySection";
import { useDealForm } from "./useDealForm";

export function HistoricoView() {
  const { deals } = useDeals();
  const { etapas } = useStages();
  const { origens } = useOrigins();
  const { abrir, elemento } = useDealForm();

  const ganhos = useMemo(
    () =>
      deals
        .filter((d) => d.status === "ganho")
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [deals],
  );
  const perdidos = useMemo(
    () =>
      deals
        .filter((d) => d.status === "perdido")
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [deals],
  );
  const metrics = useMemo(
    () => calcularMetrics(deals, etapas, origens),
    [deals, etapas, origens],
  );

  return (
    <div className="space-y-6">
      <OriginAnalysis origens={metrics.origens} />
      <HistorySection ganhos={ganhos} perdidos={perdidos} onAbrir={abrir} />
      {elemento}
    </div>
  );
}
