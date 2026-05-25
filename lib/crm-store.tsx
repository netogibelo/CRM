"use client";

// Provider único que carrega o estado do CRM (deals, clientes, origens, etapas)
// e expõe hooks dedicados. A consistência entre as coleções fica garantida por
// uma única fonte em memória; a persistência continua nos repositórios.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
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
  clientRepository,
  dealRepository,
  originRepository,
  stageRepository,
} from "./repository";
import { etapaFinal, etapasAtivas } from "./stages";

/** Resultado de operações que podem ser bloqueadas por integridade referencial. */
export interface OpResult {
  ok: boolean;
  erro?: string;
}

interface CrmContextValue {
  carregando: boolean;
  state: CrmState;
  // deals
  criarDeal: (input: DealInput) => Promise<Deal>;
  atualizarDeal: (id: string, patch: Partial<DealInput>) => Promise<Deal>;
  removerDeal: (id: string) => Promise<void>;
  // clientes
  criarCliente: (input: ClienteInput) => Promise<Cliente>;
  atualizarCliente: (id: string, patch: Partial<ClienteInput>) => Promise<Cliente>;
  removerCliente: (id: string) => Promise<OpResult>;
  clienteEmUso: (id: string) => number;
  // origens
  criarOrigem: (input: OrigemInput) => Promise<Origem>;
  atualizarOrigem: (id: string, patch: Partial<OrigemInput>) => Promise<Origem>;
  removerOrigem: (id: string) => Promise<OpResult>;
  origemEmUso: (id: string) => number;
  // etapas
  criarEtapa: (input: EtapaInput) => Promise<Etapa>;
  atualizarEtapa: (id: string, patch: Partial<EtapaInput>) => Promise<Etapa>;
  removerEtapa: (id: string) => Promise<OpResult>;
  moverEtapa: (id: string, dir: -1 | 1) => Promise<void>;
  etapaEmUso: (id: string) => number;
  // lookups
  clienteNome: (id: string) => string;
  origemNome: (id: string) => string;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CrmState>({
    deals: [],
    clientes: [],
    origens: [],
    etapas: [],
  });
  const [carregando, setCarregando] = useState(true);

