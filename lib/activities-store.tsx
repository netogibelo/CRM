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
  AtividadeCardInput,
  AtividadeChecklistItem,
  AtividadeLista,
  AtividadesState,
  ListaCor,
} from "./types";
import { activityRepository, checklistRepository } from "./repository";
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
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AtividadesState>({
    listas: [],
    cards: [],
    checklist: [],
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
        listas: s.listas.filter((l) => l.id !== id),
        cards: cardsRestantes,
        checklist: s.checklist.filter((c) => cardIdsRestantes.has(c.cardId)),
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

  const value: ActivitiesContextValue = {
    carregando,
    listas: state.listas,
    cards: state.cards,
    checklist: state.checklist,
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

  return { ...ctx, listas, cardsDaLista, checklistDoCard };
}
