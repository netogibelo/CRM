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
  Contato,
  ContatoInput,
  CrmState,
  Deal,
  DealInput,
  DealServico,
  DealServicoInput,
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
  TipoServico,
  TipoServicoInput,
} from "./types";
import {
  automacaoRepository,
  clientRepository,
  contatoRepository,
  dealRepository,
  historicoRepository,
  loadCrmSnapshot,
  metaRepository,
  originRepository,
  perfilRepository,
  servicoRepository,
  stageRepository,
  tarefaRepository,
  tipoServicoRepository,
} from "./repository";
import { etapaFinal, etapasAtivas } from "./stages";
import { supabase } from "./supabase";
import { executarAutomacao, selecionarAutomacoes } from "./automacoes-engine";
import { notificarErro } from "./toast-store";

/** Resultado de operações que podem ser bloqueadas por integridade referencial. */
export interface OpResult {
  ok: boolean;
  erro?: string;
}

interface CrmContextValue {
  carregando: boolean;
  /** true quando o carregamento inicial falhou (Supabase indisponível). */
  erroBoot: boolean;
  /** Tenta o carregamento inicial novamente. */
  recarregar: () => void;
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
  reordenarOrigens: (idsOrdenados: string[]) => Promise<void>;
  origemEmUso: (id: string) => number;
  // etapas
  criarEtapa: (input: EtapaInput) => Promise<Etapa>;
  atualizarEtapa: (id: string, patch: Partial<EtapaInput>) => Promise<Etapa>;
  removerEtapa: (id: string) => Promise<OpResult>;
  moverEtapa: (id: string, dir: -1 | 1) => Promise<void>;
  reordenarEtapas: (idsOrdenados: string[]) => Promise<void>;
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
  reordenarAutomacoes: (idsOrdenados: string[]) => Promise<void>;
  // perfis
  perfis: Perfil[];
  salvarPerfil: (input: PerfilInput) => Promise<Perfil>;
  // metas
  metas: Meta[];
  salvarMeta: (input: MetaInput) => Promise<Meta>;
  // servicos
  servicos: DealServico[];
  criarServico: (input: DealServicoInput) => Promise<DealServico>;
  atualizarServico: (
    id: string,
    patch: Partial<DealServicoInput>,
  ) => Promise<DealServico>;
  removerServico: (id: string) => Promise<void>;
  // contatos
  contatos: Contato[];
  criarContato: (input: ContatoInput) => Promise<Contato>;
  atualizarContato: (id: string, patch: Partial<ContatoInput>) => Promise<Contato>;
  removerContato: (id: string) => Promise<OpResult>;
  contatoEmUso: (id: string) => number;
  // tipos de servico (catálogo de sugestões configurável)
  tiposServico: TipoServico[];
  criarTipoServico: (input: TipoServicoInput) => Promise<TipoServico>;
  atualizarTipoServico: (
    id: string,
    patch: Partial<TipoServicoInput>,
  ) => Promise<TipoServico>;
  desativarTipoServico: (id: string) => Promise<TipoServico>;
  moverTipoServico: (id: string, dir: -1 | 1) => Promise<void>;
  reordenarTiposServico: (idsOrdenados: string[]) => Promise<void>;
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
  const [servicos, setServicos] = useState<DealServico[]>([]);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroBoot, setErroBoot] = useState(false);
  const montadoRef = useRef(true);

  const refTiposServico = useRef(tiposServico);
  refTiposServico.current = tiposServico;
  const refContatos = useRef(contatos);
  refContatos.current = contatos;

  // Ref sempre com o estado mais recente, para checagens de integridade.
  const ref = useRef(state);
  ref.current = state;
  const refAutomacoes = useRef(automacoes);
  refAutomacoes.current = automacoes;

  // Carregamento inicial. O snapshot principal NÃO tem fallback silencioso:
  // se o Supabase estiver indisponível, sinaliza `erroBoot` (tela de erro com
  // retry) em vez de deixar a UI presa em "carregando" para sempre.
  const recarregar = useCallback(() => {
    setCarregando(true);
    setErroBoot(false);
    (async () => {
      try {
        const [
          snapshot,
          listaTarefas,
          listaAutomacoes,
          listaPerfis,
          listaMetas,
          listaServicos,
          listaTiposServico,
          listaContatos,
        ] = await Promise.all([
          loadCrmSnapshot(),
          tarefaRepository.listAll().catch(() => []),
          automacaoRepository.listAll().catch(() => []),
          perfilRepository.listAll().catch(() => []),
          metaRepository.listAll().catch(() => []),
          servicoRepository.listAll().catch(() => []),
          tipoServicoRepository.listAll().catch(() => []),
          contatoRepository.listAll().catch(() => []),
        ]);
        if (!montadoRef.current) return;
        setState(snapshot);
        setTarefas(listaTarefas);
        setAutomacoes(listaAutomacoes);
        setPerfis(listaPerfis);
        setMetas(listaMetas);
        setServicos(listaServicos);
        setTiposServico(listaTiposServico);
        setContatos(listaContatos);
      } catch (err) {
        if (!montadoRef.current) return;
        console.error("Falha no carregamento inicial do CRM:", err);
        setErroBoot(true);
        notificarErro("Falha ao conectar. Verifique sua conexão.");
      } finally {
        if (montadoRef.current) setCarregando(false);
      }
    })();
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    recarregar();
    return () => {
      montadoRef.current = false;
    };
  }, [recarregar]);

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

  const reordenarOrigens = useCallback(async (idsOrdenados: string[]) => {
    // Update otimista local + persist em paralelo.
    setState((s) => ({
      ...s,
      origens: s.origens
        .map((o) => {
          const idx = idsOrdenados.indexOf(o.id);
          return idx === -1 ? o : { ...o, ordem: idx };
        })
        .sort((a, b) => a.ordem - b.ordem),
    }));
    await originRepository.reorder(idsOrdenados);
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

  const reordenarEtapas = useCallback(async (idsOrdenados: string[]) => {
    setState((s) => ({
      ...s,
      etapas: s.etapas.map((e) => {
        const idx = idsOrdenados.indexOf(e.id);
        return idx === -1 ? e : { ...e, ordem: idx };
      }),
    }));
    await stageRepository.reorder(idsOrdenados);
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

  const reordenarAutomacoes = useCallback(async (idsOrdenados: string[]) => {
    setAutomacoes((prev) =>
      prev
        .map((a) => {
          const idx = idsOrdenados.indexOf(a.id);
          return idx === -1 ? a : { ...a, ordem: idx };
        })
        .sort((a, b) => a.ordem - b.ordem),
    );
    await automacaoRepository.reorder(idsOrdenados);
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

  // ── Serviços (itens do deal) ───────────────────────────────────────────
  const criarServico = useCallback(async (input: DealServicoInput) => {
    const s = await servicoRepository.create(input);
    setServicos((prev) => [...prev, s]);
    return s;
  }, []);

  const atualizarServico = useCallback(
    async (id: string, patch: Partial<DealServicoInput>) => {
      const s = await servicoRepository.update(id, patch);
      setServicos((prev) => prev.map((x) => (x.id === id ? s : x)));
      return s;
    },
    [],
  );

  const removerServico = useCallback(async (id: string) => {
    await servicoRepository.remove(id);
    setServicos((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Tipos de serviço (catálogo configurável) ───────────────────────────
  const criarTipoServico = useCallback(async (input: TipoServicoInput) => {
    const t = await tipoServicoRepository.create(input);
    setTiposServico((prev) => [...prev, t]);
    return t;
  }, []);

  const atualizarTipoServico = useCallback(
    async (id: string, patch: Partial<TipoServicoInput>) => {
      const t = await tipoServicoRepository.update(id, patch);
      setTiposServico((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    [],
  );

  const desativarTipoServico = useCallback(async (id: string) => {
    const t = await tipoServicoRepository.desativar(id);
    setTiposServico((prev) => prev.map((x) => (x.id === id ? t : x)));
    return t;
  }, []);

  const reordenarTiposServico = useCallback(async (idsOrdenados: string[]) => {
    setTiposServico((prev) =>
      prev
        .map((t) => {
          const idx = idsOrdenados.indexOf(t.id);
          return idx === -1 ? t : { ...t, ordem: idx };
        })
        .sort((a, b) => a.ordem - b.ordem),
    );
    await tipoServicoRepository.reorder(idsOrdenados);
  }, []);

  // Reordena entre itens ativos trocando a posição com o vizinho.
  const moverTipoServico = useCallback(async (id: string, dir: -1 | 1) => {
    const ativos = refTiposServico.current
      .filter((t) => t.ativo)
      .sort((a, b) => a.ordem - b.ordem);
    const idx = ativos.findIndex((t) => t.id === id);
    const alvoIdx = idx + dir;
    if (idx === -1 || alvoIdx < 0 || alvoIdx >= ativos.length) return;
    const a = ativos[idx];
    const b = ativos[alvoIdx];
    const [ua, ub] = await Promise.all([
      tipoServicoRepository.update(a.id, { ordem: b.ordem }),
      tipoServicoRepository.update(b.id, { ordem: a.ordem }),
    ]);
    const trocados = new Map([
      [ua.id, ua],
      [ub.id, ub],
    ]);
    setTiposServico((prev) => prev.map((x) => trocados.get(x.id) ?? x));
  }, []);

  // ── Contatos ───────────────────────────────────────────────────────────
  // Desmarca o "principal" dos demais contatos do cliente, espelhando no state
  // apenas os updates que o Supabase confirmou. Falha parcial → erro visível.
  const desmarcarPrincipais = useCallback(
    async (clienteId: string, exceto?: string) => {
      const outros = refContatos.current.filter(
        (c) => c.clienteId === clienteId && c.principal && c.id !== exceto,
      );
      if (outros.length === 0) return;
      const resultados = await Promise.allSettled(
        outros.map((o) => contatoRepository.update(o.id, { principal: false })),
      );
      const okIds = new Set(
        outros.filter((_, i) => resultados[i].status === "fulfilled").map((o) => o.id),
      );
      if (okIds.size > 0) {
        setContatos((prev) =>
          prev.map((c) => (okIds.has(c.id) ? { ...c, principal: false } : c)),
        );
      }
      if (okIds.size < outros.length) {
        notificarErro(
          "Não foi possível atualizar o contato principal. Tente novamente.",
        );
        throw new Error("Falha ao desmarcar contato principal");
      }
    },
    [],
  );

  const criarContato = useCallback(
    async (input: ContatoInput) => {
      if (input.principal) {
        await desmarcarPrincipais(input.clienteId);
      }
      const c = await contatoRepository.create(input);
      setContatos((prev) => [...prev, c]);
      return c;
    },
    [desmarcarPrincipais],
  );

  const atualizarContato = useCallback(
    async (id: string, patch: Partial<ContatoInput>) => {
      const atual = refContatos.current.find((c) => c.id === id);
      // Se vai marcar como principal, desmarcar outros do mesmo cliente.
      if (patch.principal === true && atual) {
        await desmarcarPrincipais(atual.clienteId, id);
      }
      const c = await contatoRepository.update(id, patch);
      setContatos((prev) => prev.map((x) => (x.id === id ? c : x)));
      return c;
    },
    [desmarcarPrincipais],
  );

  const contatoEmUso = useCallback(
    (id: string) => ref.current.deals.filter((d) => d.contatoId === id).length,
    [],
  );

  const removerContato = useCallback(
    async (id: string): Promise<OpResult> => {
      const usos = ref.current.deals.filter((d) => d.contatoId === id).length;
      if (usos > 0) {
        return {
          ok: false,
          erro: `Não é possível excluir: ${usos} ${usos === 1 ? "oportunidade usa" : "oportunidades usam"} este contato. Reatribua antes de excluir.`,
        };
      }
      await contatoRepository.remove(id);
      setContatos((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    },
    [],
  );

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
    erroBoot,
    recarregar,
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
    reordenarOrigens,
    origemEmUso,
    criarEtapa,
    atualizarEtapa,
    removerEtapa,
    moverEtapa,
    reordenarEtapas,
    etapaEmUso,
    tarefas,
    criarTarefa,
    atualizarTarefa,
    removerTarefa,
    automacoes,
    criarAutomacao,
    atualizarAutomacao,
    removerAutomacao,
    reordenarAutomacoes,
    perfis,
    salvarPerfil,
    metas,
    salvarMeta,
    servicos,
    criarServico,
    atualizarServico,
    removerServico,
    contatos,
    criarContato,
    atualizarContato,
    removerContato,
    contatoEmUso,
    tiposServico,
    criarTipoServico,
    atualizarTipoServico,
    desativarTipoServico,
    moverTipoServico,
    reordenarTiposServico,
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
    erroBoot: c.erroBoot,
    recarregar: c.recarregar,
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
  const ordenadas = useMemo(
    () => [...c.state.origens].sort((a, b) => a.ordem - b.ordem),
    [c.state.origens],
  );
  return {
    origens: ordenadas,
    carregando: c.carregando,
    criar: c.criarOrigem,
    atualizar: c.atualizarOrigem,
    remover: c.removerOrigem,
    reordenar: c.reordenarOrigens,
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
    reordenar: c.reordenarEtapas,
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
    reordenar: c.reordenarAutomacoes,
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

export function useServicos() {
  const c = useCrm();
  return {
    servicos: c.servicos,
    criar: c.criarServico,
    atualizar: c.atualizarServico,
    remover: c.removerServico,
  };
}

export function useContatos() {
  const c = useCrm();
  const byCliente = useCallback(
    (clienteId: string) =>
      c.contatos
        .filter((ct) => ct.clienteId === clienteId)
        .sort((a, b) => {
          if (a.principal !== b.principal) return a.principal ? -1 : 1;
          return a.nome.localeCompare(b.nome);
        }),
    [c.contatos],
  );
  const principal = useCallback(
    (clienteId: string) =>
      c.contatos.find((ct) => ct.clienteId === clienteId && ct.principal) ??
      null,
    [c.contatos],
  );
  const porId = useCallback(
    (id: string | null | undefined) =>
      id ? c.contatos.find((ct) => ct.id === id) ?? null : null,
    [c.contatos],
  );
  return {
    contatos: c.contatos,
    byCliente,
    principal,
    porId,
    criar: c.criarContato,
    atualizar: c.atualizarContato,
    remover: c.removerContato,
    emUso: c.contatoEmUso,
  };
}

export function useTiposServico() {
  const c = useCrm();
  const ativos = useMemo(
    () =>
      c.tiposServico
        .filter((t) => t.ativo)
        .sort((a, b) => a.ordem - b.ordem),
    [c.tiposServico],
  );
  return {
    todos: c.tiposServico,
    ativos,
    criar: c.criarTipoServico,
    atualizar: c.atualizarTipoServico,
    desativar: c.desativarTipoServico,
    mover: c.moverTipoServico,
    reordenar: c.reordenarTiposServico,
  };
}
