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
  AtividadeLista,
  AtividadesState,
  ListaCor,
} from "./types";
import { activityRepository } from "./repository";
import { LISTA_COR_IDS } from "./atividade-cores";

interface ActivitiesContextValue {
  carregando: boolean;
  listas: AtividadeLista[];
  cards: AtividadeCard[];
  criarLista: (nome: string) => Promise<AtividadeLista>;
  renomearLista: (id: string, nome: string) => Promise<void>;
  pintarLista: (id: string, cor: ListaCor) => Promise<void>;
  removerLista: (id: string) => Promise<void>;
  moverLista: (id: string, dir: -1 | 1) => Promise<void>;
  criarCard: (
    input: Omit<AtividadeCardInput, "ordem">,
  ) => Promise<AtividadeCard>;
  atualizarCard: (
    id: string,
    patch: Partial<AtividadeCardInput>,
  ) => Promise<AtividadeCard>;
  removerCard: (id: string) => Promise<void>;
  moverCard: (id: string, listaId: string) => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AtividadesState>({ listas: [], cards: [] });
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
    setState((s) => ({
      listas: s.listas.filter((l) => l.id !== id),
      cards: s.cards.filter((c) => c.listaId !== id),
    }));
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
    setState((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }));
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

  const value: ActivitiesContextValue = {
    carregando,
    listas: state.listas,
    cards: state.cards,
    criarLista,
    renomearLista,
    pintarLista,
    removerLista,
    moverLista,
    criarCard,
    atualizarCard,
    removerCard,
    moverCard,
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

  return { ...ctx, listas, cardsDaLista };
}
