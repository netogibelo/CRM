// Repositório de deals (oportunidades do funil).

import type { Deal, DealInput, DealStatus, TipoObra } from "../types";
import { agoraISO, novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface DealRepository {
  listAll(): Promise<Deal[]>;
  create(input: DealInput): Promise<Deal>;
  update(id: string, patch: Partial<DealInput>): Promise<Deal>;
  remove(id: string): Promise<void>;
}

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

export const dealRepository: DealRepository = new SupabaseDealRepository();
