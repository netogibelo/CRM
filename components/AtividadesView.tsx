"use client";

import { useState } from "react";
import type { AtividadeCard as TCard } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { btnPrimary } from "@/lib/ui";
import { AtividadeColuna } from "./AtividadeColuna";
import { AtividadeCardForm, type CardFormData } from "./AtividadeCardForm";

export function AtividadesView() {
  const {
    carregando,
    listas,
    cardsDaLista,
    criarLista,
    renomearLista,
    removerLista,
    moverLista,
    criarCard,
    atualizarCard,
    removerCard,
    moverCard,
  } = useBoard();

  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    aberto: boolean;
    card: TCard | null;
    listaId: string;
  }>({ aberto: false, card: null, listaId: "" });

  function novoCard(listaId: string) {
    setForm({ aberto: true, card: null, listaId });
  }
  function abrirCard(card: TCard) {
    setForm({ aberto: true, card, listaId: card.listaId });
  }
  function fecharForm() {
    setForm({ aberto: false, card: null, listaId: "" });
  }

  async function salvarCard(data: CardFormData) {
    if (form.card) await atualizarCard(form.card.id, data);
    else await criarCard(data);
    fecharForm();
  }
  async function excluirCard(id: string) {
    if (!window.confirm("Excluir este card?")) return;
    await removerCard(id);
    fecharForm();
  }
  async function excluirLista(id: string) {
    const lista = listas.find((l) => l.id === id);
    const qtd = cardsDaLista(id).length;
    const aviso =
      qtd > 0
        ? `Excluir a lista "${lista?.nome}" e seus ${qtd} card(s)?`
        : `Excluir a lista "${lista?.nome}"?`;
    if (!window.confirm(aviso)) return;
    await removerLista(id);
  }

  if (carregando) {
    return (
      <div className="py-16 text-center text-sm text-navy-400" role="status">
        Carregando atividades…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">
          Quadro de tarefas da semana — arraste os cards entre as listas.
        </p>
        <button
          type="button"
          onClick={() => criarLista("Nova lista")}
          className={btnPrimary}
        >
          + Nova lista
        </button>
      </div>

      {listas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-navy-700">
            Nenhuma lista no quadro.
          </p>
          <p className="mt-1 text-sm text-navy-400">
            Crie a primeira lista para começar a organizar as tarefas.
          </p>
        </div>
      ) : (
        <div className="scrollbar-board -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-4">
            {listas.map((lista, i) => (
              <AtividadeColuna
                key={lista.id}
                lista={lista}
                cards={cardsDaLista(lista.id)}
                listas={listas}
                posicao={i}
                total={listas.length}
                onAbrirCard={abrirCard}
                onNovoCard={novoCard}
                onMoverCard={(cardId, listaId) => {
                  setArrastandoId(null);
                  moverCard(cardId, listaId);
                }}
                onRenomear={renomearLista}
                onRemover={excluirLista}
                onMoverLista={moverLista}
                onDragStart={setArrastandoId}
                onDragEnd={() => setArrastandoId(null)}
                arrastandoId={arrastandoId}
              />
            ))}
          </div>
        </div>
      )}

      {form.aberto && (
        <AtividadeCardForm
          card={form.card}
          listaIdInicial={form.listaId}
          listas={listas}
          onSalvar={salvarCard}
          onClose={fecharForm}
          onExcluir={excluirCard}
        />
      )}
    </div>
  );
}
