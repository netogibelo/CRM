// Camada de acesso a dados. TODA leitura/escrita do CRM passa por aqui.
//
// A UI nunca toca no storage diretamente — consome os hooks (crm-store /
// activities-store), que por sua vez usam estes repositórios.
//
// Para migrar para Supabase no futuro: crie implementações
// `Supabase*Repository implements *Repository` e troque o bloco de
// instanciação no final deste arquivo. Nenhum componente precisa mudar.

import type {
  AtividadeCard,
  AtividadeCardEtiqueta,
  AtividadeCardInput,
  AtividadeChecklistInput,
  AtividadeChecklistItem,
  AtividadeComentario,
  AtividadeComentarioInput,
  AtividadeHistoricoInput,
  AtividadeHistoricoItem,
  AtividadeEtiqueta,
  AtividadeEtiquetaInput,
  AtividadeLista,
  AtividadeListaInput,
  AtividadesState,
  Automacao,
  Contato,
  ContatoInput,
  AutomacaoAcao,
  AutomacaoGatilho,
  AutomacaoInput,
  Cliente,
  ClienteInput,
  CrmState,
  Deal,
  DealInput,
  DealServico,
  DealServicoInput,
  TipoServico,
  TipoServicoInput,
  DealStatus,
  Etapa,
  EtapaInput,
  HistoricoInput,
  HistoricoItem,
  HistoricoTipo,
  Meta,
  MetaInput,
  Origem,
  OrigemInput,
  Perfil,
  PerfilInput,
  Tarefa,
  TarefaInput,
  TipoObra,
} from "./types";
import {
  gerarSeedAtividades,
  gerarSeedCrm,
  migrarAtividades,
  migrarCrm,
} from "./seed";
import { agoraISO, novoId } from "./id";

export const CRM_STORAGE_KEY = "gibelo-crm-state";
export const ATIVIDADES_STORAGE_KEY = "gibelo-atividades-state";

// ─────────────────────────────────────────────────────────────────────────────
// Store de baixo nível do CRM (deals, clientes, origens, etapas)
// ─────────────────────────────────────────────────────────────────────────────
function emptyCrm(): CrmState {
  return { deals: [], clientes: [], origens: [], etapas: [] };
}

function writeCrm(state: CrmState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(state));
}

function readCrm(): CrmState {
  if (typeof window === "undefined") return emptyCrm();
  const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
  if (!raw) {
    const seeded = gerarSeedCrm();
    writeCrm(seeded);
    return seeded;
  }
  try {
    const { state, changed } = migrarCrm(JSON.parse(raw));
    if (changed) writeCrm(state);
    return state;
  } catch {
    const seeded = gerarSeedCrm();
    writeCrm(seeded);
    return seeded;
  }
}

/** Lê todas as coleções do CRM de uma vez, pelos repositórios ativos.
 *
 * Compõe o snapshot a partir das instâncias exportadas no final do arquivo
 * (o "ponto único de troca"), então segue automaticamente a implementação em
 * uso — hoje Supabase. As referências aos repositórios são resolvidas em tempo
 * de execução (a função só é chamada depois do módulo já avaliado). */
