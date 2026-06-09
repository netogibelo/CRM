"use client";

import { type ReactNode } from "react";
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

/**
 * Wrapper genérico para listas reordenáveis em Configurações.
 *
 * Padrão para todos os cards de configuração (Origens, Etapas, Tipos de
 * serviço, Automações): DnD via @dnd-kit + botão "A→Z" no header que ordena
 * alfabeticamente e persiste a nova ordem.
 *
 * O componente é agnóstico ao formato do item — recebe `getId` e `getNome` e
 * uma função `renderRow` que recebe o item + um `dragHandleProps` para
 * vincular ao botão/handle de arraste dentro da linha.
 *
 * IMPORTANTE: o callback `onReorder` recebe a lista completa de ids na nova
 * ordem; o consumidor decide como persistir (geralmente `repo.reorder(ids)`).
 */
export interface SortableConfigListProps<T> {
  items: T[];
  getId: (item: T) => string;
  getNome: (item: T) => string;
  renderRow: (item: T, dragHandle: DragHandleProps) => ReactNode;
  onReorder: (idsOrdenados: string[]) => void | Promise<void>;
  /** Se omitido, ordena por getNome em ordem alfabética pt-BR. */
  onAlfabetizar?: () => void | Promise<void>;
  /** Texto do tooltip do botão A→Z. */
  tituloAlfabetizar?: string;
  /** Mensagem quando items.length === 0. */
  emptyLabel?: string;
  /** Aria-label para o container. */
  ariaLabel: string;
}

export interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  // dnd-kit retorna shapes específicos; mantemos genérico aqui porque
  // espalhamos via {...attributes} {...listeners} no consumidor.
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
}

interface SortableItemProps<T> {
  item: T;
  id: string;
  renderRow: (item: T, dragHandle: DragHandleProps) => ReactNode;
}

function SortableItem<T>({ item, id, renderRow }: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderRow(item, {
        ref: setActivatorNodeRef,
        attributes,
        listeners,
        isDragging,
      })}
    </div>
  );
}

export function SortableConfigList<T>({
  items,
  getId,
  getNome,
  renderRow,
  onReorder,
  onAlfabetizar,
  tituloAlfabetizar = "Ordenar A→Z",
  emptyLabel,
  ariaLabel,
}: SortableConfigListProps<T>) {
  const ids = items.map(getId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    void onReorder(arrayMove(ids, oldIdx, newIdx));
  }

  function alfabetizar() {
    if (onAlfabetizar) {
      void onAlfabetizar();
      return;
    }
    const novosIds = [...items]
      .sort((a, b) =>
        getNome(a).localeCompare(getNome(b), "pt-BR", { sensitivity: "base" }),
      )
      .map(getId);
    void onReorder(novosIds);
  }

  return (
    <div aria-label={ariaLabel}>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={alfabetizar}
          disabled={items.length < 2}
          aria-label={tituloAlfabetizar}
          title={tituloAlfabetizar}
          className="inline-flex items-center gap-1 rounded-md border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1 text-[11px] font-semibold text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-dark-surface"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 3v10M2 11l2 2 2-2M9 4h4l-4 5h4M9 13h4"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          A→Z
        </button>
      </div>

      {items.length === 0 && emptyLabel ? (
        <p className="py-3 text-center text-xs text-navy-700 dark:text-gibelo-areia">{emptyLabel}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={getId(item)}
                  id={getId(item)}
                  item={item}
                  renderRow={renderRow}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/** Handle de drag padrão (ícone de 6 pontos). Use dentro do renderRow. */
export function DragHandle({ handle }: { handle: DragHandleProps }) {
  return (
    <button
      type="button"
      ref={handle.ref}
      {...handle.attributes}
      {...(handle.listeners ?? {})}
      aria-label="Arrastar para reordenar"
      className="shrink-0 cursor-grab touch-none rounded-md p-1 text-navy-500 dark:text-gibelo-areia transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated hover:text-navy-700 dark:hover:text-gibelo-offwhite active:cursor-grabbing"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="6" cy="4" r="1.2" fill="currentColor" />
        <circle cx="10" cy="4" r="1.2" fill="currentColor" />
        <circle cx="6" cy="8" r="1.2" fill="currentColor" />
        <circle cx="10" cy="8" r="1.2" fill="currentColor" />
        <circle cx="6" cy="12" r="1.2" fill="currentColor" />
        <circle cx="10" cy="12" r="1.2" fill="currentColor" />
      </svg>
    </button>
  );
}
