// Store global de toasts (notificações transitórias). Módulo simples com
// subscribers — sem React — para que os helpers `notificar*` possam ser
// chamados também fora de componentes (ex.: lib/export.ts, automacoes-engine).
// O <ToastContainer> assina via useSyncExternalStore.

export type ToastTipo = "erro" | "sucesso" | "aviso" | "info";

export interface Toast {
  id: number;
  tipo: ToastTipo;
  mensagem: string;
  /** Duração em ms até o auto-dismiss. */
  duracao: number;
}

const DURACAO_PADRAO: Record<ToastTipo, number> = {
  erro: 6000,
  sucesso: 4000,
  aviso: 4000,
  info: 4000,
};

let toasts: Toast[] = [];
let proximoId = 1;
const listeners = new Set<() => void>();

function emitir() {
  for (const l of listeners) l();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dispensarToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
}

export function notificar(
  tipo: ToastTipo,
  mensagem: string,
  duracao?: number,
) {
  toasts = [
    ...toasts,
    { id: proximoId++, tipo, mensagem, duracao: duracao ?? DURACAO_PADRAO[tipo] },
  ];
  emitir();
}

export const notificarErro = (mensagem: string) => notificar("erro", mensagem);
export const notificarSucesso = (mensagem: string) =>
  notificar("sucesso", mensagem);
export const notificarAviso = (mensagem: string) => notificar("aviso", mensagem);
export const notificarInfo = (mensagem: string) => notificar("info", mensagem);
