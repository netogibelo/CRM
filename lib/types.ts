// Modelo de dados central do CRM de funil de vendas da Gibelo Engenharia.
//
// Origens, etapas e clientes são entidades cadastráveis (persistidas), não mais
// constantes hardcoded. Os deals referenciam clientes/origens/etapas por id.

// ─────────────────────────────────────────────────────────────────────────────
// Cliente
// ─────────────────────────────────────────────────────────────────────────────
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Marca registros vindos do seed de exemplo. */
  exemplo?: boolean;
}
export type ClienteInput = Omit<Cliente, "id" | "criadoEm" | "atualizadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Origem (cadastrável)
// ─────────────────────────────────────────────────────────────────────────────
export interface Origem {
  id: string;
  nome: string;
}
export type OrigemInput = Omit<Origem, "id">;

// ─────────────────────────────────────────────────────────────────────────────
// Etapa do funil (cadastrável, com probabilidade editável e ordem)
// ─────────────────────────────────────────────────────────────────────────────
export interface Etapa {
  id: string;
  nome: string;
  /** Probabilidade de fechamento (0..1) usada no valor ponderado. */
  probabilidade: number;
  /** Define a ordem das colunas no board e a sequência de conversão. */
  ordem: number;
  /** Etapa de fechamento (negócio ganho). Não vira coluna no board ativo. */
  final?: boolean;
}
export type EtapaInput = Omit<Etapa, "id">;

// ─────────────────────────────────────────────────────────────────────────────
// Deal (oportunidade)
// ─────────────────────────────────────────────────────────────────────────────
export type DealStatus = "aberto" | "ganho" | "perdido";

export interface Deal {
  id: string;
  /** Nome do projeto ou serviço. */
  projeto: string;
  /** Referência ao cliente cadastrado. */
  clienteId: string;
  /** Valor do negócio em reais (BRL). */
  valor: number;
  /** Referência à origem cadastrada. */
  origemId: string;
  /** Previsão de fechamento, data ISO (yyyy-mm-dd). */
  previsaoFechamento: string;
  /** Etapa do funil em que a oportunidade está. */
  etapaId: string;
  status: DealStatus;
  motivoPerda: string | null;
  notas: string;
  criadoEm: string;
  atualizadoEm: string;
  exemplo?: boolean;
}
export type DealInput = Omit<Deal, "id" | "criadoEm" | "atualizadoEm">;

/** Estrutura persistida no localStorage do funil (chave `gibelo-crm-state`). */
export interface CrmState {
  deals: Deal[];
  clientes: Cliente[];
  origens: Origem[];
  etapas: Etapa[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Quadro de atividades (Trello) — persistido em chave separada
// ─────────────────────────────────────────────────────────────────────────────
/** Paleta de cores das listas (colunas) — pinta o cabeçalho. 12 opções. */
export type ListaCor =
  | "gray"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "teal"
  | "pink"
  | "indigo"
  | "cyan"
  | "lime"
  | "fuchsia";

/** Paleta de cores dos cards — pinta a barra lateral esquerda. 12 opções. */
export type CardCor =
  | "slate"
  | "sky"
  | "emerald"
  | "orange"
  | "rose"
  | "violet"
  | "zinc"
  | "blue"
  | "teal"
  | "yellow"
  | "pink"
  | "purple";

export interface AtividadeLista {
  id: string;
  nome: string;
  ordem: number;
  cor: ListaCor;
}
export type AtividadeListaInput = Omit<AtividadeLista, "id">;

export interface AtividadeCard {
  id: string;
  listaId: string;
  titulo: string;
  descricao: string;
  cor: CardCor | null;
  /** Data opcional, ISO (yyyy-mm-dd). */
  data: string | null;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}
export type AtividadeCardInput = Omit<
  AtividadeCard,
  "id" | "criadoEm" | "atualizadoEm"
>;

/** Estrutura persistida no localStorage (chave `gibelo-atividades-state`). */
export interface AtividadesState {
  listas: AtividadeLista[];
  cards: AtividadeCard[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Histórico (timeline) de um deal
// ─────────────────────────────────────────────────────────────────────────────
export type HistoricoTipo =
  | "nota"
  | "mudanca_etapa"
  | "contato"
  | "follow_up";

export interface HistoricoItem {
  id: string;
  dealId: string;
  tipo: HistoricoTipo;
  descricao: string;
  /** Email do autor que registrou (null quando feito por sistema). */
  autorEmail: string | null;
  criadoEm: string;
}
export type HistoricoInput = Omit<HistoricoItem, "id" | "criadoEm">;
