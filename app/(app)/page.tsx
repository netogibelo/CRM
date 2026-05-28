"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useClients, useDeals } from "@/lib/crm-store";
import { FunilView } from "@/components/FunilView";
import { ClientesView } from "@/components/ClientesView";
import { ConfiguracoesView } from "@/components/ConfiguracoesView";
import { HistoricoView } from "@/components/HistoricoView";
import { PerfilButton } from "@/components/PerfilButton";
import { NotificacoesSino } from "@/components/NotificacoesSino";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GibeloLogo } from "@/components/GibeloLogo";

// DashboardView usa Recharts (~250KB de bundle). AtividadesView usa @dnd-kit.
// Carregamos sob demanda — quem entra direto no Funil paga só o JS do Funil,
// melhorando LCP/TBT da abertura do app.
const PlaceholderCarregando = () => (
  <div
    className="py-16 text-center text-sm text-navy-500 dark:text-gibelo-areia"
    role="status"
  >
    Carregando…
  </div>
);

const DashboardView = dynamic(
  () => import("@/components/DashboardView").then((m) => m.DashboardView),
  { loading: PlaceholderCarregando, ssr: false },
);

const AtividadesView = dynamic(
  () => import("@/components/AtividadesView").then((m) => m.AtividadesView),
  { loading: PlaceholderCarregando, ssr: false },
);

type Aba =
  | "dashboard"
  | "funil"
  | "atividades"
  | "clientes"
  | "config"
  | "historico";

interface TabDef {
  id: Aba;
  label: string;
  badge?: number;
}

export default function HomePage() {
  const { deals, carregando } = useDeals();
  const { clientes } = useClients();
  const [aba, setAba] = useState<Aba>("dashboard");

  const abertos = deals.filter((d) => d.status === "aberto").length;
  const historico = deals.filter((d) => d.status !== "aberto").length;

  const tabs: TabDef[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "funil", label: "Funil", badge: abertos },
    { id: "atividades", label: "Atividades" },
    { id: "clientes", label: "Clientes", badge: clientes.length },
    { id: "config", label: "Configurações" },
    { id: "historico", label: "Histórico", badge: historico },
  ];

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-7">
      <header className="flex items-center gap-3">
        <GibeloLogo width={130} className="sm:hidden" comDescritor={false} />
        <GibeloLogo width={160} className="hidden sm:inline-flex" />
        <div className="flex-1 border-l border-navy-200 pl-3 dark:border-dark-border">
          <h1 className="text-lg font-bold tracking-tight text-navy-900 dark:text-gibelo-offwhite sm:text-xl">
            Pipeline de Vendas
          </h1>
          <p className="text-xs text-navy-700 dark:text-gibelo-areia sm:text-sm">
            Obras por taxa de administração a preço de custo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificacoesSino
            onIrParaDeal={() => setAba("funil")}
            onIrParaDashboard={() => setAba("dashboard")}
          />
          <PerfilButton />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Seções do CRM"
        className="scrollbar-board mt-6 flex gap-1 overflow-x-auto border-b border-navy-100 dark:border-dark-border"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={aba === t.id}
            aria-controls={`painel-${t.id}`}
            onClick={() => setAba(t.id)}
            className={`relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              aba === t.id
                ? "border-navy-900 text-navy-900 dark:border-gibelo-areia dark:text-gibelo-offwhite"
                : "border-transparent text-navy-500 hover:text-navy-700 dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
            }`}
          >
            {t.label}
            {typeof t.badge === "number" && (
              <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-xs text-navy-700 dark:bg-dark-elevated dark:text-gibelo-areia">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {carregando && aba !== "atividades" ? (
          <PlaceholderCarregando />
        ) : (
          <div
            id={`painel-${aba}`}
            role="tabpanel"
            aria-labelledby={`tab-${aba}`}
          >
            {aba === "dashboard" && <DashboardView />}
            {aba === "funil" && <FunilView />}
            {aba === "atividades" && <AtividadesView />}
            {aba === "clientes" && <ClientesView />}
            {aba === "config" && <ConfiguracoesView />}
            {aba === "historico" && <HistoricoView />}
          </div>
        )}
      </div>
    </main>
  );
}
