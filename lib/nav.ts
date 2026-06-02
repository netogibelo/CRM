/**
 * Modelo de navegação do CRM — extraído de app/(app)/page.tsx para ser
 * compartilhado entre o rail lateral, o drawer mobile e o tab switcher.
 *
 * A navegação continua sendo estado React in-page (ver lib/nav-store.tsx),
 * não rotas — preserva os dynamic imports (Dashboard/Atividades) e o guard
 * de carregamento do page.
 */

export type Aba =
  | "dashboard"
  | "funil"
  | "atividades"
  | "clientes"
  | "config"
  | "historico";

/** Rótulo acessível de cada seção (usado em aria-label do conteúdo). */
export const ABA_LABEL: Record<Aba, string> = {
  dashboard: "Dashboard",
  funil: "Funil",
  atividades: "Atividades",
  clientes: "Clientes",
  config: "Configurações",
  historico: "Histórico",
};

/**
 * Subitens de Configurações. Cada `id` é a chave da subpágina ativa
 * (ver `subpaginaConfig` em lib/nav-store.tsx) e dirige o que ConfiguracoesView
 * renderiza. O `label` aparece no flyout do rail, no drawer mobile, no
 * breadcrumb e no card da tela inicial; `descricao` só na tela inicial.
 *
 * Ordem: alfabética por `label` (pt-BR) — espelhada no flyout, no drawer e na
 * grade de cards da tela inicial.
 */
export interface ConfigSecao {
  id: string;
  label: string;
  descricao: string;
}

export const CONFIG_SECOES: ConfigSecao[] = [
  {
    id: "alertas",
    label: "Alertas por email",
    descricao: "Resumo diário enviado por email.",
  },
  {
    id: "automacoes",
    label: "Automações",
    descricao: "Regras que disparam ações nos deals.",
  },
  {
    id: "equipe",
    label: "Equipe",
    descricao: "Membros e nomes de exibição.",
  },
  {
    id: "etapas",
    label: "Etapas do funil",
    descricao: "Colunas, probabilidade e ordem.",
  },
  {
    id: "etiquetas-atividade",
    label: "Etiquetas de atividade",
    descricao: "Cores e rótulos das atividades.",
  },
  {
    id: "origens",
    label: "Origens",
    descricao: "De onde vêm as oportunidades.",
  },
  {
    id: "templates-atividade",
    label: "Templates de atividade",
    descricao: "Modelos reutilizáveis de atividades.",
  },
  {
    id: "tipos-servico",
    label: "Tipos de serviço",
    descricao: "Sugestões de serviço nos deals.",
  },
];