export async function loadCrmSnapshot(): Promise<CrmState> {
  const [deals, clientes, origens, etapas] = await Promise.all([
    dealRepository.listAll(),
    clientRepository.listAll(),
    originRepository.listAll(),
    stageRepository.listAll(),
  ]);
  return { deals, clientes, origens, etapas };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces dos repositórios
// ─────────────────────────────────────────────────────────────────────────────
export interface DealRepository {
  listAll(): Promise<Deal[]>;
  create(input: DealInput): Promise<Deal>;
  update(id: string, patch: Partial<DealInput>): Promise<Deal>;
  remove(id: string): Promise<void>;
}

export interface ClientRepository {
  listAll(): Promise<Cliente[]>;
  create(input: ClienteInput): Promise<Cliente>;
  update(id: string, patch: Partial<ClienteInput>): Promise<Cliente>;
  remove(id: string): Promise<void>;
}

export interface OriginRepository {
  listAll(): Promise<Origem[]>;
  create(input: OrigemInput): Promise<Origem>;
  update(id: string, patch: Partial<OrigemInput>): Promise<Origem>;
  remove(id: string): Promise<void>;
  /** Persiste a ordem para um array de ids — índice no array = nova ordem. */
  reorder(idsOrdenados: string[]): Promise<void>;
}

export interface StageRepository {
  listAll(): Promise<Etapa[]>;
  create(input: EtapaInput): Promise<Etapa>;
  update(id: string, patch: Partial<EtapaInput>): Promise<Etapa>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

export interface ActivityRepository {
  load(): Promise<AtividadesState>;
  createLista(input: AtividadeListaInput): Promise<AtividadeLista>;
  updateLista(
    id: string,
    patch: Partial<AtividadeListaInput>,
  ): Promise<AtividadeLista>;
  removeLista(id: string): Promise<void>;
  createCard(input: AtividadeCardInput): Promise<AtividadeCard>;
  updateCard(
    id: string,
    patch: Partial<AtividadeCardInput>,
  ): Promise<AtividadeCard>;
  removeCard(id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementações localStorage
// ─────────────────────────────────────────────────────────────────────────────
class LocalStorageDealRepository implements DealRepository {
  async listAll(): Promise<Deal[]> {
    return readCrm().deals;
  }
  async create(input: DealInput): Promise<Deal> {
    const s = readCrm();
    const ts = agoraISO();
    const deal: Deal = { ...input, id: novoId("deal"), criadoEm: ts, atualizadoEm: ts };
    s.deals = [...s.deals, deal];
    writeCrm(s);
    return deal;
  }
  async update(id: string, patch: Partial<DealInput>): Promise<Deal> {
    const s = readCrm();
    const i = s.deals.findIndex((d) => d.id === id);
    if (i === -1) throw new Error(`Oportunidade não encontrada: ${id}`);
    const upd: Deal = { ...s.deals[i], ...patch, atualizadoEm: agoraISO() };
    s.deals = [...s.deals.slice(0, i), upd, ...s.deals.slice(i + 1)];
    writeCrm(s);
    return upd;
  }
  async remove(id: string): Promise<void> {
    const s = readCrm();
    s.deals = s.deals.filter((d) => d.id !== id);
    writeCrm(s);
  }
}

class LocalStorageClientRepository implements ClientRepository {
  async listAll(): Promise<Cliente[]> {
    return readCrm().clientes;
  }
  async create(input: ClienteInput): Promise<Cliente> {
    const s = readCrm();
    const ts = agoraISO();
    const cli: Cliente = { ...input, id: novoId("cli"), criadoEm: ts, atualizadoEm: ts };
    s.clientes = [...s.clientes, cli];
    writeCrm(s);
    return cli;
  }
  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    const s = readCrm();
    const i = s.clientes.findIndex((c) => c.id === id);
    if (i === -1) throw new Error(`Cliente não encontrado: ${id}`);
    const upd: Cliente = { ...s.clientes[i], ...patch, atualizadoEm: agoraISO() };
    s.clientes = [...s.clientes.slice(0, i), upd, ...s.clientes.slice(i + 1)];
    writeCrm(s);
    return upd;
  }
  async remove(id: string): Promise<void> {
    const s = readCrm();
    s.clientes = s.clientes.filter((c) => c.id !== id);
    writeCrm(s);
  }
}

class LocalStorageOriginRepository implements OriginRepository {
  async listAll(): Promise<Origem[]> {
    return readCrm().origens;
  }
  async create(input: OrigemInput): Promise<Origem> {
    const s = readCrm();
    const o: Origem = { ...input, id: novoId("og") };
    s.origens = [...s.origens, o];
    writeCrm(s);
    return o;
  }
  async update(id: string, patch: Partial<OrigemInput>): Promise<Origem> {
    const s = readCrm();
    const i = s.origens.findIndex((o) => o.id === id);
    if (i === -1) throw new Error(`Origem não encontrada: ${id}`);
    const upd: Origem = { ...s.origens[i], ...patch };
    s.origens = [...s.origens.slice(0, i), upd, ...s.origens.slice(i + 1)];
    writeCrm(s);
    return upd;
  }
  async remove(id: string): Promise<void> {
    const s = readCrm();
    s.origens = s.origens.filter((o) => o.id !== id);
    writeCrm(s);
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    const s = readCrm();
    s.origens = s.origens.map((o) => {
      const i = idsOrdenados.indexOf(o.id);
      return i === -1 ? o : { ...o, ordem: i };
    });
    writeCrm(s);
  }
}

class LocalStorageStageRepository implements StageRepository {
  async listAll(): Promise<Etapa[]> {
    return readCrm().etapas;
  }
  async create(input: EtapaInput): Promise<Etapa> {
    const s = readCrm();
    const e: Etapa = { ...input, id: novoId("etapa") };
    s.etapas = [...s.etapas, e];
    writeCrm(s);
    return e;
  }
  async update(id: string, patch: Partial<EtapaInput>): Promise<Etapa> {
    const s = readCrm();
    const i = s.etapas.findIndex((e) => e.id === id);
    if (i === -1) throw new Error(`Etapa não encontrada: ${id}`);
    const upd: Etapa = { ...s.etapas[i], ...patch };
    s.etapas = [...s.etapas.slice(0, i), upd, ...s.etapas.slice(i + 1)];
    writeCrm(s);
    return upd;
  }
  async remove(id: string): Promise<void> {
    const s = readCrm();
    s.etapas = s.etapas.filter((e) => e.id !== id);
    writeCrm(s);
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    const s = readCrm();
    s.etapas = s.etapas.map((e) => {
      const i = idsOrdenados.indexOf(e.id);
      return i === -1 ? e : { ...e, ordem: i };
    });
    writeCrm(s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store + repositório do quadro de atividades (chave separada)
// ─────────────────────────────────────────────────────────────────────────────
function writeAtiv(state: AtividadesState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ATIVIDADES_STORAGE_KEY, JSON.stringify(state));
}

function readAtiv(): AtividadesState {
  if (typeof window === "undefined")
    return { listas: [], cards: [], checklist: [], etiquetas: [], cardEtiquetas: [] };
  const raw = window.localStorage.getItem(ATIVIDADES_STORAGE_KEY);
  if (!raw) {
    const seeded = gerarSeedAtividades();
    writeAtiv(seeded);
    return seeded;
  }
  try {
    const { state, changed } = migrarAtividades(JSON.parse(raw));
    if (changed) writeAtiv(state);
    return state;
  } catch {
    const seeded = gerarSeedAtividades();
    writeAtiv(seeded);
    return seeded;
  }
}

class LocalStorageActivityRepository implements ActivityRepository {
  async load(): Promise<AtividadesState> {
    const s = readAtiv();
    return {
      ...s,
      checklist: s.checklist ?? [],
      etiquetas: s.etiquetas ?? [],
      cardEtiquetas: s.cardEtiquetas ?? [],
    };
  }
  async createLista(input: AtividadeListaInput): Promise<AtividadeLista> {
    const s = readAtiv();
    const lista: AtividadeLista = { ...input, id: novoId("lista") };
    s.listas = [...s.listas, lista];
    writeAtiv(s);
    return lista;
  }
  async updateLista(
    id: string,
    patch: Partial<AtividadeListaInput>,
  ): Promise<AtividadeLista> {
    const s = readAtiv();
    const i = s.listas.findIndex((l) => l.id === id);
    if (i === -1) throw new Error(`Lista não encontrada: ${id}`);
    const upd: AtividadeLista = { ...s.listas[i], ...patch };
    s.listas = [...s.listas.slice(0, i), upd, ...s.listas.slice(i + 1)];
    writeAtiv(s);
    return upd;
  }
  async removeLista(id: string): Promise<void> {
    const s = readAtiv();
    s.listas = s.listas.filter((l) => l.id !== id);
    s.cards = s.cards.filter((c) => c.listaId !== id); // cascata
    writeAtiv(s);
  }
  async createCard(input: AtividadeCardInput): Promise<AtividadeCard> {
    const s = readAtiv();
    const ts = agoraISO();
    const card: AtividadeCard = {
      ...input,
      id: novoId("card"),
      criadoEm: ts,
      atualizadoEm: ts,
    };
    s.cards = [...s.cards, card];
    writeAtiv(s);
    return card;
  }
  async updateCard(
    id: string,
    patch: Partial<AtividadeCardInput>,
  ): Promise<AtividadeCard> {
    const s = readAtiv();
    const i = s.cards.findIndex((c) => c.id === id);
    if (i === -1) throw new Error(`Card não encontrado: ${id}`);
    const upd: AtividadeCard = { ...s.cards[i], ...patch, atualizadoEm: agoraISO() };
    s.cards = [...s.cards.slice(0, i), upd, ...s.cards.slice(i + 1)];
    writeAtiv(s);
    return upd;
  }
  async removeCard(id: string): Promise<void> {
    const s = readAtiv();
    s.cards = s.cards.filter((c) => c.id !== id);
    writeAtiv(s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementações Supabase — ATIVAS.
//
// As classes implementam exatamente as mesmas interfaces das LocalStorage*. Os
// ids continuam sendo gerados no cliente (novoId, com prefixo) para casar com o
// schema `text` e manter o padrão atual. Os mapeadores convertem snake_case ↔
// camelCase e tratam colunas anuláveis do Postgres para os campos string
// não-anuláveis do modelo (lib/types.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "./supabase";

type Row = Record<string, any>;

// ── Deal ─────────────────────────────────────────────────────────────────────
function dealFromRow(row: Row): Deal {
  return {
    id: row.id,
    projeto: row.projeto,
    clienteId: row.cliente_id,
    contatoId: row.contato_id ?? null,
    valor: Number(row.valor),
    origemId: row.origem_id,
    previsaoFechamento: row.previsao_fechamento ?? "",
    etapaId: row.etapa_id,
    status: row.status as DealStatus,
    motivoPerda: row.motivo_perda,
    notas: row.notas ?? "",
    responsavelEmail: row.responsavel_email ?? null,
    areaProjeto: row.area_projeto !== null && row.area_projeto !== undefined
      ? Number(row.area_projeto)
      : null,
    tipoObra: (row.tipo_obra as TipoObra) ?? null,
    cidadeObra: row.cidade_obra ?? "",
    condominio: row.condominio ?? "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    exemplo: row.exemplo ?? false,
  };
}
function dealToRow(d: Deal): Row {
  return {
    id: d.id,
    projeto: d.projeto,
    cliente_id: d.clienteId,
    contato_id: d.contatoId ?? null,
    valor: d.valor,
    origem_id: d.origemId,
    previsao_fechamento: d.previsaoFechamento || null,
    etapa_id: d.etapaId,
    status: d.status,
    motivo_perda: d.motivoPerda,
    notas: d.notas,
    responsavel_email: d.responsavelEmail ?? null,
    area_projeto: d.areaProjeto ?? null,
    tipo_obra: d.tipoObra ?? null,
    cidade_obra: d.cidadeObra || null,
    condominio: d.condominio || null,
    exemplo: d.exemplo ?? false,
    criado_em: d.criadoEm,
    atualizado_em: d.atualizadoEm,
  };
}
function dealPatchToRow(p: Partial<DealInput>): Row {
  const r: Row = {};
  if (p.projeto !== undefined) r.projeto = p.projeto;
  if (p.clienteId !== undefined) r.cliente_id = p.clienteId;
  if (p.contatoId !== undefined) r.contato_id = p.contatoId ?? null;
  if (p.valor !== undefined) r.valor = p.valor;
  if (p.origemId !== undefined) r.origem_id = p.origemId;
  if (p.previsaoFechamento !== undefined) r.previsao_fechamento = p.previsaoFechamento || null;
  if (p.etapaId !== undefined) r.etapa_id = p.etapaId;
  if (p.status !== undefined) r.status = p.status;
  if (p.motivoPerda !== undefined) r.motivo_perda = p.motivoPerda;
  if (p.notas !== undefined) r.notas = p.notas;
  if (p.responsavelEmail !== undefined) r.responsavel_email = p.responsavelEmail ?? null;
  if (p.areaProjeto !== undefined) r.area_projeto = p.areaProjeto ?? null;
  if (p.tipoObra !== undefined) r.tipo_obra = p.tipoObra ?? null;
  if (p.cidadeObra !== undefined) r.cidade_obra = p.cidadeObra || null;
  if (p.condominio !== undefined) r.condominio = p.condominio || null;
  if (p.exemplo !== undefined) r.exemplo = p.exemplo;
  return r;
}

class SupabaseDealRepository implements DealRepository {
  async listAll(): Promise<Deal[]> {
    const { data, error } = await supabase.from("deals").select("*");
    if (error) throw error;
    return (data ?? []).map(dealFromRow);
  }
  async create(input: DealInput): Promise<Deal> {
    const ts = agoraISO();
    const deal: Deal = { ...input, id: novoId("deal"), criadoEm: ts, atualizadoEm: ts };
    const { error } = await supabase.from("deals").insert(dealToRow(deal));
    if (error) throw error;
    return deal;
  }
  async update(id: string, patch: Partial<DealInput>): Promise<Deal> {
    const { data, error } = await supabase
      .from("deals")
      .update({ ...dealPatchToRow(patch), atualizado_em: agoraISO() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return dealFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw error;
  }
}

// ── Cliente ──────────────────────────────────────────────────────────────────
function clienteFromRow(row: Row): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    observacoes: row.observacoes ?? "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    exemplo: row.exemplo ?? false,
  };
}
function clienteToRow(c: Cliente): Row {
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    observacoes: c.observacoes,
    exemplo: c.exemplo ?? false,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  };
}
function clientePatchToRow(p: Partial<ClienteInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.telefone !== undefined) r.telefone = p.telefone;
  if (p.email !== undefined) r.email = p.email;
  if (p.observacoes !== undefined) r.observacoes = p.observacoes;
  if (p.exemplo !== undefined) r.exemplo = p.exemplo;
  return r;
}

class SupabaseClientRepository implements ClientRepository {
  async listAll(): Promise<Cliente[]> {
    const { data, error } = await supabase.from("clientes").select("*");
    if (error) throw error;
    return (data ?? []).map(clienteFromRow);
  }
  async create(input: ClienteInput): Promise<Cliente> {
    const ts = agoraISO();
    const cli: Cliente = { ...input, id: novoId("cli"), criadoEm: ts, atualizadoEm: ts };
    const { error } = await supabase.from("clientes").insert(clienteToRow(cli));
    if (error) throw error;
    return cli;
  }
  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    const { data, error } = await supabase
      .from("clientes")
      .update({ ...clientePatchToRow(patch), atualizado_em: agoraISO() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return clienteFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) throw error;
  }
}

// ── Origem ───────────────────────────────────────────────────────────────────
function origemFromRow(row: Row): Origem {
  return {
    id: row.id,
    nome: row.nome,
    ordem: Number(row.ordem ?? 0),
  };
}

function origemPatchToRow(p: Partial<OrigemInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

class SupabaseOriginRepository implements OriginRepository {
  async listAll(): Promise<Origem[]> {
    const { data, error } = await supabase
      .from("origens")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(origemFromRow);
  }
  async create(input: OrigemInput): Promise<Origem> {
    const o: Origem = { ...input, id: novoId("og") };
    const { error } = await supabase
      .from("origens")
      .insert({ id: o.id, nome: o.nome, ordem: o.ordem });
    if (error) throw error;
    return o;
  }
  async update(id: string, patch: Partial<OrigemInput>): Promise<Origem> {
    const { data, error } = await supabase
      .from("origens")
      .update(origemPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return origemFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("origens").delete().eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("origens").update({ ordem: i }).eq("id", id),
      ),
    );
  }
}

// ── Etapa ────────────────────────────────────────────────────────────────────
function etapaFromRow(row: Row): Etapa {
  return {
    id: row.id,
    nome: row.nome,
    probabilidade: Number(row.probabilidade),
    ordem: Number(row.ordem),
    final: row.final ?? false,
  };
}
function etapaPatchToRow(p: Partial<EtapaInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.probabilidade !== undefined) r.probabilidade = p.probabilidade;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  if (p.final !== undefined) r.final = p.final;
  return r;
}

class SupabaseStageRepository implements StageRepository {
  async listAll(): Promise<Etapa[]> {
    const { data, error } = await supabase.from("etapas").select("*");
    if (error) throw error;
    return (data ?? []).map(etapaFromRow);
  }
  async create(input: EtapaInput): Promise<Etapa> {
    const e: Etapa = { ...input, id: novoId("etapa") };
    const { error } = await supabase.from("etapas").insert({
      id: e.id,
      nome: e.nome,
      probabilidade: e.probabilidade,
      ordem: e.ordem,
      final: e.final ?? false,
    });
    if (error) throw error;
    return e;
  }
  async update(id: string, patch: Partial<EtapaInput>): Promise<Etapa> {
    const { data, error } = await supabase
      .from("etapas")
      .update(etapaPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return etapaFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("etapas").delete().eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    // Aplica novos índices em paralelo. O UNIQUE da coluna ordem foi removido
    // na migration prepare_config_reorder para permitir essa estratégia.
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("etapas").update({ ordem: i }).eq("id", id),
      ),
    );
  }
}

// ── Atividades (listas + cards) ──────────────────────────────────────────────
function listaFromRow(row: Row): AtividadeLista {
  return {
    id: row.id,
    nome: row.nome,
    ordem: Number(row.ordem),
    cor: row.cor as AtividadeLista["cor"],
  };
}
function listaPatchToRow(p: Partial<AtividadeListaInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  if (p.cor !== undefined) r.cor = p.cor;
  return r;
}
function cardFromRow(row: Row): AtividadeCard {
  return {
    id: row.id,
    listaId: row.lista_id,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    cor: (row.cor ?? null) as AtividadeCard["cor"],
    data: row.data ?? null,
    ordem: Number(row.ordem),
    valorEstimado:
      row.valor_estimado === null || row.valor_estimado === undefined
        ? null
        : Number(row.valor_estimado),
    fornecedor: row.fornecedor ?? "",
    numeroNF: row.numero_nf ?? "",
    metragem:
      row.metragem === null || row.metragem === undefined
        ? null
        : Number(row.metragem),
    dataInicio: row.data_inicio ?? null,
    dataVencimento: row.data_vencimento ?? null,
    horaVencimento: row.hora_vencimento ?? "",
    recorrencia: (row.recorrencia ?? "nunca") as AtividadeCard["recorrencia"],
    concluidaEm: row.concluida_em ?? null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}
function cardToRow(c: AtividadeCard): Row {
  return {
    id: c.id,
    lista_id: c.listaId,
    titulo: c.titulo,
    descricao: c.descricao,
    cor: c.cor,
    data: c.data,
    ordem: c.ordem,
    valor_estimado: c.valorEstimado,
    fornecedor: c.fornecedor || null,
    numero_nf: c.numeroNF || null,
    metragem: c.metragem,
    data_inicio: c.dataInicio,
    data_vencimento: c.dataVencimento,
    hora_vencimento: c.horaVencimento || null,
    recorrencia: c.recorrencia,
    concluida_em: c.concluidaEm,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  };
}
function cardPatchToRow(p: Partial<AtividadeCardInput>): Row {
  const r: Row = {};
  if (p.listaId !== undefined) r.lista_id = p.listaId;
  if (p.titulo !== undefined) r.titulo = p.titulo;
  if (p.descricao !== undefined) r.descricao = p.descricao;
  if (p.cor !== undefined) r.cor = p.cor;
  if (p.data !== undefined) r.data = p.data;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  if (p.valorEstimado !== undefined) r.valor_estimado = p.valorEstimado;
  if (p.fornecedor !== undefined) r.fornecedor = p.fornecedor || null;
  if (p.numeroNF !== undefined) r.numero_nf = p.numeroNF || null;
  if (p.metragem !== undefined) r.metragem = p.metragem;
  if (p.dataInicio !== undefined) r.data_inicio = p.dataInicio;
  if (p.dataVencimento !== undefined) r.data_vencimento = p.dataVencimento;
  if (p.horaVencimento !== undefined) r.hora_vencimento = p.horaVencimento || null;
  if (p.recorrencia !== undefined) r.recorrencia = p.recorrencia;
  if (p.concluidaEm !== undefined) r.concluida_em = p.concluidaEm;
  return r;
}

class SupabaseActivityRepository implements ActivityRepository {
  async load(): Promise<AtividadesState> {
    const [listasRes, cardsRes, checklistRes, etiqRes, cardEtiqRes] =
      await Promise.all([
        supabase.from("atividades_listas").select("*"),
        supabase.from("atividades_cards").select("*"),
        supabase.from("atividades_checklist").select("*"),
        supabase.from("atividades_etiquetas").select("*"),
        supabase.from("atividades_cards_etiquetas").select("*"),
      ]);
    if (listasRes.error) throw listasRes.error;
    if (cardsRes.error) throw cardsRes.error;
    if (checklistRes.error) throw checklistRes.error;
    if (etiqRes.error) throw etiqRes.error;
    if (cardEtiqRes.error) throw cardEtiqRes.error;
    return {
      listas: (listasRes.data ?? []).map(listaFromRow),
      cards: (cardsRes.data ?? []).map(cardFromRow),
      checklist: (checklistRes.data ?? []).map(checklistFromRow),
      etiquetas: (etiqRes.data ?? []).map(etiquetaFromRow),
      cardEtiquetas: (cardEtiqRes.data ?? []).map((r: Row) => ({
        cardId: r.card_id,
        etiquetaId: r.etiqueta_id,
      })),
    };
  }
  async createLista(input: AtividadeListaInput): Promise<AtividadeLista> {
    const lista: AtividadeLista = { ...input, id: novoId("lista") };
    const { error } = await supabase.from("atividades_listas").insert({
      id: lista.id,
      nome: lista.nome,
      ordem: lista.ordem,
      cor: lista.cor,
    });
    if (error) throw error;
    return lista;
  }
  async updateLista(
    id: string,
    patch: Partial<AtividadeListaInput>,
  ): Promise<AtividadeLista> {
    const { data, error } = await supabase
      .from("atividades_listas")
      .update(listaPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return listaFromRow(data);
  }
  async removeLista(id: string): Promise<void> {
    // Os cards caem em cascata via FK (on delete cascade no schema).
    const { error } = await supabase.from("atividades_listas").delete().eq("id", id);
    if (error) throw error;
  }
  async createCard(input: AtividadeCardInput): Promise<AtividadeCard> {
    const ts = agoraISO();
    const card: AtividadeCard = { ...input, id: novoId("card"), criadoEm: ts, atualizadoEm: ts };
    const { error } = await supabase.from("atividades_cards").insert(cardToRow(card));
    if (error) throw error;
    return card;
  }
  async updateCard(
    id: string,
    patch: Partial<AtividadeCardInput>,
  ): Promise<AtividadeCard> {
    const { data, error } = await supabase
      .from("atividades_cards")
      .update({ ...cardPatchToRow(patch), atualizado_em: agoraISO() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return cardFromRow(data);
  }
  async removeCard(id: string): Promise<void> {
    const { error } = await supabase.from("atividades_cards").delete().eq("id", id);
    if (error) throw error;
  }
}

// ── Checklist (subtarefas de um card de atividade) ───────────────────────────
function checklistFromRow(row: Row): AtividadeChecklistItem {
  return {
    id: row.id,
    cardId: row.card_id,
    titulo: row.titulo,
    concluida: Boolean(row.concluida),
    ordem: Number(row.ordem ?? 0),
    criadoEm: row.criado_em,
  };
}

function checklistPatchToRow(p: Partial<AtividadeChecklistInput>): Row {
  const r: Row = {};
  if (p.cardId !== undefined) r.card_id = p.cardId;
  if (p.titulo !== undefined) r.titulo = p.titulo;
  if (p.concluida !== undefined) r.concluida = p.concluida;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

export interface ChecklistRepository {
  listByCard(cardId: string): Promise<AtividadeChecklistItem[]>;
  create(input: AtividadeChecklistInput): Promise<AtividadeChecklistItem>;
  update(
    id: string,
    patch: Partial<AtividadeChecklistInput>,
  ): Promise<AtividadeChecklistItem>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

class SupabaseChecklistRepository implements ChecklistRepository {
  async listByCard(cardId: string): Promise<AtividadeChecklistItem[]> {
    const { data, error } = await supabase
      .from("atividades_checklist")
      .select("*")
      .eq("card_id", cardId)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(checklistFromRow);
  }
  async create(input: AtividadeChecklistInput): Promise<AtividadeChecklistItem> {
    const id = novoId("chk");
    const { data, error } = await supabase
      .from("atividades_checklist")
      .insert({
        id,
        card_id: input.cardId,
        titulo: input.titulo,
        concluida: input.concluida,
        ordem: input.ordem,
      })
      .select()
      .single();
    if (error) throw error;
    return checklistFromRow(data);
  }
  async update(
    id: string,
    patch: Partial<AtividadeChecklistInput>,
  ): Promise<AtividadeChecklistItem> {
    const { data, error } = await supabase
      .from("atividades_checklist")
      .update(checklistPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return checklistFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_checklist")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("atividades_checklist").update({ ordem: i }).eq("id", id),
      ),
    );
  }
}

export const checklistRepository: ChecklistRepository =
  new SupabaseChecklistRepository();

// ── Etiquetas de atividade (F2) ──────────────────────────────────────────────
function etiquetaFromRow(row: Row): AtividadeEtiqueta {
  return {
    id: row.id,
    nome: row.nome,
    cor: row.cor,
    ordem: Number(row.ordem ?? 0),
    criadoEm: row.criado_em,
  };
}

function etiquetaPatchToRow(p: Partial<AtividadeEtiquetaInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.cor !== undefined) r.cor = p.cor;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

export interface EtiquetaRepository {
  listAll(): Promise<AtividadeEtiqueta[]>;
  create(input: AtividadeEtiquetaInput): Promise<AtividadeEtiqueta>;
  update(
    id: string,
    patch: Partial<AtividadeEtiquetaInput>,
  ): Promise<AtividadeEtiqueta>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
  // vínculos
  link(cardId: string, etiquetaId: string): Promise<void>;
  unlink(cardId: string, etiquetaId: string): Promise<void>;
}

class SupabaseEtiquetaRepository implements EtiquetaRepository {
  async listAll(): Promise<AtividadeEtiqueta[]> {
    const { data, error } = await supabase
      .from("atividades_etiquetas")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(etiquetaFromRow);
  }
  async create(input: AtividadeEtiquetaInput): Promise<AtividadeEtiqueta> {
    const id = novoId("etiq");
    const { data, error } = await supabase
      .from("atividades_etiquetas")
      .insert({
        id,
        nome: input.nome,
        cor: input.cor,
        ordem: input.ordem,
      })
      .select()
      .single();
    if (error) throw error;
    return etiquetaFromRow(data);
  }
  async update(
    id: string,
    patch: Partial<AtividadeEtiquetaInput>,
  ): Promise<AtividadeEtiqueta> {
    const { data, error } = await supabase
      .from("atividades_etiquetas")
      .update(etiquetaPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return etiquetaFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_etiquetas")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("atividades_etiquetas").update({ ordem: i }).eq("id", id),
      ),
    );
  }
  async link(cardId: string, etiquetaId: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_cards_etiquetas")
      .insert({ card_id: cardId, etiqueta_id: etiquetaId });
    if (error && !String(error.message).includes("duplicate key")) throw error;
  }
  async unlink(cardId: string, etiquetaId: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_cards_etiquetas")
      .delete()
      .eq("card_id", cardId)
      .eq("etiqueta_id", etiquetaId);
    if (error) throw error;
  }
}

export const etiquetaRepository: EtiquetaRepository =
  new SupabaseEtiquetaRepository();

// ── Comentários (F5) ─────────────────────────────────────────────────────────
function comentarioFromRow(row: Row): AtividadeComentario {
  return {
    id: row.id,
    cardId: row.card_id,
    autorEmail: row.autor_email,
    texto: row.texto,
    criadoEm: row.criado_em,
    editadoEm: row.editado_em ?? null,
  };
}

export interface ComentarioRepository {
  listByCard(cardId: string): Promise<AtividadeComentario[]>;
  create(input: AtividadeComentarioInput): Promise<AtividadeComentario>;
  update(id: string, texto: string): Promise<AtividadeComentario>;
  remove(id: string): Promise<void>;
}

class SupabaseComentarioRepository implements ComentarioRepository {
  async listByCard(cardId: string): Promise<AtividadeComentario[]> {
    const { data, error } = await supabase
      .from("atividades_comentarios")
      .select("*")
      .eq("card_id", cardId)
      .order("criado_em", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(comentarioFromRow);
  }
  async create(
    input: AtividadeComentarioInput,
  ): Promise<AtividadeComentario> {
    const id = novoId("com");
    const { data, error } = await supabase
      .from("atividades_comentarios")
      .insert({
        id,
        card_id: input.cardId,
        autor_email: input.autorEmail,
        texto: input.texto,
      })
      .select()
      .single();
    if (error) throw error;
    return comentarioFromRow(data);
  }
  async update(id: string, texto: string): Promise<AtividadeComentario> {
    const { data, error } = await supabase
      .from("atividades_comentarios")
      .update({ texto, editado_em: agoraISO() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return comentarioFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_comentarios")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
}

export const comentarioRepository: ComentarioRepository =
  new SupabaseComentarioRepository();

// ── Histórico de atividade (F6) — append-only ────────────────────────────────
function atividadeHistoricoFromRow(row: Row): AtividadeHistoricoItem {
  return {
    id: row.id,
    cardId: row.card_id,
    autorEmail: row.autor_email ?? null,
    tipo: row.tipo as AtividadeHistoricoItem["tipo"],
    descricao: row.descricao,
    criadoEm: row.criado_em,
  };
}

export interface AtividadeHistoricoRepository {
  listByCard(cardId: string): Promise<AtividadeHistoricoItem[]>;
  log(input: AtividadeHistoricoInput): Promise<AtividadeHistoricoItem | null>;
}

class SupabaseAtividadeHistoricoRepository
  implements AtividadeHistoricoRepository
{
  async listByCard(cardId: string): Promise<AtividadeHistoricoItem[]> {
    const { data, error } = await supabase
      .from("atividades_historico")
      .select("*")
      .eq("card_id", cardId)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(atividadeHistoricoFromRow);
  }
  async log(
    input: AtividadeHistoricoInput,
  ): Promise<AtividadeHistoricoItem | null> {
    const id = novoId("ahis");
    const { data, error } = await supabase
      .from("atividades_historico")
      .insert({
        id,
        card_id: input.cardId,
        autor_email: input.autorEmail,
        tipo: input.tipo,
        descricao: input.descricao,
      })
      .select()
      .single();
    if (error) return null;
    return atividadeHistoricoFromRow(data);
  }
}

export const atividadeHistoricoRepository: AtividadeHistoricoRepository =
  new SupabaseAtividadeHistoricoRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório do histórico/timeline dos deals (só Supabase — feature nova)
// ─────────────────────────────────────────────────────────────────────────────
export interface HistoricoRepository {
  list(dealId: string): Promise<HistoricoItem[]>;
  create(input: HistoricoInput): Promise<HistoricoItem>;
}

function historicoFromRow(row: Row): HistoricoItem {
  return {
    id: row.id,
    dealId: row.deal_id,
    tipo: row.tipo as HistoricoTipo,
    descricao: row.descricao,
    autorEmail: row.autor_email ?? null,
    criadoEm: row.criado_em,
  };
}

class SupabaseHistoricoRepository implements HistoricoRepository {
  async list(dealId: string): Promise<HistoricoItem[]> {
    const { data, error } = await supabase
      .from("deal_historico")
      .select("*")
      .eq("deal_id", dealId)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(historicoFromRow);
  }
  async create(input: HistoricoInput): Promise<HistoricoItem> {
    const id = novoId("hist");
    const { data, error } = await supabase
      .from("deal_historico")
      .insert({
        id,
        deal_id: input.dealId,
        tipo: input.tipo,
        descricao: input.descricao,
        autor_email: input.autorEmail,
      })
      .select()
      .single();
    if (error) throw error;
    return historicoFromRow(data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de tarefas (F2)
// ─────────────────────────────────────────────────────────────────────────────
export interface TarefaRepository {
  listAll(): Promise<Tarefa[]>;
  listByDeal(dealId: string): Promise<Tarefa[]>;
  create(input: TarefaInput): Promise<Tarefa>;
  update(id: string, patch: Partial<TarefaInput>): Promise<Tarefa>;
  remove(id: string): Promise<void>;
}

function tarefaFromRow(row: Row): Tarefa {
  return {
    id: row.id,
    dealId: row.deal_id,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    responsavelEmail: row.responsavel_email ?? null,
    dataVencimento: row.data_vencimento,
    concluida: Boolean(row.concluida),
    concluidaEm: row.concluida_em ?? null,
    criadoEm: row.criado_em,
  };
}

function tarefaPatchToRow(p: Partial<TarefaInput>): Row {
  const r: Row = {};
  if (p.titulo !== undefined) r.titulo = p.titulo;
  if (p.descricao !== undefined) r.descricao = p.descricao;
  if (p.responsavelEmail !== undefined) r.responsavel_email = p.responsavelEmail;
  if (p.dataVencimento !== undefined) r.data_vencimento = p.dataVencimento;
  if (p.concluida !== undefined) {
    r.concluida = p.concluida;
    r.concluida_em = p.concluida ? agoraISO() : null;
  }
  if (p.concluidaEm !== undefined) r.concluida_em = p.concluidaEm;
  return r;
}

class SupabaseTarefaRepository implements TarefaRepository {
  async listAll(): Promise<Tarefa[]> {
    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(tarefaFromRow);
  }
  async listByDeal(dealId: string): Promise<Tarefa[]> {
    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("deal_id", dealId)
      .order("data_vencimento", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(tarefaFromRow);
  }
  async create(input: TarefaInput): Promise<Tarefa> {
    const id = novoId("tarefa");
    const { data, error } = await supabase
      .from("tarefas")
      .insert({
        id,
        deal_id: input.dealId,
        titulo: input.titulo,
        descricao: input.descricao || null,
        responsavel_email: input.responsavelEmail,
        data_vencimento: input.dataVencimento,
        concluida: input.concluida,
        concluida_em: input.concluidaEm,
      })
      .select()
      .single();
    if (error) throw error;
    return tarefaFromRow(data);
  }
  async update(id: string, patch: Partial<TarefaInput>): Promise<Tarefa> {
    const { data, error } = await supabase
      .from("tarefas")
      .update(tarefaPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return tarefaFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    if (error) throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de automações (F5)
// ─────────────────────────────────────────────────────────────────────────────
export interface AutomacaoRepository {
  listAll(): Promise<Automacao[]>;
  listActive(): Promise<Automacao[]>;
  create(input: AutomacaoInput): Promise<Automacao>;
  update(id: string, patch: Partial<AutomacaoInput>): Promise<Automacao>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

function automacaoFromRow(row: Row): Automacao {
  return {
    id: row.id,
    nome: row.nome,
    gatilho: row.gatilho as AutomacaoGatilho,
    acao: row.acao as AutomacaoAcao,
    configuracao: row.configuracao ?? {},
    ativa: Boolean(row.ativa),
    ordem: Number(row.ordem ?? 0),
    criadoEm: row.criado_em,
  };
}

function automacaoPatchToRow(p: Partial<AutomacaoInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.gatilho !== undefined) r.gatilho = p.gatilho;
  if (p.acao !== undefined) r.acao = p.acao;
  if (p.configuracao !== undefined) r.configuracao = p.configuracao;
  if (p.ativa !== undefined) r.ativa = p.ativa;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

class SupabaseAutomacaoRepository implements AutomacaoRepository {
  async listAll(): Promise<Automacao[]> {
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(automacaoFromRow);
  }
  async listActive(): Promise<Automacao[]> {
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .eq("ativa", true);
    if (error) throw error;
    return (data ?? []).map(automacaoFromRow);
  }
  async create(input: AutomacaoInput): Promise<Automacao> {
    const id = novoId("auto");
    const { data, error } = await supabase
      .from("automacoes")
      .insert({
        id,
        nome: input.nome,
        gatilho: input.gatilho,
        acao: input.acao,
        configuracao: input.configuracao,
        ativa: input.ativa,
        ordem: input.ordem ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return automacaoFromRow(data);
  }
  async update(id: string, patch: Partial<AutomacaoInput>): Promise<Automacao> {
    const { data, error } = await supabase
      .from("automacoes")
      .update(automacaoPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return automacaoFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("automacoes").delete().eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("automacoes").update({ ordem: i }).eq("id", id),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PONTO ÚNICO DE TROCA DE IMPLEMENTAÇÃO — agora apontando para o Supabase.
//
// As classes LocalStorage* acima permanecem no arquivo como referência/fallback;
// basta trocar as instâncias abaixo para voltar atrás, se necessário.
// ─────────────────────────────────────────────────────────────────────────────
export const dealRepository: DealRepository = new SupabaseDealRepository();
export const clientRepository: ClientRepository =
  new SupabaseClientRepository();
export const originRepository: OriginRepository =
  new SupabaseOriginRepository();
export const stageRepository: StageRepository =
  new SupabaseStageRepository();
export const activityRepository: ActivityRepository =
  new SupabaseActivityRepository();
export const historicoRepository: HistoricoRepository =
  new SupabaseHistoricoRepository();
export const tarefaRepository: TarefaRepository =
  new SupabaseTarefaRepository();
export const automacaoRepository: AutomacaoRepository =
  new SupabaseAutomacaoRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de perfis (nome de exibição por usuário)
// ─────────────────────────────────────────────────────────────────────────────
export interface PerfilRepository {
  listAll(): Promise<Perfil[]>;
  getByEmail(email: string): Promise<Perfil | null>;
  upsert(input: PerfilInput): Promise<Perfil>;
}

function perfilFromRow(row: Row): Perfil {
  return {
    id: row.id,
    nomeExibicao: row.nome_exibicao,
    email: row.email ?? "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

class SupabasePerfilRepository implements PerfilRepository {
  async listAll(): Promise<Perfil[]> {
    const { data, error } = await supabase.from("perfis").select("*");
    if (error) throw error;
    return (data ?? []).map(perfilFromRow);
  }
  async getByEmail(email: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return data ? perfilFromRow(data) : null;
  }
  async upsert(input: PerfilInput): Promise<Perfil> {
    const { data, error } = await supabase
      .from("perfis")
      .upsert(
        {
          id: input.id,
          nome_exibicao: input.nomeExibicao,
          email: input.email,
          atualizado_em: agoraISO(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();
    if (error) throw error;
    return perfilFromRow(data);
  }
}

export const perfilRepository: PerfilRepository =
  new SupabasePerfilRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de metas mensais de vendas
// ─────────────────────────────────────────────────────────────────────────────
export interface MetaRepository {
  listAll(): Promise<Meta[]>;
  getByMes(mes: string): Promise<Meta | null>;
  upsert(input: MetaInput): Promise<Meta>;
  remove(mes: string): Promise<void>;
}

function metaFromRow(row: Row): Meta {
  return {
    id: row.id,
    mes: row.mes,
    valorMeta: Number(row.valor_meta),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

class SupabaseMetaRepository implements MetaRepository {
  async listAll(): Promise<Meta[]> {
    const { data, error } = await supabase
      .from("metas")
      .select("*")
      .order("mes", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(metaFromRow);
  }
  async getByMes(mes: string): Promise<Meta | null> {
    const { data, error } = await supabase
      .from("metas")
      .select("*")
      .eq("mes", mes)
      .maybeSingle();
    if (error) throw error;
    return data ? metaFromRow(data) : null;
  }
  async upsert(input: MetaInput): Promise<Meta> {
    const ts = agoraISO();
    const existente = await this.getByMes(input.mes);
    if (existente) {
      const { data, error } = await supabase
        .from("metas")
        .update({ valor_meta: input.valorMeta, atualizado_em: ts })
        .eq("mes", input.mes)
        .select()
        .single();
      if (error) throw error;
      return metaFromRow(data);
    }
    const id = novoId("meta");
    const { data, error } = await supabase
      .from("metas")
      .insert({
        id,
        mes: input.mes,
        valor_meta: input.valorMeta,
        criado_em: ts,
        atualizado_em: ts,
      })
      .select()
      .single();
    if (error) throw error;
    return metaFromRow(data);
  }
  async remove(mes: string): Promise<void> {
    const { error } = await supabase.from("metas").delete().eq("mes", mes);
    if (error) throw error;
  }
}

export const metaRepository: MetaRepository = new SupabaseMetaRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de serviços de deal (múltiplos itens por oportunidade)
// ─────────────────────────────────────────────────────────────────────────────
export interface ServicoRepository {
  listAll(): Promise<DealServico[]>;
  listByDeal(dealId: string): Promise<DealServico[]>;
  create(input: DealServicoInput): Promise<DealServico>;
  update(id: string, patch: Partial<DealServicoInput>): Promise<DealServico>;
  remove(id: string): Promise<void>;
}

function servicoFromRow(row: Row): DealServico {
  return {
    id: row.id,
    dealId: row.deal_id,
    descricao: row.descricao,
    valor: Number(row.valor),
    ordem: Number(row.ordem),
    criadoEm: row.criado_em,
  };
}

function servicoPatchToRow(p: Partial<DealServicoInput>): Row {
  const r: Row = {};
  if (p.dealId !== undefined) r.deal_id = p.dealId;
  if (p.descricao !== undefined) r.descricao = p.descricao;
  if (p.valor !== undefined) r.valor = p.valor;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

class SupabaseServicoRepository implements ServicoRepository {
  async listAll(): Promise<DealServico[]> {
    const { data, error } = await supabase
      .from("deal_servicos")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(servicoFromRow);
  }
  async listByDeal(dealId: string): Promise<DealServico[]> {
    const { data, error } = await supabase
      .from("deal_servicos")
      .select("*")
      .eq("deal_id", dealId)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(servicoFromRow);
  }
  async create(input: DealServicoInput): Promise<DealServico> {
    const id = novoId("srv");
    const { data, error } = await supabase
      .from("deal_servicos")
      .insert({
        id,
        deal_id: input.dealId,
        descricao: input.descricao,
        valor: input.valor,
        ordem: input.ordem,
      })
      .select()
      .single();
    if (error) throw error;
    return servicoFromRow(data);
  }
  async update(id: string, patch: Partial<DealServicoInput>): Promise<DealServico> {
    const { data, error } = await supabase
      .from("deal_servicos")
      .update(servicoPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return servicoFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("deal_servicos").delete().eq("id", id);
    if (error) throw error;
  }
}

export const servicoRepository: ServicoRepository = new SupabaseServicoRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de tipos de serviço (catálogo configurável em Configurações)
// ─────────────────────────────────────────────────────────────────────────────
export interface TipoServicoRepository {
  listAll(): Promise<TipoServico[]>;
  create(input: TipoServicoInput): Promise<TipoServico>;
  update(id: string, patch: Partial<TipoServicoInput>): Promise<TipoServico>;
  /** Soft delete: marca ativo=false; preserva histórico para auditoria. */
  desativar(id: string): Promise<TipoServico>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

function tipoServicoFromRow(row: Row): TipoServico {
  return {
    id: row.id,
    nome: row.nome,
    ordem: Number(row.ordem),
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
  };
}

function tipoServicoPatchToRow(p: Partial<TipoServicoInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  if (p.ativo !== undefined) r.ativo = p.ativo;
  return r;
}

class SupabaseTipoServicoRepository implements TipoServicoRepository {
  async listAll(): Promise<TipoServico[]> {
    const { data, error } = await supabase
      .from("tipos_servico")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(tipoServicoFromRow);
  }
  async create(input: TipoServicoInput): Promise<TipoServico> {
    const id = novoId("tsv");
    const { data, error } = await supabase
      .from("tipos_servico")
      .insert({
        id,
        nome: input.nome,
        ordem: input.ordem,
        ativo: input.ativo,
      })
      .select()
      .single();
    if (error) throw error;
    return tipoServicoFromRow(data);
  }
  async update(id: string, patch: Partial<TipoServicoInput>): Promise<TipoServico> {
    const { data, error } = await supabase
      .from("tipos_servico")
      .update(tipoServicoPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return tipoServicoFromRow(data);
  }
  async desativar(id: string): Promise<TipoServico> {
    return this.update(id, { ativo: false });
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await Promise.all(
      idsOrdenados.map((id, i) =>
        supabase.from("tipos_servico").update({ ordem: i }).eq("id", id),
      ),
    );
  }
}

export const tipoServicoRepository: TipoServicoRepository =
  new SupabaseTipoServicoRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Repositório de contatos (pessoas vinculadas a um cliente)
// ─────────────────────────────────────────────────────────────────────────────
export interface ContatoRepository {
  listAll(): Promise<Contato[]>;
  create(input: ContatoInput): Promise<Contato>;
  update(id: string, patch: Partial<ContatoInput>): Promise<Contato>;
  remove(id: string): Promise<void>;
}

function contatoFromRow(row: Row): Contato {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    cargo: row.cargo ?? "",
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    principal: Boolean(row.principal),
    criadoEm: row.criado_em,
  };
}

function contatoPatchToRow(p: Partial<ContatoInput>): Row {
  const r: Row = {};
  if (p.clienteId !== undefined) r.cliente_id = p.clienteId;
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.cargo !== undefined) r.cargo = p.cargo || null;
  if (p.telefone !== undefined) r.telefone = p.telefone || null;
  if (p.email !== undefined) r.email = p.email || null;
  if (p.principal !== undefined) r.principal = p.principal;
  return r;
}

class SupabaseContatoRepository implements ContatoRepository {
  async listAll(): Promise<Contato[]> {
    const { data, error } = await supabase
      .from("contatos")
      .select("*")
      .order("criado_em", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(contatoFromRow);
  }
  async create(input: ContatoInput): Promise<Contato> {
    const id = novoId("ctt");
    const { data, error } = await supabase
      .from("contatos")
      .insert({
        id,
        cliente_id: input.clienteId,
        nome: input.nome,
        cargo: input.cargo || null,
        telefone: input.telefone || null,
        email: input.email || null,
        principal: input.principal,
      })
      .select()
      .single();
    if (error) throw error;
    return contatoFromRow(data);
  }
  async update(id: string, patch: Partial<ContatoInput>): Promise<Contato> {
    const { data, error } = await supabase
      .from("contatos")
      .update(contatoPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return contatoFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("contatos").delete().eq("id", id);
    if (error) throw error;
  }
}

export const contatoRepository: ContatoRepository = new SupabaseContatoRepository();
