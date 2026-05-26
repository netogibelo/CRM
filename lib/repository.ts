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
  AtividadeCardInput,
  AtividadeLista,
  AtividadeListaInput,
  AtividadesState,
  Cliente,
  ClienteInput,
  CrmState,
  Deal,
  DealInput,
  DealStatus,
  Etapa,
  EtapaInput,
  HistoricoInput,
  HistoricoItem,
  HistoricoTipo,
  Origem,
  OrigemInput,
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
}

export interface StageRepository {
  listAll(): Promise<Etapa[]>;
  create(input: EtapaInput): Promise<Etapa>;
  update(id: string, patch: Partial<EtapaInput>): Promise<Etapa>;
  remove(id: string): Promise<void>;
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Store + repositório do quadro de atividades (chave separada)
// ─────────────────────────────────────────────────────────────────────────────
function writeAtiv(state: AtividadesState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ATIVIDADES_STORAGE_KEY, JSON.stringify(state));
}

function readAtiv(): AtividadesState {
  if (typeof window === "undefined") return { listas: [], cards: [] };
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
    return readAtiv();
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
    valor: Number(row.valor),
    origemId: row.origem_id,
    previsaoFechamento: row.previsao_fechamento ?? "",
    etapaId: row.etapa_id,
    status: row.status as DealStatus,
    motivoPerda: row.motivo_perda,
    notas: row.notas ?? "",
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
    valor: d.valor,
    origem_id: d.origemId,
    previsao_fechamento: d.previsaoFechamento || null,
    etapa_id: d.etapaId,
    status: d.status,
    motivo_perda: d.motivoPerda,
    notas: d.notas,
    exemplo: d.exemplo ?? false,
    criado_em: d.criadoEm,
    atualizado_em: d.atualizadoEm,
  };
}
function dealPatchToRow(p: Partial<DealInput>): Row {
  const r: Row = {};
  if (p.projeto !== undefined) r.projeto = p.projeto;
  if (p.clienteId !== undefined) r.cliente_id = p.clienteId;
  if (p.valor !== undefined) r.valor = p.valor;
  if (p.origemId !== undefined) r.origem_id = p.origemId;
  if (p.previsaoFechamento !== undefined) r.previsao_fechamento = p.previsaoFechamento || null;
  if (p.etapaId !== undefined) r.etapa_id = p.etapaId;
  if (p.status !== undefined) r.status = p.status;
  if (p.motivoPerda !== undefined) r.motivo_perda = p.motivoPerda;
  if (p.notas !== undefined) r.notas = p.notas;
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
  return { id: row.id, nome: row.nome };
}

class SupabaseOriginRepository implements OriginRepository {
  async listAll(): Promise<Origem[]> {
    const { data, error } = await supabase.from("origens").select("*");
    if (error) throw error;
    return (data ?? []).map(origemFromRow);
  }
  async create(input: OrigemInput): Promise<Origem> {
    const o: Origem = { ...input, id: novoId("og") };
    const { error } = await supabase.from("origens").insert({ id: o.id, nome: o.nome });
    if (error) throw error;
    return o;
  }
  async update(id: string, patch: Partial<OrigemInput>): Promise<Origem> {
    const { data, error } = await supabase
      .from("origens")
      .update(patch)
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
  return r;
}

class SupabaseActivityRepository implements ActivityRepository {
  async load(): Promise<AtividadesState> {
    const [listasRes, cardsRes] = await Promise.all([
      supabase.from("atividades_listas").select("*"),
      supabase.from("atividades_cards").select("*"),
    ]);
    if (listasRes.error) throw listasRes.error;
    if (cardsRes.error) throw cardsRes.error;
    return {
      listas: (listasRes.data ?? []).map(listaFromRow),
      cards: (cardsRes.data ?? []).map(cardFromRow),
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
