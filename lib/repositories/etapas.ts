// Repositório de etapas do funil (cadastráveis em Configurações).

import type { Etapa, EtapaInput } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import { reorderBatch, type Row } from "./shared";

export interface StageRepository {
  listAll(): Promise<Etapa[]>;
  create(input: EtapaInput): Promise<Etapa>;
  update(id: string, patch: Partial<EtapaInput>): Promise<Etapa>;
  remove(id: string): Promise<void>;
  reorder(idsOrdenados: string[]): Promise<void>;
}

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
    // O UNIQUE da coluna ordem foi removido na migration
    // prepare_config_reorder, permitindo o upsert em lote.
    await reorderBatch("etapas", idsOrdenados);
  }
}

export const stageRepository: StageRepository = new SupabaseStageRepository();
