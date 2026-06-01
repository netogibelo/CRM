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
 * Subitens do flyout de Configurações. O `id` vira a âncora
 * `id="cfg-<id>"` nas seções de ConfiguracoesView (scroll-to-section).
 * Ordem segue o brief; "Alertas por email" entra como último para não
 * deixar a seção real sem entrada no flyout.
 */
export interface ConfigSecao {
  id: string;
  label: string;
}

export const CONFIG_SECOES: ConfigSecao[] = [
  { id: "origens", label: "Origens" },
  { id: "etapas", label: "Etapas do funil" },
  { id: "tipos-servico", label: "Tipos de serviço" },
  { id: "automacoes", label: "Automações" },
  { id: "templates-atividade", label: "Templates de atividade" },
  { id: "etiquetas-atividade", label: "Etiquetas de atividade" },
  { id: "equipe", label: "Equipe" },
  { id: "alertas", label: "Alertas por email" },
];

/** Prefixo da âncora DOM de cada seção de Configurações. */
export const configAnchorId = (id: string) => `cfg-${id}`;
