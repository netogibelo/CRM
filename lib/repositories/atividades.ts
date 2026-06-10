// Repositórios do quadro de atividades (Trello-like): listas, cards,
// checklist, etiquetas, comentários, histórico e templates.

import type {
  AtividadeCard,
  AtividadeCardInput,
  AtividadeChecklistInput,
  AtividadeChecklistItem,
  AtividadeComentario,
  AtividadeComentarioInput,
  AtividadeEtiqueta,
  AtividadeEtiquetaInput,
  AtividadeHistoricoInput,
  AtividadeHistoricoItem,
  AtividadeLista,
  AtividadeListaInput,
  AtividadesState,
  AtividadeTemplate,
  AtividadeTemplateInput,
} from "../types";
import { agoraISO, novoId } from "../id";
import { supabase } from "../supabase";
import { reorderBatch, type Row } from "./shared";

// ── Listas + cards ───────────────────────────────────────────────────────────
export interface ActivityRepository {
  load(): Promise<AtividadesState>;
  createLista(input: AtividadeListaInput): Promise<AtividadeLista>;
  updateLista(
    id: string,
    patch: Partial<AtividadeListaInput>,
  ): Promise<AtividadeLista>;
  removeLista(id: string): Promise<void>;
  reordenarListas(idsOrdenados: string[]): Promise<void>;
  createCard(input: AtividadeCardInput): Promise<AtividadeCard>;
  updateCard(
    id: string,
    patch: Partial<AtividadeCardInput>,
  ): Promise<AtividadeCard>;
  removeCard(id: string): Promise<void>;
}

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
    responsavelEmail: row.responsavel_email ?? null,
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
    responsavel_email: c.responsavelEmail,
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
  if (p.responsavelEmail !== undefined) r.responsavel_email = p.responsavelEmail;
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
  async reordenarListas(idsOrdenados: string[]): Promise<void> {
    await reorderBatch("atividades_listas", idsOrdenados);
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

export const activityRepository: ActivityRepository =
  new SupabaseActivityRepository();

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
    await reorderBatch("atividades_checklist", idsOrdenados);
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
    await reorderBatch("atividades_etiquetas", idsOrdenados);
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
    if (error) {
      // Best-effort: histórico não pode quebrar a operação principal, mas a
      // falha precisa ficar visível para diagnóstico.
      console.error(
        `Falha ao registrar histórico de atividade ("${input.descricao}"):`,
        error,
      );
      return null;
    }
    return atividadeHistoricoFromRow(data);
  }
}

export const atividadeHistoricoRepository: AtividadeHistoricoRepository =
  new SupabaseAtividadeHistoricoRepository();

// ── Templates de atividade (F8) ──────────────────────────────────────────────
function atividadeTemplateFromRow(row: Row): AtividadeTemplate {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    etiquetasIds: Array.isArray(row.etiquetas_ids) ? row.etiquetas_ids : [],
    checklistItems: Array.isArray(row.checklist_items)
      ? row.checklist_items
      : [],
    camposDefaults: row.campos_defaults ?? {},
    ordem: Number(row.ordem ?? 0),
    criadoEm: row.criado_em,
  };
}

function templatePatchToRow(p: Partial<AtividadeTemplateInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.descricao !== undefined) r.descricao = p.descricao;
  if (p.etiquetasIds !== undefined) r.etiquetas_ids = p.etiquetasIds;
  if (p.checklistItems !== undefined) r.checklist_items = p.checklistItems;
  if (p.camposDefaults !== undefined) r.campos_defaults = p.camposDefaults;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

export interface AtividadeTemplateRepository {
  listAll(): Promise<AtividadeTemplate[]>;
  create(input: AtividadeTemplateInput): Promise<AtividadeTemplate>;
  update(
    id: string,
    patch: Partial<AtividadeTemplateInput>,
  ): Promise<AtividadeTemplate>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

class SupabaseAtividadeTemplateRepository
  implements AtividadeTemplateRepository
{
  async listAll(): Promise<AtividadeTemplate[]> {
    const { data, error } = await supabase
      .from("atividades_templates")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(atividadeTemplateFromRow);
  }
  async create(input: AtividadeTemplateInput): Promise<AtividadeTemplate> {
    const id = novoId("atpl");
    const { data, error } = await supabase
      .from("atividades_templates")
      .insert({
        id,
        nome: input.nome,
        descricao: input.descricao || null,
        etiquetas_ids: input.etiquetasIds,
        checklist_items: input.checklistItems,
        campos_defaults: input.camposDefaults,
        ordem: input.ordem,
      })
      .select()
      .single();
    if (error) throw error;
    return atividadeTemplateFromRow(data);
  }
  async update(
    id: string,
    patch: Partial<AtividadeTemplateInput>,
  ): Promise<AtividadeTemplate> {
    const { data, error } = await supabase
      .from("atividades_templates")
      .update(templatePatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return atividadeTemplateFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("atividades_templates")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await reorderBatch("atividades_templates", idsOrdenados);
  }
}

export const atividadeTemplateRepository: AtividadeTemplateRepository =
  new SupabaseAtividadeTemplateRepository();
