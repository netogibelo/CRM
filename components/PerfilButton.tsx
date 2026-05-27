"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePerfis } from "@/lib/crm-store";
import { iniciaisOuFallback, nomeOuEmail } from "@/lib/equipe";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

interface Sessao {
  id: string;
  email: string;
}

export function PerfilButton() {
  const router = useRouter();
  const { perfis, salvar } = usePerfis();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const refContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        setSessao({ id: user.id, email: user.email });
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setSessao({ id: session.user.id, email: session.user.email });
      } else {
        setSessao(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const meuPerfil = useMemo(
    () => (sessao ? perfis.find((p) => p.id === sessao.id) : undefined),
    [perfis, sessao],
  );

  useEffect(() => {
    if (editando && sessao) {
      setNome(meuPerfil?.nomeExibicao ?? nomeOuEmail(sessao.email, perfis));
    }
  }, [editando, meuPerfil, sessao, perfis]);

  useEffect(() => {
    if (!aberto) return;
    function clickFora(e: MouseEvent) {
      if (
        refContainer.current &&
        !refContainer.current.contains(e.target as Node)
      ) {
        setAberto(false);
        setEditando(false);
      }
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        setEditando(false);
      }
    }
    document.addEventListener("mousedown", clickFora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", clickFora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  async function salvarNome() {
    if (!sessao || !nome.trim() || salvando) return;
    setSalvando(true);
    try {
      await salvar({
        id: sessao.id,
        email: sessao.email,
        nomeExibicao: nome.trim(),
      });
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!sessao) return null;

  const nomeAtual = nomeOuEmail(sessao.email, perfis);
  const iniciais = iniciaisOuFallback(sessao.email, perfis);

  return (
    <div ref={refContainer} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-navy-200 px-2 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-50"
        aria-label={`Menu do perfil de ${nomeAtual}`}
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {iniciais}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">
          {nomeAtual}
        </span>
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Meu perfil"
          className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card-hover"
        >
          <div className="border-b border-navy-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
              Meu perfil
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-900">
              {nomeAtual}
            </p>
            <p className="text-xs text-navy-500">{sessao.email}</p>
          </div>

          <div className="px-4 py-3">
            {editando ? (
              <div className="space-y-2">
                <label htmlFor="perfil-nome" className={labelCls}>
                  Nome de exibição
                </label>
                <input
                  id="perfil-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputCls}
                  placeholder="Como gostaria de aparecer"
                  disabled={salvando}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      salvarNome();
                    }
                  }}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className={btnGhost}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarNome}
                    disabled={!nome.trim() || salvando}
                    className={`${btnPrimary} disabled:opacity-50`}
                  >
                    {salvando ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="w-full text-left text-sm text-navy-700 hover:text-navy-900"
                aria-label="Editar nome de exibição"
              >
                Editar nome de exibição
              </button>
            )}
          </div>

          <div className="border-t border-navy-100 px-4 py-3">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-700"
              aria-label="Sair da sessão"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
