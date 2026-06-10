// Repositório de serviços de deal (múltiplos itens por oportunidade).

import type { DealServico, DealServicoInput } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

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
