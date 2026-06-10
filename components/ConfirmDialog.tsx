"use client";

import { useCallback, useState } from "react";
import { Modal } from "./Modal";
import { btnGhost } from "@/lib/ui";

export interface ConfirmOpcoes {
  titulo: string;
  mensagem: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  variante?: "danger" | "warning";
}

interface ConfirmDialogProps extends ConfirmOpcoes {
  open: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";
const btnWarning =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-600";

/** Diálogo de confirmação no lugar de window.confirm — herda o focus trap,
 * a pilha de modais e o Escape do Modal. */
export function ConfirmDialog({
  open,
  titulo,
  mensagem,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  variante = "danger",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Modal
      titulo={titulo}
      descricao={mensagem}
      onClose={onCancelar}
      role="alertdialog"
      maxWidth="max-w-md"
    >
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={btnGhost}>
          {labelCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className={variante === "danger" ? btnDanger : btnWarning}
        >
          {labelConfirmar}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Substituto de window.confirm: `confirmar(opcoes)` resolve true/false quando
 * o usuário responde. Renderize `dialogo` no JSX do componente.
 *
 *   const { confirmar, dialogo } = useConfirm();
 *   if (!(await confirmar({ titulo: "Excluir?", mensagem: "..." }))) return;
 */
export function useConfirm() {
  const [pendente, setPendente] = useState<
    (ConfirmOpcoes & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirmar = useCallback(
    (opcoes: ConfirmOpcoes) =>
      new Promise<boolean>((resolve) => setPendente({ ...opcoes, resolve })),
    [],
  );

  const dialogo = pendente ? (
    <ConfirmDialog
      open
      titulo={pendente.titulo}
      mensagem={pendente.mensagem}
      labelConfirmar={pendente.labelConfirmar}
      labelCancelar={pendente.labelCancelar}
      variante={pendente.variante}
      onConfirmar={() => {
        pendente.resolve(true);
        setPendente(null);
      }}
      onCancelar={() => {
        pendente.resolve(false);
        setPendente(null);
      }}
    />
  ) : null;

  return { confirmar, dialogo };
}
