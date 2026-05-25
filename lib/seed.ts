// Dados-semente (primeiro uso) e migração leve de estados antigos.

import type {
  AtividadesState,
  Cliente,
  CrmState,
  Deal,
  Etapa,
  Origem,
} from "./types";

const DIA = 24 * 60 * 60 * 1000;
const iso = (offsetDias: number) =>
  new Date(Date.now() - offsetDias * DIA).toISOString();
const dataFutura = (offsetDias: number) =>
  new Date(Date.now() + offsetDias * DIA).toISOString().slice(0, 10);

function novoId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults (também usados pela migração quando faltam coleções)
// ─────────────────────────────────────────────────────────────────────────────
export function defaultOrigens(): Origem[] {
  return [
    { id: "og-indicacao", nome: "Indicação de cliente" },
    { id: "og-arquiteto", nome: "Arquiteto parceiro" },
    { id: "og-vizinho", nome: "Vizinho / condomínio" },
    { id: "og-site", nome: "Site / Instagram" },
    { id: "og-outro", nome: "Outro" },
  ];
}

export function defaultEtapas(): Etapa[] {
  return [
    { id: "lead", nome: "Lead / Atração", probabilidade: 0.1, ordem: 0 },
    {
      id: "qualificado",
      nome: "Contato qualificado",
      probabilidade: 0.25,
      ordem: 1,
    },
    { id: "proposta", nome: "Proposta enviada", probabilidade: 0.5, ordem: 2 },
    { id: "negociacao", nome: "Negociação", probabilidade: 0.75, ordem: 3 },
    {
      id: "fechado",
      nome: "Fechado (ganho)",
      probabilidade: 1,
      ordem: 4,
      final: true,
    },
  ];
}

function exemploClientes(): Cliente[] {
  const c = iso(30);
  return [
    {
      id: "cli-andrade",
      nome: "Família Andrade",
      telefone: "(11) 98888-1010",
      email: "contato@familiaandrade.com",
      observacoes: "Indicada pelo escritório de arquitetura parceiro.",
      criadoEm: c,
      atualizadoEm: c,
      exemplo: true,
    },
    {
      id: "cli-tavares",
      nome: "Marcos Tavares",
      telefone: "(11) 97777-2020",
      email: "marcos.tavares@email.com",
      observacoes: "",
      criadoEm: c,
      atualizadoEm: c,
      exemplo: true,
    },
    {
      id: "cli-serra",
      nome: "Condomínio Serra Azul",
      telefone: "(11) 96666-3030",
      email: "sindico@serraazul.com",
      observacoes: "Contato via síndico.",
      criadoEm: c,
      atualizadoEm: c,
      exemplo: true,
    },
  ];
}

function exemploDeals(): Deal[] {
  return [
    {
      id: "exemplo-1",
      projeto: "Residência Alphaville — projeto completo",
      clienteId: "cli-andrade",
      valor: 480000,
      origemId: "og-arquiteto",
      previsaoFechamento: dataFutura(40),
      etapaId: "proposta",
      status: "aberto",
      motivoPerda: null,
      notas: "Proposta enviada com 3 opções de acabamento. Aguardando retorno.",
      criadoEm: iso(22),
      atualizadoEm: iso(18), // > 14 dias → aparece como parado
      exemplo: true,
    },
    {
      id: "exemplo-2",
      projeto: "Cobertura duplex — reforma estrutural",
      clienteId: "cli-tavares",
      valor: 265000,
      origemId: "og-indicacao",
      previsaoFechamento: dataFutura(20),
      etapaId: "negociacao",
      status: "aberto",
      motivoPerda: null,
      notas: "Cliente pediu ajuste no cronograma. Revisar escopo de fundação.",
      criadoEm: iso(12),
      atualizadoEm: iso(3),
      exemplo: true,
    },
    {
      id: "exemplo-3",
      projeto: "Casa de campo — anteprojeto",
      clienteId: "cli-serra",
      valor: 95000,
      origemId: "og-vizinho",
      previsaoFechamento: dataFutura(60),
      etapaId: "lead",
      status: "aberto",
      motivoPerda: null,
      notas: "Primeiro contato após visita ao condomínio. Qualificar orçamento.",
      criadoEm: iso(5),
      atualizadoEm: iso(2),
      exemplo: true,
    },
  ];
}

/** Estado inicial completo do CRM no primeiro uso. */
export function gerarSeedCrm(): CrmState {
  return {
    deals: exemploDeals(),
    clientes: exemploClientes(),
    origens: defaultOrigens(),
    etapas: defaultEtapas(),
  };
}

/** Listas-semente do quadro de atividades. */
export function gerarSeedAtividades(): AtividadesState {
  return {
    listas: [
      { id: "la-fazer", nome: "A fazer", ordem: 0 },
      { id: "la-andamento", nome: "Em andamento", ordem: 1 },
      { id: "la-concluido", nome: "Concluído", ordem: 2 },
    ],
    cards: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Migração leve de estados antigos
//   - garante coleções (origens/etapas/clientes)
//   - converte deals com `cliente`/`origem` em texto livre para referências por id
// ─────────────────────────────────────────────────────────────────────────────
export function migrarCrm(parsed: unknown): {
  state: CrmState;
  changed: boolean;
} {
  let changed = false;
  const raw = (parsed ?? {}) as Record<string, unknown>;

  const etapas: Etapa[] =
    Array.isArray(raw.etapas) && raw.etapas.length
      ? (raw.etapas as Etapa[])
      : ((changed = true), defaultEtapas());

  const origens: Origem[] =
    Array.isArray(raw.origens) && raw.origens.length
      ? (raw.origens as Origem[])
      : ((changed = true), defaultOrigens());

  const clientes: Cliente[] = Array.isArray(raw.clientes)
    ? (raw.clientes as Cliente[])
    : ((changed = true), []);

  const dealsRaw: Record<string, unknown>[] = Array.isArray(raw.deals)
    ? (raw.deals as Record<string, unknown>[])
    : [];

  const agora = new Date().toISOString();

  const deals: Deal[] = dealsRaw.map((d) => {
    const nd = { ...d } as Record<string, unknown>;

    // Origem em texto livre → referência por id.
    if (!nd.origemId) {
      const nomeOrigem = typeof nd.origem === "string" ? nd.origem.trim() : "";
      if (nomeOrigem) {
        let o = origens.find(
          (x) => x.nome.toLowerCase() === nomeOrigem.toLowerCase(),
        );
        if (!o) {
          o = { id: novoId("og"), nome: nomeOrigem };
          origens.push(o);
        }
        nd.origemId = o.id;
      } else {
        nd.origemId = origens[origens.length - 1]?.id ?? "og-outro";
      }
      delete nd.origem;
      changed = true;
    }

    // Cliente em texto livre → registro de cliente + referência por id.
    if (!nd.clienteId) {
      const nomeCli = typeof nd.cliente === "string" ? nd.cliente.trim() : "";
      const alvo = nomeCli || "Cliente não informado";
      let c = clientes.find(
        (x) => x.nome.toLowerCase() === alvo.toLowerCase(),
      );
      if (!c) {
        c = {
          id: novoId("cli"),
          nome: alvo,
          telefone: "",
          email: "",
          observacoes: "",
          criadoEm: agora,
          atualizadoEm: agora,
        };
        clientes.push(c);
      }
      nd.clienteId = c.id;
      delete nd.cliente;
      changed = true;
    }

    return nd as unknown as Deal;
  });

  return { state: { deals, clientes, origens, etapas }, changed };
}
