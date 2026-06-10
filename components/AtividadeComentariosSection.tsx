"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AtividadeComentario } from "@/lib/types";
import {
  atividadeHistoricoRepository,
  comentarioRepository,
} from "@/lib/repository";
import { supabase } from "@/lib/supabase";
import { usePerfis } from "@/lib/crm-store";
import { EQUIPE, iniciaisOuFallback, nomeOuEmail } from "@/lib/equipe";
import { labelCls } from "@/lib/ui";
import { useConfirm } from "./ConfirmDialog";

interface Props {
  cardId: string;
}

function formatRelativo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Realça @menções no texto. Os emails da equipe são detectados. */
function ComentarioTexto({ texto }: { texto: string }) {
  // Casa @prefixo até espaço, vírgula ou pontuação
  const partes = texto.split(/(@[^\s,.;:!?]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-navy-900 dark:text-gibelo-offwhite">
      {partes.map((p, i) =>
        p.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-navy-50 px-1 font-medium text-navy-700 dark:bg-dark-elevated dark:text-gibelo-areia"
          >
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </p>
  );
}

export function AtividadeComentariosSection({ cardId }: Props) {
  const { perfis } = usePerfis();
  const [comentarios, setComentarios] = useState<AtividadeComentario[]>([]);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [mention, setMention] = useState<{
    pos: number;
    query: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { confirmar, dialogo } = useConfirm();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUsuarioEmail(user?.email ?? null);
    });
    comentarioRepository.listByCard(cardId).then(setComentarios).catch(() => null);
  }, [cardId]);

  const sugestoes = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return EQUIPE.filter(
      (m) =>
        m.email.toLowerCase().includes(q) || m.nome.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [mention]);

  function onChangeNovo(v: string) {
    setNovo(v);
    detectarMention(v, inputRef.current?.selectionStart ?? v.length);
  }

  function detectarMention(texto: string, cursor: number) {
    const antes = texto.slice(0, cursor);
    const match = /@([\w.-]*)$/.exec(antes);
    if (match) {
      setMention({ pos: cursor - match[0].length, query: match[1] });
    } else {
      setMention(null);
    }
  }

  function inserirMention(email: string) {
    if (!mention) return;
    const antes = novo.slice(0, mention.pos);
    const cursor = inputRef.current?.selectionStart ?? novo.length;
    const depois = novo.slice(cursor);
    const inserido = `@${email} `;
    const proximoTexto = antes + inserido + depois;
    setNovo(proximoTexto);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = (antes + inserido).length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function comentar() {
    const t = novo.trim();
    if (!t || !usuarioEmail || salvando) return;
    setSalvando(true);
    try {
      const c = await comentarioRepository.create({
        cardId,
        autorEmail: usuarioEmail,
        texto: t,
      });
      setComentarios((prev) => [...prev, c]);
      setNovo("");
      setMention(null);
      atividadeHistoricoRepository.log({
        cardId,
        autorEmail: usuarioEmail,
        tipo: "comentario",
        descricao: `Comentou: "${t.length > 60 ? t.slice(0, 57) + "…" : t}"`,
      });
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(id: string) {
    const t = textoEdit.trim();
    if (!t) {
      setEditandoId(null);
      return;
    }
    const upd = await comentarioRepository.update(id, t);
    setComentarios((prev) => prev.map((c) => (c.id === id ? upd : c)));
    setEditandoId(null);
  }

  async function excluir(id: string) {
    const ok = await confirmar({
      titulo: "Excluir comentário",
      mensagem: "Excluir este comentário?",
      labelConfirmar: "Excluir",
    });
    if (!ok) return;
    await comentarioRepository.remove(id);
    setComentarios((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section aria-label="Comentários" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>Comentários</span>
        {comentarios.length > 0 && (
          <span className="text-[11px] font-medium text-navy-700 dark:text-gibelo-areia">
            {comentarios.length}
          </span>
        )}
      </div>

      {comentarios.length > 0 && (
        <ul className="space-y-2">
          {comentarios.map((c) => {
            const ehAutor = usuarioEmail === c.autorEmail;
            const editando = editandoId === c.id;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-navy-100 bg-white p-3 dark:border-dark-border dark:bg-dark-surface"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {iniciaisOuFallback(c.autorEmail, perfis)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-navy-900 dark:text-gibelo-offwhite">
                        {nomeOuEmail(c.autorEmail, perfis)}
                      </span>
                      <span className="text-[11px] text-navy-500 dark:text-gibelo-areia">
                        {formatRelativo(c.criadoEm)}
                        {c.editadoEm ? " · editado" : ""}
                      </span>
                    </div>
                    {editando ? (
                      <div className="mt-1 space-y-1">
                        <textarea
                          rows={2}
                          value={textoEdit}
                          onChange={(e) => setTextoEdit(e.target.value)}
                          className="w-full rounded-md border border-navy-200 bg-white px-2 py-1 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-elevated dark:text-gibelo-offwhite"
                          autoFocus
                        />
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => salvarEdicao(c.id)}
                            className="font-medium text-navy-700 hover:text-navy-900 dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="text-navy-500 hover:text-navy-700 dark:text-gibelo-areia"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <ComentarioTexto texto={c.texto} />
                      </div>
                    )}
                  </div>
                  {ehAutor && !editando && (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoId(c.id);
                          setTextoEdit(c.texto);
                        }}
                        aria-label="Editar comentário"
                        className="rounded-md p-1 text-navy-500 hover:bg-navy-50 hover:text-navy-700 dark:text-gibelo-areia dark:hover:bg-dark-elevated"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                          <path
                            d="M2 14l2-5 8-8 3 3-8 8-5 2zM10 4l3 3"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => excluir(c.id)}
                        aria-label="Excluir comentário"
                        className="rounded-md p-1 text-navy-500 hover:bg-red-50 hover:text-red-600 dark:text-gibelo-areia"
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
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        <textarea
          ref={inputRef}
          rows={2}
          value={novo}
          onChange={(e) => onChangeNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void comentar();
            } else if (e.key === "Escape" && mention) {
              setMention(null);
            }
          }}
          placeholder="Escreva um comentário… use @ para mencionar"
          aria-label="Novo comentário"
          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-surface dark:text-gibelo-offwhite"
          disabled={salvando}
        />
        {mention && sugestoes.length > 0 && (
          <div
            role="listbox"
            className="absolute left-2 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-navy-100 bg-white shadow-card-hover dark:border-dark-border dark:bg-dark-surface"
          >
            {sugestoes.map((m) => (
              <button
                key={m.email}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => inserirMention(m.email)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-navy-50 dark:hover:bg-dark-elevated"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {m.iniciais}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy-900 dark:text-gibelo-offwhite">
                    {m.nome}
                  </span>
                  <span className="block truncate text-[11px] text-navy-500 dark:text-gibelo-areia">
                    {m.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-navy-500 dark:text-gibelo-areia">
            Ctrl/Cmd + Enter para publicar
          </span>
          <button
            type="button"
            onClick={comentar}
            disabled={!novo.trim() || salvando || !usuarioEmail}
            aria-label="Publicar comentário"
            className="rounded-md border border-navy-200 px-3 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-50 disabled:opacity-40 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          >
            {salvando ? "Publicando…" : "Comentar"}
          </button>
        </div>
      </div>

      {dialogo}
    </section>
  );
}
