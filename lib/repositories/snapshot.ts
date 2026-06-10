// Snapshot de boot do CRM: lê todas as coleções de uma vez.

import type { CrmState } from "../types";
import { dealRepository } from "./deals";
import { clientRepository } from "./clientes";
import { originRepository } from "./origens";
import { stageRepository } from "./etapas";

/** Lê todas as coleções do CRM de uma vez, pelos repositórios ativos.
 *
 * Compõe o snapshot a partir das instâncias exportadas nos módulos por
 * domínio (o "ponto único de troca"), então segue automaticamente a
 * implementação em uso — hoje Supabase. */
export async function loadCrmSnapshot(): Promise<CrmState> {
  const [deals, clientes, origens, etapas] = await Promise.all([
    dealRepository.listAll(),
    clientRepository.listAll(),
    originRepository.listAll(),
    stageRepository.listAll(),
  ]);
  return { deals, clientes, origens, etapas };
}
