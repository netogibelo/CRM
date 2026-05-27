"use client";

import { useState } from "react";
import { useClients, useDeals } from "@/lib/crm-store";
import { DashboardView } from "@/components/DashboardView";
import { FunilView } from "@/components/FunilView";
import { AtividadesView } from "@/components/AtividadesView";
import { ClientesView } from "@/components/ClientesView";
import { ConfiguracoesView } from "@/components/ConfiguracoesView";
import { HistoricoView } from "@/components/HistoricoView";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificacoesSino } from "@/components/NotificacoesSino";

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
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white"
          aria-hidden="true"
        >
          GE
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight text-navy-900 sm:text-xl">
            Pipeline de Vendas
          </h1>
          <p className="text-xs text-navy-400 sm:text-sm">
            Gibelo Engenharia — oportunidades de projetos de alto padrão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificacoesSino onIrParaDeal={() => setAba("funil")} />
          <LogoutButton />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Seções do CRM"
        className="scrollbar-board mt-6 flex gap-1 overflow-x-auto border-b border-navy-100"
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
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-navy-400 hover:text-navy-700"
            }`}
          >
            {t.label}
            {typeof t.badge === "number" && (
              <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-xs text-navy-600">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {carregando && aba !== "atividades" ? (
          <div
            className="py-16 text-center text-sm text-navy-400"
            role="status"
          >
            Carregando…
          </div>
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
