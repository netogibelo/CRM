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
// Contato (pessoa física vinculada a um cliente)
// ─────────────────────────────────────────────────────────────────────────────
export interface Contato {
  id: string;
  clienteId: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  principal: boolean;
  criadoEm: string;
}
export type ContatoInput = Omit<Contato, "id" | "criadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Origem (cadastrável)
// ─────────────────────────────────────────────────────────────────────────────
export interface Origem {
  id: string;
  nome: string;
  /** Ordem manual (DnD ou A→Z). Default 0. */
  ordem: number;
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

/** Tipos de obra padrão para projetos de engenharia civil da Gibelo. */
export type TipoObra =
  | "residencial_unifamiliar"
  | "residencial_multifamiliar"
  | "comercial"
  | "industrial"
  | "reforma"
  | "outro";

export interface Deal {
  id: string;
  /** Nome do projeto ou serviço. */
  projeto: string;
  /** Referência ao cliente cadastrado. */
  clienteId: string;
  /** Referência opcional a um contato (pessoa) do cliente. */
  contatoId?: string | null;
  /** Valor do negócio em reais (BRL). */
  valor: number;
  /** Referência à origem cadastrada. */
  origemId: string;
  /**
   * Data do próximo retorno ao cliente (yyyy-mm-dd).
   *
   * NOTA: a coluna no banco continua `previsao_fechamento` por minimizar impacto
   * da migração — só o label visível mudou para "Próximo retorno".
   */
  previsaoFechamento: string;
  /** Etapa do funil em que a oportunidade está. */
  etapaId: string;
  status: DealStatus;
  motivoPerda: string | null;
  notas: string;
  /** Email do membro da equipe responsável por esse deal. */
  responsavelEmail?: string | null;
  /** Dados específicos do projeto de engenharia (Gibelo). */
  areaProjeto?: number | null;
  tipoObra?: TipoObra | null;
  cidadeObra?: string;
  condominio?: string;
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

/** Período de recorrência (F4). "nunca" = card não-recorrente. */
export type Recorrencia = "nunca" | "diaria" | "semanal" | "quinzenal" | "mensal";

export interface AtividadeCard {
  id: string;
  listaId: string;
  titulo: string;
  descricao: string;
  cor: CardCor | null;
  /**
   * Data opcional, ISO (yyyy-mm-dd). DEPRECATED: substituído por
   * `dataVencimento`. Mantido para compatibilidade até migração completa.
   */
  data: string | null;
  ordem: number;
  /** Campos personalizados (F3) — opcionais, contexto de engenharia. */
  valorEstimado: number | null;
  fornecedor: string;
  numeroNF: string;
  metragem: number | null;
  /** Datas e recorrência (F4). */
  dataInicio: string | null;
  dataVencimento: string | null;
  /** Hora de vencimento (HH:mm). */
  horaVencimento: string;
  recorrencia: Recorrencia;
  concluidaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
export type AtividadeCardInput = Omit<
  AtividadeCard,
  "id" | "criadoEm" | "atualizadoEm"
>;

// ─────────────────────────────────────────────────────────────────────────────
// Histórico (feed de auditoria) de cards de atividade (F6) — append-only
// ─────────────────────────────────────────────────────────────────────────────
export type AtividadeHistoricoTipo =
  | "criacao"
  | "movimentacao"
  | "conclusao"
  | "reabertura"
  | "edicao"
  | "comentario"
  | "checklist"
  | "etiqueta";

export interface AtividadeHistoricoItem {
  id: string;
  cardId: string;
  autorEmail: string | null;
  tipo: AtividadeHistoricoTipo;
  descricao: string;
  criadoEm: string;
}
export type AtividadeHistoricoInput = {
  cardId: string;
  autorEmail: string | null;
  tipo: AtividadeHistoricoTipo;
  descricao: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Comentários em cards de atividade (F5)
// ─────────────────────────────────────────────────────────────────────────────
export interface AtividadeComentario {
  id: string;
  cardId: string;
  autorEmail: string;
  texto: string;
  criadoEm: string;
  editadoEm: string | null;
}
export type AtividadeComentarioInput = {
  cardId: string;
  autorEmail: string;
  texto: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Etiquetas de card de atividade (com cor hex, configuráveis)
// ─────────────────────────────────────────────────────────────────────────────
export interface AtividadeEtiqueta {
  id: string;
  nome: string;
  /** Cor em hexadecimal (#RRGGBB). */
  cor: string;
  ordem: number;
  criadoEm: string;
}
export type AtividadeEtiquetaInput = Omit<AtividadeEtiqueta, "id" | "criadoEm">;

/** Vínculo N:N entre cards e etiquetas. */
export interface AtividadeCardEtiqueta {
  cardId: string;
  etiquetaId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist (subtarefas) de um card de atividade
// ─────────────────────────────────────────────────────────────────────────────
export interface AtividadeChecklistItem {
  id: string;
  cardId: string;
  titulo: string;
  concluida: boolean;
  ordem: number;
  criadoEm: string;
}
export type AtividadeChecklistInput = Omit<
  AtividadeChecklistItem,
  "id" | "criadoEm"
>;

/** Estrutura persistida no localStorage (chave `gibelo-atividades-state`). */
export interface AtividadesState {
  listas: AtividadeLista[];
  cards: AtividadeCard[];
  checklist: AtividadeChecklistItem[];
  etiquetas: AtividadeEtiqueta[];
  cardEtiquetas: AtividadeCardEtiqueta[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Tarefa agendada (com prazo, por deal, atribuível a um responsável)
// ─────────────────────────────────────────────────────────────────────────────
export interface Tarefa {
  id: string;
  dealId: string;
  titulo: string;
  descricao: string;
  responsavelEmail: string | null;
  /** Data de vencimento (yyyy-mm-dd). */
  dataVencimento: string;
  concluida: boolean;
  concluidaEm: string | null;
  criadoEm: string;
}
export type TarefaInput = Omit<Tarefa, "id" | "criadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Automação (gatilho → ação)
// ─────────────────────────────────────────────────────────────────────────────
export type AutomacaoGatilho = "deal_entra_etapa" | "deal_criado";
export type AutomacaoAcao = "criar_tarefa" | "registrar_nota";

export interface ConfigCriarTarefa {
  /** id da etapa que dispara — só usado quando gatilho é deal_entra_etapa. */
  etapaId?: string;
  tituloTarefa: string;
  prazoEmDias: number;
  /** "mesmo_do_deal" copia o responsável do deal; ou email específico. */
  responsavel: string;
}

export interface ConfigRegistrarNota {
  etapaId?: string;
  texto: string;
}

export interface Automacao {
  id: string;
  nome: string;
  gatilho: AutomacaoGatilho;
  acao: AutomacaoAcao;
  /** Configuração tipada por ação. */
  configuracao: ConfigCriarTarefa | ConfigRegistrarNota | Record<string, unknown>;
  ativa: boolean;
  ordem: number;
  criadoEm: string;
}
export type AutomacaoInput = Omit<Automacao, "id" | "criadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Perfil (nome de exibição configurável por usuário)
// ─────────────────────────────────────────────────────────────────────────────
export interface Perfil {
  /** auth.uid() do usuário Supabase. */
  id: string;
  nomeExibicao: string;
  email: string;
  criadoEm: string;
  atualizadoEm: string;
}
export type PerfilInput = {
  id: string;
  nomeExibicao: string;
  email: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Item de serviço de um deal — permite N serviços por oportunidade.
// Quando há ao menos um item, o valor do deal = soma dos itens (UI calcula).
// ─────────────────────────────────────────────────────────────────────────────
export interface DealServico {
  id: string;
  dealId: string;
  descricao: string;
  valor: number;
  ordem: number;
  criadoEm: string;
}
export type DealServicoInput = Omit<DealServico, "id" | "criadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Tipo de serviço (catálogo configurável de sugestões para DealServicos)
// ─────────────────────────────────────────────────────────────────────────────
export interface TipoServico {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
}
export type TipoServicoInput = Omit<TipoServico, "id" | "criadoEm">;

// ─────────────────────────────────────────────────────────────────────────────
// Meta mensal de vendas (valor fechado em R$)
// ─────────────────────────────────────────────────────────────────────────────
export interface Meta {
  id: string;
  /** Mês no formato YYYY-MM. Único na tabela. */
  mes: string;
  valorMeta: number;
  criadoEm: string;
  atualizadoEm: string;
}
export type MetaInput = {
  mes: string;
  valorMeta: number;
};
