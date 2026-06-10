// Repositório de tipos de serviço (catálogo configurável em Configurações).

import type { TipoServico, TipoServicoInput } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import { reorderBatch, type Row } from "./shared";

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
    await reorderBatch("tipos_servico", idsOrdenados);
  }
}

export const tipoServicoRepository: TipoServicoRepository =
  new SupabaseTipoServicoRepository();
