// Repositório de automações: gatilho → ação (F5).

import type {
  Automacao,
  AutomacaoAcao,
  AutomacaoGatilho,
  AutomacaoInput,
} from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import { reorderBatch, type Row } from "./shared";

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
    await reorderBatch("automacoes", idsOrdenados);
  }
}

export const automacaoRepository: AutomacaoRepository =
  new SupabaseAutomacaoRepository();
