"use client";

import dynamic from "next/dynamic";
import { useDeals } from "@/lib/crm-store";
import { useNav } from "@/lib/nav-store";
import { FunilView } from "@/components/FunilView";
import { ClientesView } from "@/components/ClientesView";
import { ConfiguracoesView } from "@/components/ConfiguracoesView";
import { HistoricoView } from "@/components/HistoricoView";

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

export default function HomePage() {
  const { carregando } = useDeals();
  const { aba } = useNav();

  // Atividades tem seu próprio store/carregamento; não bloqueia no gate do CRM.
  if (carregando && aba !== "atividades") {
    return <PlaceholderCarregando />;
  }

  return (
    <>
      {aba === "dashboard" && <DashboardView />}
      {aba === "funil" && <FunilView />}
      {aba === "atividades" && <AtividadesView />}
      {aba === "clientes" && <ClientesView />}
      {aba === "config" && <ConfiguracoesView />}
      {aba === "historico" && <HistoricoView />}
    </>
  );
}