  // Ref sempre com o estado mais recente, para checagens de integridade.
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [deals, clientes, origens, etapas] = await Promise.all([
        dealRepository.listAll(),
        clientRepository.listAll(),
        originRepository.listAll(),
        stageRepository.listAll(),
      ]);
      if (ativo) {
        setState({ deals, clientes, origens, etapas });
        setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // ── Deals ──────────────────────────────────────────────────────────────
  const criarDeal = useCallback(async (input: DealInput) => {
    const d = await dealRepository.create(input);
    setState((s) => ({ ...s, deals: [...s.deals, d] }));
    return d;
  }, []);

  const atualizarDeal = useCallback(
    async (id: string, patch: Partial<DealInput>) => {
      const d = await dealRepository.update(id, patch);
      setState((s) => ({ ...s, deals: s.deals.map((x) => (x.id === id ? d : x)) }));
      return d;
    },
    [],
  );

  const removerDeal = useCallback(async (id: string) => {
    await dealRepository.remove(id);
    setState((s) => ({ ...s, deals: s.deals.filter((x) => x.id !== id) }));
  }, []);

  // ── Clientes ───────────────────────────────────────────────────────────
  const criarCliente = useCallback(async (input: ClienteInput) => {
    const c = await clientRepository.create(input);
    setState((s) => ({ ...s, clientes: [...s.clientes, c] }));
    return c;
  }, []);

  const atualizarCliente = useCallback(
    async (id: string, patch: Partial<ClienteInput>) => {
      const c = await clientRepository.update(id, patch);
      setState((s) => ({
        ...s,
        clientes: s.clientes.map((x) => (x.id === id ? c : x)),
      }));
      return c;
    },
    [],
  );

  const clienteEmUso = useCallback(
    (id: string) => ref.current.deals.filter((d) => d.clienteId === id).length,
    [],
  );

  const removerCliente = useCallback(
    async (id: string): Promise<OpResult> => {
      const usos = ref.current.deals.filter((d) => d.clienteId === id).length;
      if (usos > 0) {
        return {
          ok: false,
          erro: `Não é possível excluir: ${usos} ${usos === 1 ? "oportunidade usa" : "oportunidades usam"} este cliente. Reatribua antes de excluir.`,
        };
      }
      await clientRepository.remove(id);
      setState((s) => ({ ...s, clientes: s.clientes.filter((x) => x.id !== id) }));
      return { ok: true };
    },
    [],
  );

  // ── Origens ────────────────────────────────────────────────────────────
  const criarOrigem = useCallback(async (input: OrigemInput) => {
    const o = await originRepository.create(input);
    setState((s) => ({ ...s, origens: [...s.origens, o] }));
    return o;
  }, []);

  const atualizarOrigem = useCallback(
    async (id: string, patch: Partial<OrigemInput>) => {
      const o = await originRepository.update(id, patch);
      setState((s) => ({
        ...s,
        origens: s.origens.map((x) => (x.id === id ? o : x)),
      }));
      return o;
    },
    [],
  );

  const origemEmUso = useCallback(
    (id: string) => ref.current.deals.filter((d) => d.origemId === id).length,
    [],
  );

  const removerOrigem = useCallback(async (id: string): Promise<OpResult> => {
    const usos = ref.current.deals.filter((d) => d.origemId === id).length;
    if (usos > 0) {
      return {
        ok: false,
        erro: `Não é possível excluir: ${usos} ${usos === 1 ? "oportunidade usa" : "oportunidades usam"} esta origem. Reatribua antes de excluir.`,
      };
    }
    await originRepository.remove(id);
    setState((s) => ({ ...s, origens: s.origens.filter((x) => x.id !== id) }));
    return { ok: true };
  }, []);

  // ── Etapas ─────────────────────────────────────────────────────────────
  const criarEtapa = useCallback(async (input: EtapaInput) => {
    const e = await stageRepository.create(input);
    setState((s) => ({ ...s, etapas: [...s.etapas, e] }));
    return e;
  }, []);

  const atualizarEtapa = useCallback(
    async (id: string, patch: Partial<EtapaInput>) => {
      const e = await stageRepository.update(id, patch);
      setState((s) => ({
        ...s,
        etapas: s.etapas.map((x) => (x.id === id ? e : x)),
      }));
      return e;
    },
    [],
  );

  const etapaEmUso = useCallback(
    (id: string) => ref.current.deals.filter((d) => d.etapaId === id).length,
    [],
  );

  const removerEtapa = useCallback(async (id: string): Promise<OpResult> => {
    const etapa = ref.current.etapas.find((e) => e.id === id);
    if (etapa?.final) {
      return {
        ok: false,
        erro: "A etapa de fechamento (ganho) é necessária e não pode ser excluída.",
      };
    }
    if (etapasAtivas(ref.current.etapas).length <= 1) {
      return { ok: false, erro: "É preciso manter ao menos uma etapa de progressão." };
    }
    const usos = ref.current.deals.filter((d) => d.etapaId === id).length;
    if (usos > 0) {
      return {
        ok: false,
        erro: `Não é possível excluir: ${usos} ${usos === 1 ? "oportunidade está" : "oportunidades estão"} nesta etapa. Mova-as antes de excluir.`,
      };
    }
    await stageRepository.remove(id);
    setState((s) => ({ ...s, etapas: s.etapas.filter((x) => x.id !== id) }));
    return { ok: true };
  }, []);

  // Reordena trocando a posição `ordem` com a etapa vizinha (entre as ativas).
  const moverEtapa = useCallback(async (id: string, dir: -1 | 1) => {
    const ativas = etapasAtivas(ref.current.etapas);
    const idx = ativas.findIndex((e) => e.id === id);
    const alvoIdx = idx + dir;
    if (idx === -1 || alvoIdx < 0 || alvoIdx >= ativas.length) return;
    const a = ativas[idx];
    const b = ativas[alvoIdx];
    const [ua, ub] = await Promise.all([
      stageRepository.update(a.id, { ordem: b.ordem }),
      stageRepository.update(b.id, { ordem: a.ordem }),
    ]);
    setState((s) => ({
      ...s,
      etapas: s.etapas.map((x) =>
        x.id === ua.id ? ua : x.id === ub.id ? ub : x,
      ),
    }));
  }, []);

  // ── Lookups ────────────────────────────────────────────────────────────
  const clienteNome = useCallback(
    (id: string) =>
      ref.current.clientes.find((c) => c.id === id)?.nome ?? "Cliente removido",
    [],
  );
  const origemNome = useCallback(
    (id: string) => ref.current.origens.find((o) => o.id === id)?.nome ?? "—",
    [],
  );

  const value: CrmContextValue = {
    carregando,
    state,
    criarDeal,
    atualizarDeal,
    removerDeal,
    criarCliente,
    atualizarCliente,
    removerCliente,
    clienteEmUso,
    criarOrigem,
    atualizarOrigem,
    removerOrigem,
    origemEmUso,
    criarEtapa,
    atualizarEtapa,
    removerEtapa,
    moverEtapa,
    etapaEmUso,
    clienteNome,
    origemNome,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm deve ser usado dentro de <CrmProvider>");
  return ctx;
}

// ── Hooks dedicados ────────────────────────────────────────────────────────
export function useDeals() {
  const c = useCrm();
  return {
    deals: c.state.deals,
    carregando: c.carregando,
    criar: c.criarDeal,
    atualizar: c.atualizarDeal,
    remover: c.removerDeal,
  };
}

export function useClients() {
  const c = useCrm();
  return {
    clientes: c.state.clientes,
    carregando: c.carregando,
    criar: c.criarCliente,
    atualizar: c.atualizarCliente,
    remover: c.removerCliente,
    emUso: c.clienteEmUso,
  };
}

export function useOrigins() {
  const c = useCrm();
  return {
    origens: c.state.origens,
    carregando: c.carregando,
    criar: c.criarOrigem,
    atualizar: c.atualizarOrigem,
    remover: c.removerOrigem,
    emUso: c.origemEmUso,
  };
}

export function useStages() {
  const c = useCrm();
  return {
    etapas: c.state.etapas,
    ativas: etapasAtivas(c.state.etapas),
    final: etapaFinal(c.state.etapas),
    carregando: c.carregando,
    criar: c.criarEtapa,
    atualizar: c.atualizarEtapa,
    remover: c.removerEtapa,
    mover: c.moverEtapa,
    emUso: c.etapaEmUso,
  };
}

/** Resolvedores de nome por id, para exibição em cards/listas. */
export function useResolvers() {
  const c = useCrm();
  return { clienteNome: c.clienteNome, origemNome: c.origemNome };
}
