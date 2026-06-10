// Repositório de tarefas com prazo, vinculadas a um deal (F2).

import type { Tarefa, TarefaInput } from "../types";
import { agoraISO, novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

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

export const tarefaRepository: TarefaRepository = new SupabaseTarefaRepository();
