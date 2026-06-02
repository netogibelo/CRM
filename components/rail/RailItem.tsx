"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

interface RailItemProps {
  Icon: LucideIcon;
  /** Nome da seção — vira o nome acessível (aria-label) e o tooltip. */
  label: string;
  ativo?: boolean;
  badge?: number;
  onClick?: () => void;
  /** Item "Em breve": muted, aria-disabled, fora da ordem de Tab. */
  desabilitado?: boolean;
  /** Texto alternativo de tooltip (ex.: "Em breve"). Default = label. */
  tooltip?: string;
}

const DELAY_HOVER = 250;

/**
 * Botão de navegação icon-only do rail. O tooltip é renderizado num PORTAL
 * (position: fixed) para não ser cortado pelo overflow do container de
 * navegação — `overflow-y:auto` faz o overflow-x virar `auto` e cortaria o
 * tooltip, que fica à direita do rail. Delay de 250ms no hover do mouse e
 * imediato no foco por teclado. O aria-label garante nome acessível
 * independente do tooltip (só reforço visual). Ativo usa squircle (shape).
 */
export function RailItem({
  Icon,
  label,
  ativo = false,
  badge,
  onClick,
  desabilitado = false,
  tooltip,
}: RailItemProps) {
  const [mostrarDica, setMostrarDica] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dicaId = useId();
  const texto = tooltip ?? label;

  function calcularPos() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top + r.height / 2, left: r.right + 12 });
  }
  function mostrar() {
    calcularPos();
    setMostrarDica(true);
  }
  function agendarDica() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(mostrar, DELAY_HOVER);
  }
  function esconderDica() {
    if (timer.current) clearTimeout(timer.current);
    setMostrarDica(false);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const temBadge = typeof badge === "number" && badge > 0 && !desabilitado;
  const ariaLabel = temBadge
    ? `${label}, ${badge} ${badge === 1 ? "item" : "itens"}`
    : label;

  return (
    <div
      className="flex justify-center"
      onMouseEnter={agendarDica}
      onMouseLeave={esconderDica}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={desabilitado ? undefined : onClick}
        onFocus={mostrar}
        onBlur={esconderDica}
        onKeyDown={(e) => {
          if (e.key === "Escape") esconderDica();
        }}
        aria-label={ariaLabel}
        aria-current={ativo ? "page" : undefined}
        aria-disabled={desabilitado || undefined}
        aria-describedby={mostrarDica ? dicaId : undefined}
        tabIndex={desabilitado ? -1 : 0}
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-gibelo-areia ${
          desabilitado
            ? "cursor-not-allowed text-white/25"
            : ativo
              ? "bg-navy-900 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={22} strokeWidth={ativo ? 2.4 : 2} aria-hidden="true" />
        {temBadge && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gibelo-areia px-1 text-[10px] font-bold leading-none text-navy-900 ring-2 ring-gibelo-preto"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {mostrarDica &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={dicaId}
            role="tooltip"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="pointer-events-none z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-card-hover dark:bg-dark-elevated"
          >
            {texto}
          </span>,
          document.body,
        )}
    </div>
  );
}
