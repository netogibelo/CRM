"use client";

import { BarChart2, CheckSquare, Clock, Mail, TrendingUp, Users } from "lucide-react";
import { GibeloLogo } from "@/components/GibeloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificacoesSino } from "@/components/NotificacoesSino";
import { PerfilButton } from "@/components/PerfilButton";
import { useNav } from "@/lib/nav-store";
import { useClients, useDeals } from "@/lib/crm-store";
import { useBoard } from "@/lib/activities-store";
import { RailItem } from "./RailItem";
import { RailFlyout } from "./RailFlyout";

/**
 * Rail lateral vertical persistente (desktop, ≥640px). Fundo permanentemente
 * escuro (#10182D, Preto Tinta da marca) independente do tema. Logo no topo,
 * navegação no meio (icon-only + tooltip + flyout de Configurações), e o
 * cluster tema/notificações/perfil ancorado na base.
 */
export function Rail() {
  const { aba, setAba } = useNav();
  const { deals } = useDeals();
  const { clientes } = useClients();
  const { cards } = useBoard();

  const abertos = deals.filter((d) => d.status === "aberto").length;
  const cardsAbertos = cards.filter((c) => !c.concluidaEm).length;
  const historico = deals.filter((d) => d.status !== "aberto").length;

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-1 bg-gibelo-preto py-3 sm:flex"
    >
      <button
        type="button"
        onClick={() => setAba("dashboard")}
        aria-label="Gibelo Construtora — ir para o Dashboard"
        className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-white/10 focus-visible:outline-gibelo-areia"
      >
        <GibeloLogo width={48} comDescritor={false} corClasse="text-white" />
      </button>

      <div className="mt-2 flex flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
        <RailItem
          Icon={BarChart2}
          label="Dashboard"
          ativo={aba === "dashboard"}
          onClick={() => setAba("dashboard")}
        />
        <RailItem
          Icon={TrendingUp}
          label="Funil"
          badge={abertos}
          ativo={aba === "funil"}
          onClick={() => setAba("funil")}
        />
        <RailItem
          Icon={CheckSquare}
          label="Atividades"
          badge={cardsAbertos}
          ativo={aba === "atividades"}
          onClick={() => setAba("atividades")}
        />
        <RailItem
          Icon={Users}
          label="Clientes"
          badge={clientes.length}
          ativo={aba === "clientes"}
          onClick={() => setAba("clientes")}
        />
        <RailItem Icon={Mail} label="Email" desabilitado tooltip="Em breve" />
        <RailFlyout ativo={aba === "config"} />
        <RailItem
          Icon={Clock}
          label="Histórico"
          badge={historico}
          ativo={aba === "historico"}
          onClick={() => setAba("historico")}
        />
      </div>

      <div className="flex flex-col items-center gap-1 pt-1">
        <NotificacoesSino
          placement="rail"
          onIrParaDeal={() => setAba("funil")}
          onIrParaDashboard={() => setAba("dashboard")}
        />
        <ThemeToggle variant="rail" />
        <PerfilButton placement="rail" />
      </div>
    </nav>
  );
}
