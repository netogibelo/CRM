"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { AtividadeCard as TCard } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { cardBarra } from "@/lib/atividade-cores";
import { btnPrimary } from "@/lib/ui";
import { AtividadeColuna } from "./AtividadeColuna";
import { AtividadeCardForm, type CardFormData } from "./AtividadeCardForm";
import {
  AtividadesFiltros,
  carregarFiltros,
  FILTROS_VAZIOS,
  type FiltrosAtividades,
} from "./AtividadesFiltros";

function aplicaFiltros(
  cards: TCard[],
  filtros: FiltrosAtividades,
  cardEtiquetas: { cardId: string; etiquetaId: string }[],
): TCard[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const etqByCard = new Map<string, Set<string>>();
  for (const ce of cardEtiquetas) {
    const set = etqByCard.get(ce.cardId);
    if (set) set.add(ce.etiquetaId);
    else etqByCard.set(ce.cardId, new Set([ce.etiquetaId]));
  }
  const busca = filtros.busca.trim().toLowerCase();

  return cards.filter((c) => {
    if (filtros.responsavel === "__sem") {
      if (c.responsavelEmail) return false;
    } else if (filtros.responsavel) {
      if (c.responsavelEmail !== filtros.responsavel) return false;
    }
    if (filtros.etiquetasIds.length > 0) {
      const set = etqByCard.get(c.id);
      if (!set) return false;
      if (!filtros.etiquetasIds.every((id) => set.has(id))) return false;
    }
    const venc = c.dataVencimento ?? c.data;
    const concluido = Boolean(c.concluidaEm);
    switch (filtros.status) {
      case "abertos":
        if (concluido) return false;
        break;
      case "concluidos":
        if (!concluido) return false;
        break;
      case "atrasados": {
        if (concluido || !venc) return false;
        const dv = new Date(venc + "T00:00:00");
        if (dv.getTime() >= hoje.getTime()) return false;
        break;
      }
      case "vencendo_hoje": {
        if (concluido || !venc) return false;
        const dv = new Date(venc + "T00:00:00");
        if (dv.getTime() !== hoje.getTime()) return false;
        break;
      }
    }
    if (filtros.ocultarRecorrentes && c.recorrencia !== "nunca") return false;
    if (busca) {
      const hay = `${c.titulo} ${c.descricao}`.toLowerCase();
      if (!hay.includes(busca)) return false;
    }
    return true;
  });
}

