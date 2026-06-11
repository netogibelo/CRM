"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  CheckSquare,
  Clock,
  Mail,
  Menu,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GibeloLogo } from "@/components/GibeloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificacoesSino } from "@/components/NotificacoesSino";
import { PerfilButton } from "@/components/PerfilButton";
import { useNav } from "@/lib/nav-store";
import { useClients, useDeals } from "@/lib/crm-store";
import { useBoard } from "@/lib/activities-store";
import { type Aba } from "@/lib/nav";

interface ItemDef {
  aba: Aba;
  label: string;
  Icon: LucideIcon;
  badge?: number;
}

/**
 * Navegação mobile (≤640px): top bar com hambúrguer + drawer escuro que
 * espelha o rail. Overlay fecha ao clicar fora ou Esc; selecionar um item
 * fecha o drawer. Configurações leva à tela inicial (grade de cards), de onde
 * cada subpágina é aberta.
 */
export function MobileNav() {
  const { aba, setAba, irParaConfig } = useNav();
  const { deals } = useDeals();
  const { clientes } = useClients();
  const { cards } = useBoard();
  const [aberto, setAberto] = useState(false);
  const hamburguerRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const abertos = deals.filter((d) => d.status === "aberto").length;
  const cardsAbertos = cards.filter((c) => !c.concluidaEm).length;
  const historico = deals.filter((d) => d.status !== "aberto").length;

  const itensTopo: ItemDef[] = [
    { aba: "dashboard", label: "Dashboard", Icon: BarChart2 },
    { aba: "funil", label: "Funil", Icon: TrendingUp, badge: abertos },
    { aba: "atividades", label: "Atividades", Icon: CheckSquare, badge: cardsAbertos },
    { aba: "clientes", label: "Clientes", Icon: Users, badge: clientes.length },
  ];

  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        hamburguerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const t = requestAnimationFrame(() =>
      painelRef.current?.querySelector<HTMLElement>("button, a")?.focus(),
    );
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(t);
    };
  }, [aberto]);

  function navegar(a: Aba) {
    setAba(a);
    setAberto(false);
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-navy-100 bg-white px-3 transition-colors dark:border-dark-border dark:bg-dark-surface sm:hidden">
        <button
          ref={hamburguerRef}
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={aberto}
          aria-haspopup="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <GibeloLogo width={120} comDescritor={false} className="flex-1" />
        <NotificacoesSino
          onIrParaDeal={() => setAba("funil")}
          onIrParaDashboard={() => setAba("dashboard")}
          onIrParaAtividades={() => setAba("atividades")}
        />
        <ThemeToggle />
        <PerfilButton />
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />
          <div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal"
            className="absolute inset-y-0 left-0 flex w-[80vw] max-w-[300px] flex-col bg-gibelo-preto text-white shadow-card-hover"
          >
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <GibeloLogo width={120} comDescritor={false} corClasse="text-white" />
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  hamburguerRef.current?.focus();
                }}
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-gibelo-areia"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Seções"
              className="flex-1 overflow-y-auto py-2"
            >
              {itensTopo.map((it) => (
                <DrawerLinha
                  key={it.aba}
                  Icon={it.Icon}
                  label={it.label}
                  badge={it.badge}
                  ativo={aba === it.aba}
                  onClick={() => navegar(it.aba)}
                />
              ))}

              <DrawerLinha Icon={Mail} label="Email" desabilitado tooltip="Em breve" />

              <DrawerLinha
                Icon={Settings}
                label="Configurações"
                ativo={aba === "config"}
                onClick={() => {
                  irParaConfig();
                  setAberto(false);
                }}
              />

              <DrawerLinha
                Icon={Clock}
                label="Histórico"
                badge={historico}
                ativo={aba === "historico"}
                onClick={() => navegar("historico")}
              />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerLinha({
  Icon,
  label,
  badge,
  ativo = false,
  onClick,
  desabilitado = false,
  tooltip,
}: {
  Icon: LucideIcon;
  label: string;
  badge?: number;
  ativo?: boolean;
  onClick?: () => void;
  desabilitado?: boolean;
  tooltip?: string;
}) {
  const temBadge = typeof badge === "number" && badge > 0 && !desabilitado;
  return (
    <button
      type="button"
      onClick={desabilitado ? undefined : onClick}
      aria-disabled={desabilitado || undefined}
      aria-current={ativo ? "page" : undefined}
      tabIndex={desabilitado ? -1 : 0}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-gibelo-areia focus-visible:-outline-offset-2 ${
        desabilitado
          ? "cursor-not-allowed text-white/30"
          : ativo
            ? "bg-navy-900 text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {temBadge && (
        <span className="rounded-full bg-gibelo-areia px-1.5 text-xs font-bold text-navy-900">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {desabilitado && tooltip && (
        <span className="text-[11px] uppercase tracking-wide text-white/40">
          {tooltip}
        </span>
      )}
    </button>
  );
}
