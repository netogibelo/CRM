"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useClients,
  useContatos,
  useDeals,
  useOrigins,
  usePerfis,
  useServicos,
  useStages,
} from "@/lib/crm-store";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import { ordenarEtapas } from "@/lib/stages";
import type { Deal } from "@/lib/types";
import { exportarExcel, exportarPDF } from "@/lib/export";
import { MetaMesCard } from "./MetaMesCard";

type Periodo = "7d" | "30d" | "90d" | "ano";

const PERIODOS: { id: Periodo; label: string; dias: number }[] = [
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "90d", label: "90 dias", dias: 90 },
  { id: "ano", label: "12 meses", dias: 365 },
];

// ── Paleta Gibelo profissional + vibrante ────────────────────────────────────
const NAVY_900 = "#00385C"; // Azul Profundo · Pantone 302C · Gibelo Construtora
const NAVY_500 = "#4f6f93";
const ROYAL = "#2563eb"; // azul royal (linha temporal)
const TEAL = "#0d9488"; // teal escuro
const EMERALD = "#10b981"; // verde esmeralda
const AMBER = "#f59e0b"; // âmbar
const CORAL = "#f43f5e"; // vermelho coral
const SLATE = "#94a3b8"; // cinza (em andamento)
const INDIGO = "#6366f1";
const CYAN = "#06b6d4";
const ROSE = "#fb7185";

/** Funil: gradiente navy → teal → emerald → amber, ressaltando progressão. */
const PALETA_FUNIL = [NAVY_900, TEAL, EMERALD, AMBER, "#fbbf24"];

/** Etapas (valor em pipeline): paleta distinta por etapa. */
const PALETA_ETAPAS = [INDIGO, CYAN, AMBER, ROSE, EMERALD, NAVY_500];

/** Ranking top origens: degradê do mais escuro pro mais claro. */
const PALETA_RANKING = [
  "#7c2d12", // escuro
  "#b45309",
  AMBER,
  "#fcd34d",
  "#fef3c7", // claro
];

function dentroDoPeriodo(iso: string, diasJanela: number): boolean {
  const corte = Date.now() - diasJanela * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= corte;
}

