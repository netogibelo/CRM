"use client";

import { useState } from "react";
import type { AtividadeTemplate } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";
import {
  DragHandle,
  SortableConfigList,
  type DragHandleProps,
} from "./SortableConfigList";
import { Modal } from "./Modal";

function TemplateRow({
  template,
  handle,
  onEditar,
  onDelete,
}: {
  template: AtividadeTemplate;
  handle: DragHandleProps;
  onEditar: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white p-2 dark:border-dark-border dark:bg-dark-surface">
      <DragHandle handle={handle} />
      <button
        type="button"
        onClick={onEditar}
        className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-medium text-navy-900 hover:bg-navy-50 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
        aria-label={`Editar template ${template.nome}`}
      >
        {template.nome}
        <span className="ml-2 text-[11px] font-normal text-navy-500 dark:text-gibelo-areia">
          {template.checklistItems.length} subtarefa
          {template.checklistItems.length === 1 ? "" : "s"}
          {template.etiquetasIds.length > 0 &&
            ` · ${template.etiquetasIds.length} etiqueta${template.etiquetasIds.length === 1 ? "" : "s"}`}
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir template ${template.nome}`}
        className="shrink-0 rounded-md p-1.5 text-navy-700 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gibelo-areia"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
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

function TemplateEditor({
  template,
  onSalvar,
  onClose,
}: {
  template: AtividadeTemplate | null;
  onSalvar: (data: {
    nome: string;
    descricao: string;
    etiquetasIds: string[];
    checklistItems: string[];
  }) => Promise<void>;
  onClose: () => void;
}) {
  const { etiquetas } = useBoard();
  const [nome, setNome] = useState(template?.nome ?? "");
  const [descricao, setDescricao] = useState(template?.descricao ?? "");
  const [etiquetasIds, setEtiquetasIds] = useState<string[]>(
    template?.etiquetasIds ?? [],
  );
  const [checklist, setChecklist] = useState<string>(
    (template?.checklistItems ?? []).join("\n"),
  );

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const itens = checklist
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await onSalvar({
      nome: nome.trim(),
      descricao: descricao.trim(),
      etiquetasIds,
      checklistItems: itens,
    });
  }

  return (
    <Modal
      titulo={template ? "Editar template" : "Novo template"}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="tpl-nome" className={labelCls}>
            Nome
          </label>
          <input
            id="tpl-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
            placeholder="Ex.: Reunião de obra"
            required
          />
        </div>
        <div>
          <label htmlFor="tpl-desc" className={labelCls}>
            Descrição
          </label>
          <textarea
            id="tpl-desc"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className={inputCls}
            placeholder="Descrição padrão do card…"
          />
        </div>
        <div>
          <span className={labelCls}>Etiquetas iniciais</span>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {etiquetas.length === 0 ? (
              <p className="col-span-2 text-xs text-navy-500 dark:text-gibelo-areia">
                Nenhuma etiqueta cadastrada.
              </p>
            ) : (
              etiquetas.map((e) => {
                const ativa = etiquetasIds.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                      ativa
                        ? "border-navy-300 bg-navy-50 dark:border-gibelo-areia dark:bg-dark-elevated"
                        : "border-navy-100 dark:border-dark-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={() =>
                        setEtiquetasIds((prev) =>
                          ativa
                            ? prev.filter((x) => x !== e.id)
                            : [...prev, e.id],
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-navy-300 text-navy-700 focus:ring-2 focus:ring-navy-500/40"
                    />
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: e.cor }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-navy-900 dark:text-gibelo-offwhite">
                      {e.nome}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div>
          <label htmlFor="tpl-chk" className={labelCls}>
            Subtarefas <span className="text-navy-500 dark:text-gibelo-areia">(uma por linha)</span>
          </label>
          <textarea
            id="tpl-chk"
            rows={4}
            value={checklist}
            onChange={(e) => setChecklist(e.target.value)}
            className={inputCls}
            placeholder="Pauta definida\nAta registrada\nAções atribuídas"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          >
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={!nome.trim()}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AtividadeTemplatesConfig() {
  const {
    templates,
    criarTemplate,
    atualizarTemplate,
    removerTemplate,
    reordenarTemplates,
  } = useBoard();
  const [editor, setEditor] = useState<{
    aberto: boolean;
    template: AtividadeTemplate | null;
  }>({ aberto: false, template: null });

  async function salvar(data: {
    nome: string;
    descricao: string;
    etiquetasIds: string[];
    checklistItems: string[];
  }) {
    if (editor.template) {
      await atualizarTemplate(editor.template.id, data);
    } else {
      const ordem = templates.reduce((m, t) => Math.max(m, t.ordem), -1) + 1;
      await criarTemplate({
        ...data,
        camposDefaults: {},
        ordem,
      });
    }
    setEditor({ aberto: false, template: null });
  }

  async function excluir(id: string, nome: string) {
    if (!window.confirm(`Excluir o template "${nome}"?`)) return;
    await removerTemplate(id);
  }

  return (
    <>
      <section
        aria-label="Templates de atividade"
        className="rounded-2xl border border-navy-100 bg-navy-50 p-4 dark:border-dark-border dark:bg-dark-elevated/40 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Templates de atividade
        </h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          Pré-modelos de card (título, descrição, etiquetas e subtarefas).
          Disponíveis no botão ▾ ao adicionar card no quadro.
        </p>

        <div className="mt-4">
          <SortableConfigList
            ariaLabel="Lista de templates"
            items={templates}
            getId={(t) => t.id}
            getNome={(t) => t.nome}
            onReorder={reordenarTemplates}
            tituloAlfabetizar="Ordenar templates A→Z"
            emptyLabel="Nenhum template cadastrado."
            renderRow={(t, handle) => (
              <TemplateRow
                template={t}
                handle={handle}
                onEditar={() => setEditor({ aberto: true, template: t })}
                onDelete={() => excluir(t.id, t.nome)}
              />
            )}
          />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setEditor({ aberto: true, template: null })}
            className={btnPrimary}
          >
            + Novo template
          </button>
        </div>
      </section>

      {editor.aberto && (
        <TemplateEditor
          template={editor.template}
          onSalvar={salvar}
          onClose={() => setEditor({ aberto: false, template: null })}
        />
      )}
    </>
  );
}
