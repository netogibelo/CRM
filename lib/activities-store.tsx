"use client";

// Provider e hook do quadro de atividades (Trello). Persistência separada do
// funil, em `gibelo-atividades-state`, atrás do mesmo padrão de repositório.

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
  AtividadeCard,
  AtividadeCardEtiqueta,
  AtividadeCardInput,
  AtividadeChecklistItem,
  AtividadeEtiqueta,
  AtividadeEtiquetaInput,
  AtividadeLista,
  AtividadesState,
  AtividadeTemplate,
  AtividadeTemplateInput,
  ListaCor,
} from "./types";
import {
  activityRepository,
  atividadeHistoricoRepository,
  atividadeTemplateRepository,
  checklistRepository,
  etiquetaRepository,
} from "./repository";
import { LISTA_COR_IDS } from "./atividade-cores";
import { supabase } from "./supabase";
import { notificarAviso } from "./toast-store";

async function autorEmail(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

interface ActivitiesContextValue {
  carregando: boolean;
  listas: AtividadeLista[];
  cards: AtividadeCard[];
  checklist: AtividadeChecklistItem[];
  criarLista: (nome: string) => Promise<AtividadeLista>;
  renomearLista: (id: string, nome: string) => Promise<void>;
  pintarLista: (id: string, cor: ListaCor) => Promise<void>;
  removerLista: (id: string) => Promise<void>;
  moverLista: (id: string, dir: -1 | 1) => Promise<void>;
  /** Reaplica a ordem das listas a partir da sequência de ids (usado no DnD). */
  reordenarListas: (ids: string[]) => Promise<void>;
  criarCard: (
    input: Omit<AtividadeCardInput, "ordem">,
  ) => Promise<AtividadeCard>;
  atualizarCard: (
    id: string,
    patch: Partial<AtividadeCardInput>,
  ) => Promise<AtividadeCard>;
  removerCard: (id: string) => Promise<void>;
  moverCard: (id: string, listaId: string) => Promise<void>;
  // Checklist (F1)
  criarChecklistItem: (cardId: string, titulo: string) => Promise<void>;
  atualizarChecklistItem: (
    id: string,
    patch: { titulo?: string; concluida?: boolean },
  ) => Promise<void>;
  removerChecklistItem: (id: string) => Promise<void>;
  reordenarChecklist: (cardId: string, idsOrdenados: string[]) => Promise<void>;
  // Etiquetas (F2)
  etiquetas: AtividadeEtiqueta[];
  cardEtiquetas: AtividadeCardEtiqueta[];
  criarEtiqueta: (input: AtividadeEtiquetaInput) => Promise<AtividadeEtiqueta>;
  atualizarEtiqueta: (
    id: string,
    patch: Partial<AtividadeEtiquetaInput>,
  ) => Promise<void>;
  removerEtiqueta: (id: string) => Promise<void>;
  reordenarEtiquetas: (idsOrdenados: string[]) => Promise<void>;
  toggleEtiquetaNoCard: (cardId: string, etiquetaId: string) => Promise<void>;
  // Concluir/Reabrir card (F4); se recorrente, clona com próxima data
  concluirCard: (id: string, concluir: boolean) => Promise<void>;
  // Templates (F8)
  templates: AtividadeTemplate[];
  criarTemplate: (input: AtividadeTemplateInput) => Promise<AtividadeTemplate>;
  atualizarTemplate: (
    id: string,
    patch: Partial<AtividadeTemplateInput>,
  ) => Promise<void>;
  removerTemplate: (id: string) => Promise<void>;
  reordenarTemplates: (idsOrdenados: string[]) => Promise<void>;
  /** Cria um card a partir de um template, retornando o card criado. */
  criarCardPorTemplate: (
    templateId: string,
    listaId: string,
  ) => Promise<AtividadeCard | null>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AtividadesState>({
    listas: [],
    cards: [],
    checklist: [],
    etiquetas: [],
    cardEtiquetas: [],
  });
  const [templates, setTemplates] = useState<AtividadeTemplate[]>([]);
  const [carregando, setCarregando] = useState(true);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [s, tpls] = await Promise.all([
        activityRepository.load(),
        atividadeTemplateRepository.listAll().catch(() => []),
      ]);
      if (ativo) {
        setState(s);
        setTemplates(tpls);
        setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const criarLista = useCallback(async (nome: string) => {
    const ordem =
      ref.current.listas.reduce((m, l) => Math.max(m, l.ordem), -1) + 1;
    const cor = LISTA_COR_IDS[ref.current.listas.length % LISTA_COR_IDS.length];
    const lista = await activityRepository.createLista({ nome, ordem, cor });
    setState((s) => ({ ...s, listas: [...s.listas, lista] }));
    return lista;
  }, []);

  const renomearLista = useCallback(async (id: string, nome: string) => {
    const upd = await activityRepository.updateLista(id, { nome });
    setState((s) => ({
      ...s,
      listas: s.listas.map((l) => (l.id === id ? upd : l)),
    }));
  }, []);

  const pintarLista = useCallback(async (id: string, cor: ListaCor) => {
    const upd = await activityRepository.updateLista(id, { cor });
    setState((s) => ({
      ...s,
      listas: s.listas.map((l) => (l.id === id ? upd : l)),
    }));
  }, []);

  const removerLista = useCallback(async (id: string) => {
    await activityRepository.removeLista(id);
    setState((s) => {
      const cardsRestantes = s.cards.filter((c) => c.listaId !== id);
      const cardIdsRestantes = new Set(cardsRestantes.map((c) => c.id));
      return {
        ...s,
        listas: s.listas.filter((l) => l.id !== id),
        cards: cardsRestantes,
        checklist: s.checklist.filter((c) => cardIdsRestantes.has(c.cardId)),
        cardEtiquetas: s.cardEtiquetas.filter((ce) =>
          cardIdsRestantes.has(ce.cardId),
        ),
      };
    });
  }, []);

  const moverLista = useCallback(async (id: string, dir: -1 | 1) => {
    const ord = [...ref.current.listas].sort((a, b) => a.ordem - b.ordem);
    const idx = ord.findIndex((l) => l.id === id);
    const alvo = idx + dir;
    if (idx === -1 || alvo < 0 || alvo >= ord.length) return;
    const a = ord[idx];
    const b = ord[alvo];
    const [ua, ub] = await Promise.all([
      activityRepository.updateLista(a.id, { ordem: b.ordem }),
      activityRepository.updateLista(b.id, { ordem: a.ordem }),
    ]);
    const trocadas = new Map([
      [ua.id, ua],
      [ub.id, ub],
    ]);
    setState((s) => ({
      ...s,
      listas: s.listas.map((l) => trocadas.get(l.id) ?? l),
    }));
  }, []);

  const reordenarListas = useCallback(async (ids: string[]) => {
    const updated = await Promise.all(
      ids.map((id, i) => activityRepository.updateLista(id, { ordem: i })),
    );
    const byId = new Map(updated.map((l) => [l.id, l]));
    setState((s) => ({
      ...s,
      listas: s.listas.map((l) => byId.get(l.id) ?? l),
    }));
  }, []);

  const criarCard = useCallback(
    async (input: Omit<AtividadeCardInput, "ordem">) => {
      const card = await activityRepository.createCard({
        ...input,
        ordem: Date.now(),
      });
      setState((s) => ({ ...s, cards: [...s.cards, card] }));
      const lista = ref.current.listas.find((l) => l.id === card.listaId);
      atividadeHistoricoRepository.log({
        cardId: card.id,
        autorEmail: await autorEmail(),
        tipo: "criacao",
        descricao: `Card criado na lista "${lista?.nome ?? "—"}"`,
      });
      return card;
    },
    [],
  );

  const atualizarCard = useCallback(
    async (id: string, patch: Partial<AtividadeCardInput>) => {
      const anterior = ref.current.cards.find((c) => c.id === id);
      const upd = await activityRepository.updateCard(id, patch);
      setState((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === id ? upd : c)),
      }));

      // Auditoria: movimentação e edição de título.
      if (anterior) {
        if (patch.listaId !== undefined && patch.listaId !== anterior.listaId) {
          const de = ref.current.listas.find((l) => l.id === anterior.listaId);
          const para = ref.current.listas.find((l) => l.id === patch.listaId);
          atividadeHistoricoRepository.log({
            cardId: id,
            autorEmail: await autorEmail(),
            tipo: "movimentacao",
            descricao: `Movido de "${de?.nome ?? "—"}" para "${para?.nome ?? "—"}"`,
          });
        }
        if (
          patch.titulo !== undefined &&
          patch.titulo !== anterior.titulo &&
          patch.titulo.trim()
        ) {
          atividadeHistoricoRepository.log({
            cardId: id,
            autorEmail: await autorEmail(),
            tipo: "edicao",
            descricao: `Título alterado de "${anterior.titulo}" para "${patch.titulo}"`,
          });
        }
      }
      return upd;
    },
    [],
  );

  const removerCard = useCallback(async (id: string) => {
    await activityRepository.removeCard(id);
    setState((s) => ({
      ...s,
      cards: s.cards.filter((c) => c.id !== id),
      checklist: s.checklist.filter((c) => c.cardId !== id),
      cardEtiquetas: s.cardEtiquetas.filter((ce) => ce.cardId !== id),
    }));
  }, []);

  const moverCard = useCallback(async (id: string, listaId: string) => {
    const card = ref.current.cards.find((c) => c.id === id);
    if (!card || card.listaId === listaId) return;
    const upd = await activityRepository.updateCard(id, {
      listaId,
      ordem: Date.now(),
    });
    setState((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === id ? upd : c)),
    }));
  }, []);

  // ── Checklist (F1) ────────────────────────────────────────────────────────
  const criarChecklistItem = useCallback(
    async (cardId: string, titulo: string) => {
      const t = titulo.trim();
      if (!t) return;
      const ordem =
        ref.current.checklist
          .filter((c) => c.cardId === cardId)
          .reduce((m, c) => Math.max(m, c.ordem), -1) + 1;
      const item = await checklistRepository.create({
        cardId,
        titulo: t,
        concluida: false,
        ordem,
      });
      setState((s) => ({ ...s, checklist: [...s.checklist, item] }));
      atividadeHistoricoRepository.log({
        cardId,
        autorEmail: await autorEmail(),
        tipo: "checklist",
        descricao: `Subtarefa adicionada: "${t}"`,
      });
    },
    [],
  );

  const atualizarChecklistItem = useCallback(
    async (id: string, patch: { titulo?: string; concluida?: boolean }) => {
      const anterior = ref.current.checklist.find((c) => c.id === id);
      const upd = await checklistRepository.update(id, patch);
      setState((s) => ({
        ...s,
        checklist: s.checklist.map((c) => (c.id === id ? upd : c)),
      }));
      if (
        anterior &&
        patch.concluida !== undefined &&
        patch.concluida !== anterior.concluida
      ) {
        atividadeHistoricoRepository.log({
          cardId: upd.cardId,
          autorEmail: await autorEmail(),
          tipo: "checklist",
          descricao: patch.concluida
            ? `Subtarefa concluída: "${upd.titulo}"`
            : `Subtarefa reaberta: "${upd.titulo}"`,
        });
      }
    },
    [],
  );

  const removerChecklistItem = useCallback(async (id: string) => {
    await checklistRepository.remove(id);
    setState((s) => ({
      ...s,
      checklist: s.checklist.filter((c) => c.id !== id),
    }));
  }, []);

  const reordenarChecklist = useCallback(
    async (cardId: string, idsOrdenados: string[]) => {
      // Update otimista; em falha, restaura a ordem real do banco.
      setState((s) => ({
        ...s,
        checklist: s.checklist.map((c) => {
          if (c.cardId !== cardId) return c;
          const i = idsOrdenados.indexOf(c.id);
          return i === -1 ? c : { ...c, ordem: i };
        }),
      }));
      try {
        await checklistRepository.reorder(idsOrdenados);
      } catch (err) {
        console.error("Falha ao reordenar checklist:", err);
        const fresh = await checklistRepository
          .listByCard(cardId)
          .catch(() => null);
        if (fresh) {
          setState((s) => ({
            ...s,
            checklist: [
              ...s.checklist.filter((c) => c.cardId !== cardId),
              ...fresh,
            ],
          }));
        }
        notificarAviso("Erro ao reordenar. Ordem restaurada.");
      }
    },
    [],
  );

  // ── Etiquetas (F2) ────────────────────────────────────────────────────────
  const criarEtiqueta = useCallback(async (input: AtividadeEtiquetaInput) => {
    const e = await etiquetaRepository.create(input);
    setState((s) => ({ ...s, etiquetas: [...s.etiquetas, e] }));
    return e;
  }, []);

  const atualizarEtiqueta = useCallback(
    async (id: string, patch: Partial<AtividadeEtiquetaInput>) => {
      const upd = await etiquetaRepository.update(id, patch);
      setState((s) => ({
        ...s,
        etiquetas: s.etiquetas.map((e) => (e.id === id ? upd : e)),
      }));
    },
    [],
  );

  const removerEtiqueta = useCallback(async (id: string) => {
    await etiquetaRepository.remove(id);
    setState((s) => ({
      ...s,
      etiquetas: s.etiquetas.filter((e) => e.id !== id),
      cardEtiquetas: s.cardEtiquetas.filter((ce) => ce.etiquetaId !== id),
    }));
  }, []);

  const reordenarEtiquetas = useCallback(async (idsOrdenados: string[]) => {
    setState((s) => ({
      ...s,
      etiquetas: s.etiquetas
        .map((e) => {
          const i = idsOrdenados.indexOf(e.id);
          return i === -1 ? e : { ...e, ordem: i };
        })
        .sort((a, b) => a.ordem - b.ordem),
    }));
    try {
      await etiquetaRepository.reorder(idsOrdenados);
    } catch (err) {
      console.error("Falha ao reordenar etiquetas:", err);
      const fresh = await etiquetaRepository.listAll().catch(() => null);
      if (fresh) setState((s) => ({ ...s, etiquetas: fresh }));
      notificarAviso("Erro ao reordenar. Ordem restaurada.");
    }
  }, []);

  // ── Templates (F8) ────────────────────────────────────────────────────────
  const criarTemplate = useCallback(async (input: AtividadeTemplateInput) => {
    const t = await atividadeTemplateRepository.create(input);
    setTemplates((prev) => [...prev, t]);
    return t;
  }, []);
  const atualizarTemplate = useCallback(
    async (id: string, patch: Partial<AtividadeTemplateInput>) => {
      const upd = await atividadeTemplateRepository.update(id, patch);
      setTemplates((prev) => prev.map((t) => (t.id === id ? upd : t)));
    },
    [],
  );
  const removerTemplate = useCallback(async (id: string) => {
    await atividadeTemplateRepository.remove(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const reordenarTemplates = useCallback(async (idsOrdenados: string[]) => {
    setTemplates((prev) =>
      prev
        .map((t) => {
          const i = idsOrdenados.indexOf(t.id);
          return i === -1 ? t : { ...t, ordem: i };
        })
        .sort((a, b) => a.ordem - b.ordem),
    );
    try {
      await atividadeTemplateRepository.reorder(idsOrdenados);
    } catch (err) {
      console.error("Falha ao reordenar templates:", err);
      const fresh = await atividadeTemplateRepository
        .listAll()
        .catch(() => null);
      if (fresh) setTemplates(fresh);
      notificarAviso("Erro ao reordenar. Ordem restaurada.");
    }
  }, []);

  const criarCardPorTemplate = useCallback(
    async (templateId: string, listaId: string) => {
      // Lê do state ref para garantir freshness sem deps.
      const tpls = await atividadeTemplateRepository
        .listAll()
        .catch(() => [] as AtividadeTemplate[]);
      const tpl = tpls.find((t) => t.id === templateId);
      if (!tpl) return null;

      const card = await activityRepository.createCard({
        listaId,
        titulo: tpl.nome,
        descricao: tpl.descricao,
        cor: null,
        data: null,
        ordem: Date.now(),
        valorEstimado: tpl.camposDefaults.valorEstimado ?? null,
        fornecedor: tpl.camposDefaults.fornecedor ?? "",
        numeroNF: tpl.camposDefaults.numeroNF ?? "",
        metragem: tpl.camposDefaults.metragem ?? null,
        dataInicio: null,
        dataVencimento: null,
        horaVencimento: "",
        recorrencia: "nunca",
        concluidaEm: null,
        responsavelEmail: null,
      });
      setState((s) => ({ ...s, cards: [...s.cards, card] }));

      // Aplica etiquetas — espelha no state só os links confirmados pelo banco.
      const linkResultados = await Promise.allSettled(
        tpl.etiquetasIds.map((eid) => etiquetaRepository.link(card.id, eid)),
      );
      const etqAplicadas: AtividadeCardEtiqueta[] = tpl.etiquetasIds
        .filter((_, i) => linkResultados[i].status === "fulfilled")
        .map((eid) => ({ cardId: card.id, etiquetaId: eid }));
      if (etqAplicadas.length > 0) {
        setState((s) => ({
          ...s,
          cardEtiquetas: [...s.cardEtiquetas, ...etqAplicadas],
        }));
      }
      if (etqAplicadas.length < tpl.etiquetasIds.length) {
        notificarAviso(
          "Algumas etiquetas do template não puderam ser aplicadas.",
        );
      }

      // Cria subtarefas
      const novosChk: AtividadeChecklistItem[] = [];
      let i = 0;
      for (const titulo of tpl.checklistItems) {
        const item = await checklistRepository
          .create({
            cardId: card.id,
            titulo,
            concluida: false,
            ordem: i++,
          })
          .catch(() => null);
        if (item) novosChk.push(item);
      }
      if (novosChk.length > 0) {
        setState((s) => ({ ...s, checklist: [...s.checklist, ...novosChk] }));
      }
      if (novosChk.length < tpl.checklistItems.length) {
        notificarAviso(
          "Algumas subtarefas do template não puderam ser criadas.",
        );
      }

      // Log
      const lista = ref.current.listas.find((l) => l.id === listaId);
      atividadeHistoricoRepository.log({
        cardId: card.id,
        autorEmail: await autorEmail(),
        tipo: "criacao",
        descricao: `Card criado a partir do template "${tpl.nome}" na lista "${lista?.nome ?? "—"}"`,
      });

      return card;
    },
    [],
  );

  const concluirCard = useCallback(async (id: string, concluir: boolean) => {
    const card = ref.current.cards.find((c) => c.id === id);
    if (!card) return;
    const agora = new Date();
    const concluidaEm = concluir ? agora.toISOString() : null;
    const upd = await activityRepository.updateCard(id, { concluidaEm });
    setState((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === id ? upd : c)),
    }));
    atividadeHistoricoRepository.log({
      cardId: id,
      autorEmail: await autorEmail(),
      tipo: concluir ? "conclusao" : "reabertura",
      descricao: concluir
        ? "Card marcado como concluído"
        : "Card reaberto",
    });

    // Se recorrente e marcando como concluído, clona com próximo vencimento.
    if (concluir && card.recorrencia !== "nunca") {
      const base = card.dataVencimento
        ? new Date(card.dataVencimento)
        : new Date();
      const proxima = new Date(base);
      switch (card.recorrencia) {
        case "diaria":
          proxima.setDate(proxima.getDate() + 1);
          break;
        case "semanal":
          proxima.setDate(proxima.getDate() + 7);
          break;
        case "quinzenal":
          proxima.setDate(proxima.getDate() + 14);
          break;
        case "mensal":
          proxima.setMonth(proxima.getMonth() + 1);
          break;
      }
      const proxStr = proxima.toISOString().slice(0, 10);
      const novo = await activityRepository.createCard({
        listaId: card.listaId,
        titulo: card.titulo,
        descricao: card.descricao,
        cor: card.cor,
        data: null,
        ordem: Date.now(),
        valorEstimado: card.valorEstimado,
        fornecedor: card.fornecedor,
        numeroNF: card.numeroNF,
        metragem: card.metragem,
        dataInicio: null,
        dataVencimento: proxStr,
        horaVencimento: card.horaVencimento,
        recorrencia: card.recorrencia,
        concluidaEm: null,
        responsavelEmail: card.responsavelEmail,
      });
      setState((s) => ({ ...s, cards: [...s.cards, novo] }));
    }
  }, []);

  const toggleEtiquetaNoCard = useCallback(
    async (cardId: string, etiquetaId: string) => {
      const existe = ref.current.cardEtiquetas.some(
        (ce) => ce.cardId === cardId && ce.etiquetaId === etiquetaId,
      );
      const etiq = ref.current.etiquetas.find((e) => e.id === etiquetaId);
      if (existe) {
        await etiquetaRepository.unlink(cardId, etiquetaId);
        setState((s) => ({
          ...s,
          cardEtiquetas: s.cardEtiquetas.filter(
            (ce) => !(ce.cardId === cardId && ce.etiquetaId === etiquetaId),
          ),
        }));
      } else {
        await etiquetaRepository.link(cardId, etiquetaId);
        setState((s) => ({
          ...s,
          cardEtiquetas: [...s.cardEtiquetas, { cardId, etiquetaId }],
        }));
      }
      if (etiq) {
        atividadeHistoricoRepository.log({
          cardId,
          autorEmail: await autorEmail(),
          tipo: "etiqueta",
          descricao: existe
            ? `Etiqueta "${etiq.nome}" removida`
            : `Etiqueta "${etiq.nome}" adicionada`,
        });
      }
    },
    [],
  );

  const value: ActivitiesContextValue = {
    carregando,
    listas: state.listas,
    cards: state.cards,
    checklist: state.checklist,
    etiquetas: state.etiquetas,
    cardEtiquetas: state.cardEtiquetas,
    criarLista,
    renomearLista,
    pintarLista,
    removerLista,
    moverLista,
    reordenarListas,
    criarCard,
    atualizarCard,
    removerCard,
    moverCard,
    criarChecklistItem,
    atualizarChecklistItem,
    removerChecklistItem,
    reordenarChecklist,
    criarEtiqueta,
    atualizarEtiqueta,
    removerEtiqueta,
    reordenarEtiquetas,
    toggleEtiquetaNoCard,
    concluirCard,
    templates,
    criarTemplate,
    atualizarTemplate,
    removerTemplate,
    reordenarTemplates,
    criarCardPorTemplate,
  };

  return (
    <ActivitiesContext.Provider value={value}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(ActivitiesContext);
  if (!ctx)
    throw new Error("useBoard deve ser usado dentro de <ActivitiesProvider>");

  const listas = useMemo(
    () => [...ctx.listas].sort((a, b) => a.ordem - b.ordem),
    [ctx.listas],
  );
  // Agrupa os cards por lista (já ordenados) numa única passada.
  const cardsPorLista = useMemo(() => {
    const map = new Map<string, AtividadeCard[]>();
    for (const card of [...ctx.cards].sort((a, b) => a.ordem - b.ordem)) {
      const arr = map.get(card.listaId);
      if (arr) arr.push(card);
      else map.set(card.listaId, [card]);
    }
    return map;
  }, [ctx.cards]);
  const cardsDaLista = (listaId: string) => cardsPorLista.get(listaId) ?? [];

  const checklistPorCard = useMemo(() => {
    const map = new Map<string, AtividadeChecklistItem[]>();
    for (const item of [...ctx.checklist].sort((a, b) => a.ordem - b.ordem)) {
      const arr = map.get(item.cardId);
      if (arr) arr.push(item);
      else map.set(item.cardId, [item]);
    }
    return map;
  }, [ctx.checklist]);
  const checklistDoCard = (cardId: string) =>
    checklistPorCard.get(cardId) ?? [];

  const etiquetasOrdenadas = useMemo(
    () => [...ctx.etiquetas].sort((a, b) => a.ordem - b.ordem),
    [ctx.etiquetas],
  );

  const etiquetasPorCard = useMemo(() => {
    const map = new Map<string, AtividadeEtiqueta[]>();
    const etiqMap = new Map(ctx.etiquetas.map((e) => [e.id, e]));
    for (const ce of ctx.cardEtiquetas) {
      const etiq = etiqMap.get(ce.etiquetaId);
      if (!etiq) continue;
      const arr = map.get(ce.cardId);
      if (arr) arr.push(etiq);
      else map.set(ce.cardId, [etiq]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.ordem - b.ordem);
    }
    return map;
  }, [ctx.cardEtiquetas, ctx.etiquetas]);

  const etiquetasDoCard = (cardId: string) =>
    etiquetasPorCard.get(cardId) ?? [];

  return {
    ...ctx,
    listas,
    cardsDaLista,
    checklistDoCard,
    etiquetas: etiquetasOrdenadas,
    etiquetasDoCard,
  };
}