function diasEntre(inicio: string, fim: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(fim).getTime() - new Date(inicio).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

function granularidade(dias: number): "dia" | "semana" | "mes" {
  if (dias <= 14) return "dia";
  if (dias <= 90) return "semana";
  return "mes";
}

function bucketLabel(iso: string, gran: "dia" | "semana" | "mes"): string {
  const d = new Date(iso);
  if (gran === "dia") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  if (gran === "semana") {
    const semana = new Date(d);
    const dia = semana.getDay();
    semana.setDate(semana.getDate() - dia);
    return semana.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
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

function ChartCard({
  titulo,
  detalhe,
  children,
  altura = 260,
}: {
  titulo: string;
  detalhe?: string;
  children: React.ReactNode;
  altura?: number;
}) {
  return (
    <div className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">{titulo}</h3>
        {detalhe && (
          <span className="text-xs text-navy-700 dark:text-gibelo-cinza-quente">{detalhe}</span>
        )}
      </div>
      <div style={{ width: "100%", height: altura }}>{children}</div>
    </div>
  );
}

export function DashboardView() {
  const { deals } = useDeals();
  const { etapas } = useStages();
  const { origens } = useOrigins();
  const { clientes } = useClients();
  const { contatos } = useContatos();
  const { servicos } = useServicos();
  const { perfis } = usePerfis();
  const [periodoId, setPeriodoId] = useState<Periodo>("30d");

  const periodo =
    PERIODOS.find((p) => p.id === periodoId) ?? PERIODOS[1];

  const dealsPeriodo = useMemo(
    () => deals.filter((d) => dentroDoPeriodo(d.criadoEm, periodo.dias)),
    [deals, periodo.dias],
  );

  // ── Métricas (cards) ─────────────────────────────────────────────────────
  const totalNaMesa = useMemo(
    () =>
      deals
        .filter((d) => d.status === "aberto")
        .reduce((acc, d) => acc + d.valor, 0),
    [deals],
  );
  const valorPonderado = useMemo(() => {
    const probMap = new Map(etapas.map((e) => [e.id, e.probabilidade]));
    return deals
      .filter((d) => d.status === "aberto")
      .reduce((acc, d) => acc + d.valor * (probMap.get(d.etapaId) ?? 0), 0);
  }, [deals, etapas]);
  const ganhosPeriodo = dealsPeriodo.filter((d) => d.status === "ganho");
  const ticketMedio =
    ganhosPeriodo.length > 0
      ? ganhosPeriodo.reduce((a, d) => a + d.valor, 0) / ganhosPeriodo.length
      : 0;
  const tempoMedioFechamento = useMemo(() => {
    if (ganhosPeriodo.length === 0) return 0;
    const totalDias = ganhosPeriodo.reduce(
      (acc, d) => acc + diasEntre(d.criadoEm, d.atualizadoEm),
      0,
    );
    return Math.round(totalDias / ganhosPeriodo.length);
  }, [ganhosPeriodo]);

  // ── Funil: quantidade de deals por etapa (sem etapa final) ──────────────
  const dadosFunil = useMemo(() => {
    const ordenadas = ordenarEtapas(etapas).filter((e) => !e.final);
    return ordenadas.map((e, i) => ({
      etapa: e.nome,
      qtd: deals.filter(
        (d) => d.etapaId === e.id && d.status === "aberto",
      ).length,
      cor: PALETA_FUNIL[i % PALETA_FUNIL.length],
    }));
  }, [deals, etapas]);

  // ── Evolução temporal: deals criados por bucket ─────────────────────────
  const dadosEvolucao = useMemo(() => {
    const gran = granularidade(periodo.dias);
    const map = new Map<string, number>();
    for (const d of dealsPeriodo) {
      const label = bucketLabel(d.criadoEm, gran);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, qtd]) => ({ label, qtd }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [dealsPeriodo, periodo.dias]);

  // ── Taxa de fechamento: ganhos / perdidos / em andamento ───────────────
  const ganhosQtd = ganhosPeriodo.length;
  const perdidosQtd = dealsPeriodo.filter((d) => d.status === "perdido").length;
  const abertosNoPeriodo = dealsPeriodo.filter(
    (d) => d.status === "aberto",
  ).length;
  const dadosFechamento = useMemo(() => {
    return [
      { nome: "Ganhos", valor: ganhosQtd, cor: EMERALD },
      { nome: "Perdidos", valor: perdidosQtd, cor: CORAL },
      { nome: "Em andamento", valor: abertosNoPeriodo, cor: SLATE },
    ].filter((d) => d.valor > 0);
  }, [ganhosQtd, perdidosQtd, abertosNoPeriodo]);
  const taxaFechamento =
    ganhosQtd + perdidosQtd > 0
      ? Math.round((ganhosQtd / (ganhosQtd + perdidosQtd)) * 100)
      : 0;

  // ── Valor em pipeline por etapa (deals abertos) ─────────────────────────
  const dadosValorEtapa = useMemo(() => {
    const ordenadas = ordenarEtapas(etapas).filter((e) => !e.final);
    return ordenadas.map((e) => ({
      etapa: e.nome,
      valor: deals
        .filter((d) => d.etapaId === e.id && d.status === "aberto")
        .reduce((a, d) => a + d.valor, 0),
    }));
  }, [deals, etapas]);

  // ── Top origens (por valor de fechamento no período) ────────────────────
  const dadosOrigens = useMemo(() => {
    const ord = origens.map((o) => {
      const valorGanho = ganhosPeriodo
        .filter((d) => d.origemId === o.id)
        .reduce((a, d) => a + d.valor, 0);
      return { origem: o.nome, valor: valorGanho };
    });
    return ord
      .filter((o) => o.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [origens, ganhosPeriodo]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho + filtro de período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy-900 dark:text-gibelo-offwhite">Dashboard</h2>
          <p className="text-xs text-navy-700 dark:text-gibelo-cinza-quente">
            Visão consolidada do funil — período: {periodo.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Período de análise"
            className="inline-flex shrink-0 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-0.5"
          >
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                role="tab"
                type="button"
                aria-selected={periodoId === p.id}
                aria-label={`Período ${p.label}`}
                onClick={() => setPeriodoId(p.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodoId === p.id
                    ? "bg-navy-900 text-white"
                    : "text-navy-700 dark:text-gibelo-areia hover:text-navy-900 dark:text-gibelo-offwhite"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="inline-flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() =>
                exportarExcel({
                  deals,
                  clientes,
                  contatos,
                  origens,
                  etapas,
                  servicos,
                  perfis,
                  periodoLabel: periodo.label,
                  periodoDias: periodo.dias,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-1 text-xs font-semibold text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
              aria-label="Exportar relatório em Excel"
              title="Baixar planilha XLSX com pipeline, fechados, perdidos e serviços"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M8 1v9m0 0L5 7m3 3l3-3M2 13h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                exportarPDF({
                  deals,
                  clientes,
                  contatos,
                  origens,
                  etapas,
                  servicos,
                  perfis,
                  periodoLabel: periodo.label,
                  periodoDias: periodo.dias,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-1 text-xs font-semibold text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
              aria-label="Exportar relatório em PDF"
              title="Gerar relatório imprimível em PDF"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M4 2h6l3 3v9H4V2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 2v3h3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          rotulo="Total na mesa"
          valor={formatBRL(totalNaMesa)}
          detalhe="oportunidades abertas"
          destaque
        />
        <StatCard
          rotulo="Valor ponderado"
          valor={formatBRL(valorPonderado)}
          detalhe="por probabilidade"
        />
        <StatCard
          rotulo="Ticket médio"
          valor={formatBRL(ticketMedio)}
          detalhe={`${ganhosQtd} ${ganhosQtd === 1 ? "ganho" : "ganhos"} no período`}
        />
        <StatCard
          rotulo="Tempo médio"
          valor={`${tempoMedioFechamento}d`}
          detalhe="do lead ao fechamento"
        />
      </div>

      {/* Meta mensal */}
      <MetaMesCard />

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          titulo="Funil de conversão"
          detalhe="abertas por etapa"
          altura={Math.max(220, dadosFunil.length * 44 + 40)}
        >
          {dadosFunil.length === 0 || dadosFunil.every((d) => d.qtd === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={dadosFunil}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e9f1" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke={NAVY_500}
                  fontSize={11}
                />
                <YAxis
                  type="category"
                  dataKey="etapa"
                  stroke={NAVY_500}
                  fontSize={11}
                  width={110}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v)} oportunidade(s)`, "Qtd"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="qtd" radius={[0, 6, 6, 0]}>
                  {dadosFunil.map((d, i) => (
                    <Cell key={i} fill={d.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          titulo="Evolução temporal"
          detalhe="leads criados"
        >
          {dadosEvolucao.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <AreaChart
                data={dadosEvolucao}
                margin={{ top: 8, right: 16, left: -16, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="gradEvolucao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ROYAL} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ROYAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e9f1" />
                <XAxis
                  dataKey="label"
                  stroke={NAVY_500}
                  fontSize={11}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={NAVY_500}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v)} novos`, "Qtd"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="qtd"
                  stroke={ROYAL}
                  strokeWidth={2.5}
                  fill="url(#gradEvolucao)"
                  dot={{ fill: ROYAL, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Gráficos linha 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          titulo="Taxa de fechamento"
          detalhe={`${taxaFechamento}% no período`}
        >
          {dadosFechamento.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dadosFechamento}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {dadosFechamento.map((d, i) => (
                    <Cell key={i} fill={d.cor} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${Number(v)}`, String(n ?? "")]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          titulo="Valor em pipeline por etapa"
          detalhe="oportunidades abertas"
          altura={260}
        >
          {dadosValorEtapa.every((d) => d.valor === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={dadosValorEtapa}
                margin={{ top: 8, right: 8, left: -8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e9f1" />
                <XAxis
                  dataKey="etapa"
                  stroke={NAVY_500}
                  fontSize={10}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  stroke={NAVY_500}
                  fontSize={11}
                  tickFormatter={(v) => formatBRLCompact(Number(v))}
                />
                <Tooltip
                  formatter={(v) => [formatBRL(Number(v)), "Valor"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {dadosValorEtapa.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PALETA_ETAPAS[i % PALETA_ETAPAS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          titulo="Top origens"
          detalhe="por valor fechado"
          altura={260}
        >
          {dadosOrigens.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={dadosOrigens}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e9f1" />
                <XAxis
                  type="number"
                  stroke={NAVY_500}
                  fontSize={10}
                  tickFormatter={(v) => formatBRLCompact(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="origem"
                  stroke={NAVY_500}
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  formatter={(v) => [formatBRL(Number(v)), "Valor ganho"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {dadosOrigens.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PALETA_RANKING[i % PALETA_RANKING.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-navy-500 dark:text-gibelo-cinza-quente">
      Sem dados no período.
    </div>
  );
}
