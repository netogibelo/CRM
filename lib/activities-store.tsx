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
  ListaCor,
} from "./types";
import {
  activityRepository,
  checklistRepository,
  etiquetaRepository,
} from "./repository";
import { LISTA_COR_IDS } from "./atividade-cores";

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
  const [carregando, setCarregando] = useState(true);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const s = await activityRepository.load();
      if (ativo) {
        setState(s);
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
      return card;
    },
    [],
  );

  const atualizarCard = useCallback(
    async (id: string, patch: Partial<AtividadeCardInput>) => {
      const upd = await activityRepository.updateCard(id, patch);
      setState((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === id ? upd : c)),
      }));
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
    },
    [],
  );

  const atualizarChecklistItem = useCallback(
    async (id: string, patch: { titulo?: string; concluida?: boolean }) => {
      const upd = await checklistRepository.update(id, patch);
      setState((s) => ({
        ...s,
        checklist: s.checklist.map((c) => (c.id === id ? upd : c)),
      }));
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
      // update otimista + persist em paralelo
      setState((s) => ({
        ...s,
        checklist: s.checklist.map((c) => {
          if (c.cardId !== cardId) return c;
          const i = idsOrdenados.indexOf(c.id);
          return i === -1 ? c : { ...c, ordem: i };
        }),
      }));
      await checklistRepository.reorder(idsOrdenados);
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
    await etiquetaRepository.reorder(idsOrdenados);
  }, []);

  const toggleEtiquetaNoCard = useCallback(
    async (cardId: string, etiquetaId: string) => {
      const existe = ref.current.cardEtiquetas.some(
        (ce) => ce.cardId === cardId && ce.etiquetaId === etiquetaId,
      );
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
