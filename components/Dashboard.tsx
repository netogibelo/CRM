"use client";

import type { Metrics } from "@/lib/metrics";
import { formatPct } from "@/lib/metrics";
import { formatBRL } from "@/lib/format";

interface DashboardProps {
  m: Metrics;
}

function StatCard({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destaque
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          destaque ? "text-navy-200" : "text-navy-700 dark:text-gibelo-cinza-quente"
        }`}
      >
        {rotulo}
      </p>
      <p
        className={`mt-1.5 text-xl font-bold tracking-tight ${
          destaque ? "text-white" : "text-navy-900 dark:text-gibelo-offwhite"
        }`}
      >
        {valor}
      </p>
      {detalhe && (
        <p
          className={`mt-0.5 text-xs ${
            destaque ? "text-navy-300" : "text-navy-700 dark:text-gibelo-cinza-quente"
          }`}
        >
          {detalhe}
        </p>
      )}
    </div>
  );
}

export function Dashboard({ m }: DashboardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          rotulo="Total na mesa"
          valor={formatBRL(m.totalNaMesa)}
          detalhe={`${m.abertas} ${m.abertas === 1 ? "oportunidade aberta" : "oportunidades abertas"}`}
          destaque
        />
        <StatCard
          rotulo="Valor ponderado"
          valor={formatBRL(m.valorPonderado)}
          detalhe="por probabilidade de etapa"
        />
        <StatCard
          rotulo="Ganhos"
          valor={formatBRL(m.ganhosValor)}
          detalhe={`${m.ganhosQtd} ${m.ganhosQtd === 1 ? "negócio fechado" : "negócios fechados"}`}
        />
        <StatCard
          rotulo="Taxa de fechamento"
          valor={formatPct(m.taxaFechamento)}
          detalhe={`${m.ganhosQtd} ganhos · ${m.perdidosQtd} perdidos`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversão entre etapas */}
        <div className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
              Conversão entre etapas
            </h3>
            <span className="text-xs text-navy-700 dark:text-gibelo-cinza-quente">funil cumulativo</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {m.conversoes.map((c) => (
              <li key={c.deOrigemId}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-700 dark:text-gibelo-areia">
                    {c.deNome} <span className="text-navy-500 dark:text-gibelo-cinza-quente">→</span>{" "}
                    {c.paraNome}
                  </span>
                  <span className="font-semibold text-navy-800 dark:text-gibelo-offwhite">
                    {formatPct(c.taxa)}
                    <span className="ml-1 font-normal text-navy-700 dark:text-gibelo-cinza-quente">
                      ({c.avancaram}/{c.base})
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-dark-elevated">
                  <div
                    className="h-full rounded-full bg-navy-700 transition-all"
                    style={{ width: `${Math.round(c.taxa * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Destaques e alerta */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
            <p className="text-xs font-medium text-navy-700 dark:text-gibelo-cinza-quente">
              Valor médio de negócio
            </p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-navy-900 dark:text-gibelo-offwhite">
              {formatBRL(m.valorMedio)}
            </p>
            <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-cinza-quente">ticket médio de ganhos</p>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              m.paradas > 0
                ? "border-amber-300 bg-amber-50"
                : "border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  m.paradas > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-navy-50 dark:bg-dark-elevated text-navy-700 dark:text-gibelo-cinza-quente"
                }`}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path
                    d="M8 4.5v4M8 11h.01"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6.25"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                  />
                </svg>
              </span>
              <p
                className={`text-sm font-semibold ${
                  m.paradas > 0 ? "text-amber-900" : "text-navy-700 dark:text-gibelo-offwhite"
                }`}
              >
                {m.paradas}{" "}
                {m.paradas === 1 ? "oportunidade parada" : "oportunidades paradas"}
              </p>
            </div>
            <p
              className={`mt-1 text-xs ${
                m.paradas > 0 ? "text-amber-700" : "text-navy-700 dark:text-gibelo-cinza-quente"
              }`}
            >
              Sem atualização há mais de 14 dias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
