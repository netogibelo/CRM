"use client";

// Provider único que carrega o estado do CRM (deals, clientes, origens, etapas)
// e expõe hooks dedicados. A consistência entre as coleções fica garantida por
// uma única fonte em memória; a persistência continua nos repositórios.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Automacao,
  Cliente,
  ClienteInput,
  CrmState,
  Deal,
  DealInput,
  Etapa,
  EtapaInput,
  Meta,
  MetaInput,
  Origem,
  OrigemInput,
  Perfil,
  PerfilInput,
  Tarefa,
  TarefaInput,
} from "./types";
import {
  automacaoRepository,
  clientRepository,
  dealRepository,
  historicoRepository,
  loadCrmSnapshot,
  metaRepository,
  originRepository,
  perfilRepository,
  stageRepository,
  tarefaRepository,
} from "./repository";
import { etapaFinal, etapasAtivas } from "./stages";
import { supabase } from "./supabase";
import { executarAutomacao, selecionarAutomacoes } from "./automacoes-engine";

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
  // tarefas
  tarefas: Tarefa[];
  criarTarefa: (input: TarefaInput) => Promise<Tarefa>;
  atualizarTarefa: (id: string, patch: Partial<TarefaInput>) => Promise<Tarefa>;
  removerTarefa: (id: string) => Promise<void>;
  // automacoes
  automacoes: Automacao[];
  criarAutomacao: (
    input: import("./types").AutomacaoInput,
  ) => Promise<Automacao>;
  atualizarAutomacao: (
    id: string,
    patch: Partial<import("./types").AutomacaoInput>,
  ) => Promise<Automacao>;
  removerAutomacao: (id: string) => Promise<void>;
  // perfis
  perfis: Perfil[];
  salvarPerfil: (input: PerfilInput) => Promise<Perfil>;
  // metas
  metas: Meta[];
  salvarMeta: (input: MetaInput) => Promise<Meta>;
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
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Ref sempre com o estado mais recente, para checagens de integridade.
  const ref = useRef(state);
  ref.current = state;
  const refAutomacoes = useRef(automacoes);
  refAutomacoes.current = automacoes;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [snapshot, listaTarefas, listaAutomacoes, listaPerfis, listaMetas] =
        await Promise.all([
          loadCrmSnapshot(),
          tarefaRepository.listAll().catch(() => []),
          automacaoRepository.listAll().catch(() => []),
          perfilRepository.listAll().catch(() => []),
          metaRepository.listAll().catch(() => []),
        ]);
      if (ativo) {
        setState(snapshot);
        setTarefas(listaTarefas);
        setAutomacoes(listaAutomacoes);
        setPerfis(listaPerfis);
        setMetas(listaMetas);
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

    // Automações: gatilho "deal_criado"
    const aDisparar = selecionarAutomacoes(refAutomacoes.current, {
      tipo: "deal_criado",
    });
    for (const a of aDisparar) await executarAutomacao(a, d);
    // Tarefas criadas por automação precisam ser refletidas no estado.
    if (aDisparar.some((a) => a.acao === "criar_tarefa")) {
      const novas = await tarefaRepository.listByDeal(d.id).catch(() => []);
      setTarefas((prev) => [...prev.filter((t) => t.dealId !== d.id), ...novas]);
    }

    return d;
  }, []);

  const atualizarDeal = useCallback(
    async (id: string, patch: Partial<DealInput>) => {
      const anterior = ref.current.deals.find((x) => x.id === id);
      const d = await dealRepository.update(id, patch);
      setState((s) => ({ ...s, deals: s.deals.map((x) => (x.id === id ? d : x)) }));

      // Auto-registro: mudança de etapa vira evento na timeline + dispara automações.
      if (anterior && anterior.etapaId !== d.etapaId) {
        const eAnt = ref.current.etapas.find((e) => e.id === anterior.etapaId);
        const eNew = ref.current.etapas.find((e) => e.id === d.etapaId);
        if (eAnt && eNew) {
          const { data: userData } = await supabase.auth.getUser();
          await historicoRepository
            .create({
              dealId: id,
              tipo: "mudanca_etapa",
              descricao: `Movido de "${eAnt.nome}" para "${eNew.nome}"`,
              autorEmail: userData.user?.email ?? null,
            })
            .catch(() => null);
        }

        const aDisparar = selecionarAutomacoes(refAutomacoes.current, {
          tipo: "deal_entra_etapa",
          etapaId: d.etapaId,
        });
        for (const a of aDisparar) await executarAutomacao(a, d);
        if (aDisparar.some((a) => a.acao === "criar_tarefa")) {
          const novas = await tarefaRepository.listByDeal(d.id).catch(() => []);
          setTarefas((prev) => [
            ...prev.filter((t) => t.dealId !== d.id),
            ...novas,
          ]);
        }
      }

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
    const trocadas = new Map([
      [ua.id, ua],
      [ub.id, ub],
    ]);
    setState((s) => ({
      ...s,
      etapas: s.etapas.map((x) => trocadas.get(x.id) ?? x),
    }));
  }, []);

  // ── Tarefas ────────────────────────────────────────────────────────────
  const criarTarefa = useCallback(async (input: TarefaInput) => {
    const t = await tarefaRepository.create(input);
    setTarefas((prev) => [...prev, t]);
    return t;
  }, []);

  const atualizarTarefa = useCallback(
    async (id: string, patch: Partial<TarefaInput>) => {
      const t = await tarefaRepository.update(id, patch);
      setTarefas((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    [],
  );

  const removerTarefa = useCallback(async (id: string) => {
    await tarefaRepository.remove(id);
    setTarefas((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Automações ─────────────────────────────────────────────────────────
  const criarAutomacao = useCallback(
    async (input: import("./types").AutomacaoInput) => {
      const a = await automacaoRepository.create(input);
      setAutomacoes((prev) => [...prev, a]);
      return a;
    },
    [],
  );

  const atualizarAutomacao = useCallback(
    async (id: string, patch: Partial<import("./types").AutomacaoInput>) => {
      const a = await automacaoRepository.update(id, patch);
      setAutomacoes((prev) => prev.map((x) => (x.id === id ? a : x)));
      return a;
    },
    [],
  );

  const removerAutomacao = useCallback(async (id: string) => {
    await automacaoRepository.remove(id);
    setAutomacoes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Perfis ─────────────────────────────────────────────────────────────
  const salvarPerfil = useCallback(async (input: PerfilInput) => {
    const p = await perfilRepository.upsert(input);
    setPerfis((prev) => {
      const semEle = prev.filter((x) => x.id !== p.id);
      return [...semEle, p];
    });
    return p;
  }, []);

  // ── Metas ──────────────────────────────────────────────────────────────
  const salvarMeta = useCallback(async (input: MetaInput) => {
    const m = await metaRepository.upsert(input);
    setMetas((prev) => {
      const semEle = prev.filter((x) => x.mes !== m.mes);
      return [m, ...semEle];
    });
    return m;
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
    tarefas,
    criarTarefa,
    atualizarTarefa,
    removerTarefa,
    automacoes,
    criarAutomacao,
    atualizarAutomacao,
    removerAutomacao,
    perfis,
    salvarPerfil,
    metas,
    salvarMeta,
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
  const ativas = useMemo(() => etapasAtivas(c.state.etapas), [c.state.etapas]);
  const final = useMemo(() => etapaFinal(c.state.etapas), [c.state.etapas]);
  return {
    etapas: c.state.etapas,
    ativas,
    final,
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

export function useTarefas() {
  const c = useCrm();
  return {
    tarefas: c.tarefas,
    carregando: c.carregando,
    criar: c.criarTarefa,
    atualizar: c.atualizarTarefa,
    remover: c.removerTarefa,
  };
}

export function useAutomacoes() {
  const c = useCrm();
  return {
    automacoes: c.automacoes,
    carregando: c.carregando,
    criar: c.criarAutomacao,
    atualizar: c.atualizarAutomacao,
    remover: c.removerAutomacao,
  };
}

export function usePerfis() {
  const c = useCrm();
  return {
    perfis: c.perfis,
    salvar: c.salvarPerfil,
  };
}

export function useMetas() {
  const c = useCrm();
  return {
    metas: c.metas,
    salvar: c.salvarMeta,
  };
}
