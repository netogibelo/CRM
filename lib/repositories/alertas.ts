// Repositório da configuração de alertas diários por email (tabela singleton
// alertas_config, id fixo = 1). A Edge Function alertas-diarios consome a
// mesma tabela para decidir se envia.

import { agoraISO } from "../id";
import { supabase } from "../supabase";

export interface AlertasConfig {
  ativo: boolean;
}

export interface AlertasConfigRepository {
  get(): Promise<AlertasConfig>;
  update(patch: Partial<AlertasConfig>): Promise<void>;
}

class SupabaseAlertasConfigRepository implements AlertasConfigRepository {
  async get(): Promise<AlertasConfig> {
    const { data, error } = await supabase
      .from("alertas_config")
      .select("ativo")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return { ativo: data ? Boolean(data.ativo) : true };
  }
  async update(patch: Partial<AlertasConfig>): Promise<void> {
    const { error } = await supabase
      .from("alertas_config")
      .update({ ...patch, atualizado_em: agoraISO() })
      .eq("id", 1);
    if (error) throw error;
  }
}

export const alertasConfigRepository: AlertasConfigRepository =
  new SupabaseAlertasConfigRepository();