export function AtividadesView() {
  const {
    carregando,
    listas,
    cards,
    cardsDaLista,
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
    concluirCard,
    cardEtiquetas,
    etiquetas,
  } = useBoard();

  const [activeCard, setActiveCard] = useState<TCard | null>(null);
  const [form, setForm] = useState<{
    aberto: boolean;
    card: TCard | null;
    listaId: string;
  }>({ aberto: false, card: null, listaId: "" });
  const [filtros, setFiltros] = useState<FiltrosAtividades>(() =>
    typeof window !== "undefined" ? carregarFiltros() : FILTROS_VAZIOS,
  );
  const cardsVisiveis = useMemo(
    () => aplicaFiltros(cards, filtros, cardEtiquetas),
    [cards, filtros, cardEtiquetas],
  );
  const idsVisiveis = useMemo(
    () => new Set(cardsVisiveis.map((c) => c.id)),
    [cardsVisiveis],
  );
  const filtrarLista = (listaId: string) =>
    cardsDaLista(listaId).filter((c) => idsVisiveis.has(c.id));

  const sensors = useSensors(
    // distância de ativação: permite tap/clique sem iniciar arraste (toque + mouse)
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function novoCard(listaId: string) {
    setForm({ aberto: true, card: null, listaId });
  }
  function abrirCard(card: TCard) {
    setForm({ aberto: true, card, listaId: card.listaId });
  }
  function fecharForm() {
    setForm({ aberto: false, card: null, listaId: "" });
  }

  async function salvarCard(data: CardFormData) {
    if (form.card) await atualizarCard(form.card.id, data);
    else await criarCard(data);
    fecharForm();
  }
  async function excluirCard(id: string) {
    if (!window.confirm("Excluir este card?")) return;
    await removerCard(id);
    fecharForm();
  }
  async function excluirLista(id: string) {
    const lista = listas.find((l) => l.id === id);
    const qtd = cardsDaLista(id).length;
    const aviso =
      qtd > 0
        ? `Excluir a lista "${lista?.nome}" e seus ${qtd} card(s)?`
        : `Excluir a lista "${lista?.nome}"?`;
    if (!window.confirm(aviso)) return;
    await removerLista(id);
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    // Listas e cards têm ids distintos; só cards entram no overlay.
    setActiveCard(
      listas.some((l) => l.id === id)
        ? null
        : cards.find((c) => c.id === id) ?? null,
    );
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // ── Reordenar listas ──
    if (listas.some((l) => l.id === activeId)) {
      const overListId = listas.some((l) => l.id === overId)
        ? overId
        : cards.find((c) => c.id === overId)?.listaId;
      if (!overListId) return;
      const ids = listas.map((l) => l.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overListId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      reordenarListas(arrayMove(ids, oldIndex, newIndex));
      return;
    }

    // ── Mover/reordenar card ──
    const ativo = cards.find((c) => c.id === activeId);
    if (!ativo) return;

    let destListaId: string;
    let destIndex: number;
    if (listas.some((l) => l.id === overId)) {
      destListaId = overId;
      destIndex = cardsDaLista(destListaId).filter((c) => c.id !== activeId).length;
    } else {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;
      destListaId = overCard.listaId;
      const arr = cardsDaLista(destListaId).filter((c) => c.id !== activeId);
      const i = arr.findIndex((c) => c.id === overCard.id);
      destIndex = i === -1 ? arr.length : i;
    }

    const arr = cardsDaLista(destListaId).filter((c) => c.id !== activeId);
    const before = arr[destIndex - 1];
    const after = arr[destIndex];
    let novaOrdem: number;
    if (!before && !after) novaOrdem = Date.now();
    else if (!before) novaOrdem = after.ordem - 1;
    else if (!after) novaOrdem = before.ordem + 1;
    else novaOrdem = (before.ordem + after.ordem) / 2;

    if (ativo.listaId === destListaId && ativo.ordem === novaOrdem) return;
    atualizarCard(activeId, { listaId: destListaId, ordem: novaOrdem });
  }

  if (carregando) {
    return (
      <div className="py-16 text-center text-sm text-navy-700 dark:text-gibelo-areia" role="status">
        Carregando atividades…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-700 dark:text-gibelo-areia">
          Quadro de tarefas — arraste cards e listas, ou use os menus/setas.
        </p>
        <button
          type="button"
          onClick={() => criarLista("Nova lista")}
          className={btnPrimary}
        >
          + Nova lista
        </button>
      </div>

      {listas.length > 0 && (
        <AtividadesFiltros
          filtros={filtros}
          onChange={setFiltros}
          etiquetas={etiquetas}
          visiveis={cardsVisiveis.length}
          total={cards.length}
        />
      )}

      {listas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 dark:border-dark-border dark:border-dark-border bg-white dark:bg-dark-surface px-6 py-14 text-center">
          <p className="text-sm font-medium text-navy-700 dark:text-gibelo-offwhite">
            Nenhuma lista no quadro.
          </p>
          <p className="mt-1 text-sm text-navy-700 dark:text-gibelo-areia">
            Crie a primeira lista para começar a organizar as tarefas.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveCard(null)}
        >
          <div className="scrollbar-board -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <SortableContext
              items={listas.map((l) => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex min-w-max items-start gap-4">
                {listas.map((lista, i) => (
                  <AtividadeColuna
                    key={lista.id}
                    lista={lista}
                    cards={filtrarLista(lista.id)}
                    listas={listas}
                    posicao={i}
                    total={listas.length}
                    onAbrirCard={abrirCard}
                    onNovoCard={novoCard}
                    onMoverCard={moverCard}
                    onPintarLista={pintarLista}
                    onRenomear={renomearLista}
                    onRemover={excluirLista}
                    onMoverLista={moverLista}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div
                className={`w-[272px] rotate-1 rounded-xl border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3 shadow-card-hover ${
                  cardBarra(activeCard.cor)
                    ? `border-l-4 ${cardBarra(activeCard.cor)}`
                    : ""
                }`}
              >
                <p className="text-sm font-medium leading-snug text-navy-900 dark:text-gibelo-offwhite">
                  {activeCard.titulo}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {form.aberto && (
        <AtividadeCardForm
          card={form.card}
          listaIdInicial={form.listaId}
          listas={listas}
          onSalvar={salvarCard}
          onClose={fecharForm}
          onExcluir={excluirCard}
          onConcluir={async (id, concluir) => {
            await concluirCard(id, concluir);
            fecharForm();
          }}
        />
      )}
    </div>
  );
}
