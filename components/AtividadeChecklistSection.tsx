"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AtividadeChecklistItem } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { inputCls, labelCls } from "@/lib/ui";

interface Props {
  cardId: string;
}

function ItemRow({
  item,
  onToggle,
  onRename,
  onDelete,
  dragHandle,
}: {
  item: AtividadeChecklistItem;
  onToggle: () => void;
  onRename: (titulo: string) => void;
  onDelete: () => void;
  dragHandle: ReactNode;
}) {
  const [titulo, setTitulo] = useState(item.titulo);
  const [editando, setEditando] = useState(false);

  function salvar() {
    const t = titulo.trim();
    if (t && t !== item.titulo) onRename(t);
    else setTitulo(item.titulo);
    setEditando(false);
  }

  return (
    <li className="group flex items-center gap-2 rounded-md border border-transparent px-1 py-1 transition-colors hover:border-navy-100 hover:bg-navy-50/60 dark:hover:border-dark-border dark:hover:bg-dark-elevated/40">
      {dragHandle}
      <input
        type="checkbox"
        checked={item.concluida}
        onChange={onToggle}
        aria-label={`Marcar "${item.titulo}" como ${item.concluida ? "pendente" : "concluída"}`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-navy-300 text-navy-700 focus:ring-2 focus:ring-navy-500/40"
      />
      {editando ? (
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              salvar();
            } else if (e.key === "Escape") {
              setTitulo(item.titulo);
              setEditando(false);
            }
          }}
          autoFocus
          aria-label="Editar subtarefa"
          className="min-w-0 flex-1 rounded-md border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1 text-sm text-navy-900 dark:text-gibelo-offwhite focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className={`min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm transition-colors ${
            item.concluida
              ? "text-navy-500 line-through dark:text-gibelo-areia"
              : "text-navy-900 dark:text-gibelo-offwhite"
          } hover:bg-white dark:hover:bg-dark-surface`}
          aria-label={`Editar subtarefa "${item.titulo}"`}
        >
          {item.titulo}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remover subtarefa "${item.titulo}"`}
        className="shrink-0 rounded-md p-1 text-navy-500 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-gibelo-areia"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}

function SortableItemRow({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: AtividadeChecklistItem;
  onToggle: () => void;
  onRename: (titulo: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Arrastar subtarefa "${item.titulo}"`}
      className="shrink-0 cursor-grab touch-none rounded-md p-1 text-navy-400 opacity-0 transition-opacity hover:text-navy-700 group-hover:opacity-100 active:cursor-grabbing dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="6" cy="4" r="1.1" fill="currentColor" />
        <circle cx="10" cy="4" r="1.1" fill="currentColor" />
        <circle cx="6" cy="8" r="1.1" fill="currentColor" />
        <circle cx="10" cy="8" r="1.1" fill="currentColor" />
        <circle cx="6" cy="12" r="1.1" fill="currentColor" />
        <circle cx="10" cy="12" r="1.1" fill="currentColor" />
      </svg>
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <ItemRow
        item={item}
        onToggle={onToggle}
        onRename={onRename}
        onDelete={onDelete}
        dragHandle={handle}
      />
    </div>
  );
}

export function AtividadeChecklistSection({ cardId }: Props) {
  const {
    checklistDoCard,
    criarChecklistItem,
    atualizarChecklistItem,
    removerChecklistItem,
    reordenarChecklist,
  } = useBoard();
  const itens = checklistDoCard(cardId);
  const [novo, setNovo] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const concluidas = itens.filter((i) => i.concluida).length;
  const total = itens.length;
  const pct = total === 0 ? 0 : Math.round((concluidas / total) * 100);

  async function adicionar() {
    const t = novo.trim();
    if (!t) return;
    await criarChecklistItem(cardId, t);
    setNovo("");
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = itens.map((i) => i.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    void reordenarChecklist(cardId, arrayMove(ids, oldIdx, newIdx));
  }

  const ids = itens.map((i) => i.id);

  return (
    <section aria-label="Checklist" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>Checklist</span>
        {total > 0 && (
          <span className="text-[11px] font-medium text-navy-700 dark:text-gibelo-areia">
            {concluidas}/{total} {concluidas === total ? "✓" : ""}
          </span>
        )}
      </div>

      {total > 0 && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-dark-elevated"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso da checklist: ${pct}%`}
        >
          <div
            className={`h-full transition-all ${
              pct === 100 ? "bg-emerald-500" : "bg-navy-600 dark:bg-gibelo-areia"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {total > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5">
              {itens.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    atualizarChecklistItem(item.id, { concluida: !item.concluida })
                  }
                  onRename={(titulo) => atualizarChecklistItem(item.id, { titulo })}
                  onDelete={() => removerChecklistItem(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void adicionar();
            }
          }}
          placeholder="+ Adicionar subtarefa"
          aria-label="Nova subtarefa"
          className={inputCls}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!novo.trim()}
          aria-label="Adicionar subtarefa"
          className="shrink-0 rounded-md border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 disabled:opacity-40 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
        >
          Adicionar
        </button>
      </div>
    </section>
  );
}
