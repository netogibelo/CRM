"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import { CONFIG_SECOES } from "@/lib/nav";
import { useNav } from "@/lib/nav-store";

const DELAY_FECHAR = 220;

/**
 * Item "Configurações" do rail com flyout POPOVER FLUTUANTE (portal +
 * position:fixed) à direita do rail — não é cortado pelo overflow do rail nem
 * empurra o conteúdo.
 *
 * Interação:
 *   - hover no ícone abre (modo não-fixado);
 *   - safe-triangle: o painel cancela o timer de fechamento ao receber o
 *     mouse, permitindo a diagonal ícone→painel;
 *   - clique FIXA (fica aberto sem hover); clicar de novo fecha;
 *   - quando fixado: clique-fora ou selecionar item fecha;
 *   - Esc fecha sempre e devolve o foco ao ícone;
 *   - setas ↑↓ navegam, Enter/Space ativa.
 */
export function RailFlyout({ ativo }: { ativo: boolean }) {
  const { irParaConfig } = useNav();
  const [aberto, setAberto] = useState(false);
  const [fixado, setFixado] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparTimer = () => {
    if (fecharTimer.current) clearTimeout(fecharTimer.current);
  };

  const atualizarPos = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top, left: r.right + 12 });
  }, []);

  const abrir = useCallback(() => {
    limparTimer();
    atualizarPos();
    setAberto(true);
  }, [atualizarPos]);

  const fecharTudo = useCallback(() => {
    limparTimer();
    setFixado(false);
    setAberto(false);
  }, []);

  const fecharEFocar = useCallback(() => {
    fecharTudo();
    triggerRef.current?.focus();
  }, [fecharTudo]);

  // Fecha por mouse-leave só quando NÃO está fixado.
  const fecharComDelay = useCallback(() => {
    if (fixado) return;
    limparTimer();
    fecharTimer.current = setTimeout(() => setAberto(false), DELAY_FECHAR);
  }, [fixado]);

  const abrirEFocarPrimeiro = useCallback(() => {
    limparTimer();
    atualizarPos();
    setAberto(true);
    requestAnimationFrame(() => itemRefs.current[0]?.focus());
  }, [atualizarPos]);

  // Clique fora do ícone E do painel fecha (painel está em portal).
  useEffect(() => {
    if (!aberto) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        fecharTudo();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [aberto, fecharTudo]);

  // Reposiciona enquanto aberto (resize / scroll de qualquer ancestral).
  useEffect(() => {
    if (!aberto) return;
    const h = () => atualizarPos();
    window.addEventListener("resize", h);
    window.addEventListener("scroll", h, true);
    return () => {
      window.removeEventListener("resize", h);
      window.removeEventListener("scroll", h, true);
    };
  }, [aberto, atualizarPos]);

  useEffect(() => () => limparTimer(), []);

  function selecionar(secaoId: string) {
    irParaConfig(secaoId);
    fecharTudo();
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFixado(true);
      abrirEFocarPrimeiro();
    } else if (e.key === "Escape") {
      fecharEFocar();
    }
  }

  function onTriggerClick() {
    if (fixado) {
      fecharEFocar();
    } else {
      setFixado(true);
      abrirEFocarPrimeiro();
    }
  }

  function onPanelKey(e: React.KeyboardEvent) {
    const itens = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const idx = itens.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itens[(idx + 1) % itens.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itens[(idx - 1 + itens.length) % itens.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itens[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itens[itens.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      fecharEFocar();
    }
  }

  return (
    <div className="flex justify-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Configurações"
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-current={ativo ? "page" : undefined}
        onMouseEnter={abrir}
        onMouseLeave={fecharComDelay}
        onFocus={abrir}
        onBlur={(e) => {
          // Foco saindo do ícone para fora do painel, sem estar fixado → fecha.
          if (fixado) return;
          if (!panelRef.current?.contains(e.relatedTarget as Node)) {
            setAberto(false);
          }
        }}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKey}
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-gibelo-areia ${
          ativo || aberto
            ? "bg-navy-900 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Settings size={22} strokeWidth={ativo ? 2.4 : 2} aria-hidden="true" />
      </button>

      {aberto &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label="Configurações"
            onMouseEnter={limparTimer}
            onMouseLeave={fecharComDelay}
            onKeyDown={onPanelKey}
            onBlur={(e) => {
              // Tab para fora do painel e do ícone fecha (quando fixado/teclado).
              const rt = e.relatedTarget as Node | null;
              if (
                !panelRef.current?.contains(rt) &&
                rt !== triggerRef.current
              ) {
                fecharTudo();
              }
            }}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-56"
          >
            {/* Seta apontando para o rail */}
            <span
              aria-hidden="true"
              className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 rounded-[2px] border-b border-l border-navy-100 bg-white dark:border-dark-border dark:bg-dark-surface"
            />
            <div className="relative overflow-hidden rounded-lg border border-navy-100 bg-white py-1.5 shadow-card-hover dark:border-dark-border dark:bg-dark-surface">
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-navy-500 dark:text-gibelo-areia">
                Configurações
              </p>
              {CONFIG_SECOES.map((s, i) => (
                <button
                  key={s.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="menuitem"
                  type="button"
                  onClick={() => selecionar(s.id)}
                  className="block w-full px-3 py-2 text-left text-sm text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
