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
  Etapa,
  EtapaInput,
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

/** Lê todas as coleções do CRM de uma vez (uma leitura/parse/migração). */
export async function loadCrmSnapshot(): Promise<CrmState> {
  return readCrm();
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
// PONTO ÚNICO DE TROCA DE IMPLEMENTAÇÃO (localStorage → Supabase no futuro)
// ─────────────────────────────────────────────────────────────────────────────
export const dealRepository: DealRepository = new LocalStorageDealRepository();
export const clientRepository: ClientRepository =
  new LocalStorageClientRepository();
export const originRepository: OriginRepository =
  new LocalStorageOriginRepository();
export const stageRepository: StageRepository =
  new LocalStorageStageRepository();
export const activityRepository: ActivityRepository =
  new LocalStorageActivityRepository();
