"use client";

// Helpers compartilhados de drag-and-drop nativo (HTML5) para os dois quadros
// Kanban (funil de oportunidades e quadro de atividades).

import { useState } from "react";

/** Estado e handlers de uma coluna que recebe cards arrastados. */
export function useDropTarget(onDrop: (cardId: string) => void) {
  const [sobre, setSobre] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!sobre) setSobre(true);
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      // Só remove o destaque quando o cursor sai de fato da coluna.
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false);
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setSobre(false);
      const id = e.dataTransfer.getData("text/plain");
      if (id) onDrop(id);
    },
  };
  return { sobre, dropProps };
}

/** Props para tornar um card arrastável. */
export function dragProps(
  id: string,
  onDragStart: (id: string) => void,
  onDragEnd: () => void,
) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      onDragStart(id);
    },
    onDragEnd,
  };
}

/** Props para ativar um elemento clicável por teclado (Enter/Espaço). */
export function activationProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
