"use client";

import { useState } from "react";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { AtividadeCard as TCard } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { cardBarra } from "@/lib/atividade-cores";
import { btnPrimary } from "@/lib/ui";
import { AtividadeColuna } from "./AtividadeColuna";
import { AtividadeCardForm, type CardFormData } from "./AtividadeCardForm";

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
    criarCard,
    atualizarCard,
    removerCard,
    moverCard,
  } = useBoard();

  const [activeCard, setActiveCard] = useState<TCard | null>(null);
  const [form, setForm] = useState<{
    aberto: boolean;
    card: TCard | null;
    listaId: string;
  }>({ aberto: false, card: null, listaId: "" });

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
    setActiveCard(cards.find((c) => c.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const ativo = cards.find((c) => c.id === activeId);
    if (!ativo) return;

    const overId = String(over.id);
    const overLista = listas.find((l) => l.id === overId);

    // Lista de destino e posição-alvo (excluindo o próprio card arrastado).
    let destListaId: string;
    let destIndex: number;
    if (overLista) {
      destListaId = overLista.id;
      destIndex = cardsDaLista(destListaId).filter((c) => c.id !== activeId).length;
    } else {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;
      destListaId = overCard.listaId;
      const arr = cardsDaLista(destListaId).filter((c) => c.id !== activeId);
      const i = arr.findIndex((c) => c.id === overId);
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
      <div className="py-16 text-center text-sm text-navy-400" role="status">
        Carregando atividades…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">
          Quadro de tarefas da semana — arraste os cards entre as listas.
        </p>
        <button
          type="button"
          onClick={() => criarLista("Nova lista")}
          className={btnPrimary}
        >
          + Nova lista
        </button>
      </div>

      {listas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-navy-700">
            Nenhuma lista no quadro.
          </p>
          <p className="mt-1 text-sm text-navy-400">
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
            <div className="flex min-w-max gap-4">
              {listas.map((lista, i) => (
                <AtividadeColuna
                  key={lista.id}
                  lista={lista}
                  cards={cardsDaLista(lista.id)}
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
          </div>

          <DragOverlay>
            {activeCard ? (
              <div
                className={`w-[272px] rotate-1 rounded-xl border border-navy-200 bg-white p-3 shadow-card-hover ${
                  cardBarra(activeCard.cor)
                    ? `border-l-4 ${cardBarra(activeCard.cor)}`
                    : ""
                }`}
              >
                <p className="text-sm font-medium leading-snug text-navy-900">
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
        />
      )}
    </div>
  );
}
