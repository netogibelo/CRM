"use client";

import { useState } from "react";
import type { Deal, DealInput } from "@/lib/types";
import { useDeals, useStages } from "@/lib/crm-store";
import { DealForm } from "./DealForm";
import { useConfirm } from "./ConfirmDialog";

/**
 * Encapsula o modal de oportunidade e os desfechos (ganho/perdido/reabrir),
 * compartilhado entre as abas Funil e Histórico.
 */
export function useDealForm() {
  const { deals, criar, atualizar, remover } = useDeals();
  const { final, ativas } = useStages();

  const [aberto, setAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Deal | null>(null);
  const { confirmar, dialogo } = useConfirm();

  function abrirNovo() {
    setEmEdicao(null);
    setAberto(true);
  }
  function abrir(d: Deal) {
    setEmEdicao(d);
    setAberto(true);
  }
  function fechar() {
    setAberto(false);
    setEmEdicao(null);
  }

  async function salvar(input: DealInput) {
    if (emEdicao) await atualizar(emEdicao.id, input);
    else await criar(input);
    fechar();
  }

  async function excluir(id: string) {
    const alvo = deals.find((d) => d.id === id);
    const ok = await confirmar({
      titulo: "Excluir oportunidade",
      mensagem: `Excluir a oportunidade "${alvo?.projeto ?? ""}"? Esta ação não pode ser desfeita.`,
      labelConfirmar: "Excluir",
    });
    if (!ok) return;
    await remover(id);
    fechar();
  }

  async function marcarGanho(id: string) {
    const alvo = deals.find((d) => d.id === id);
    await atualizar(id, {
      status: "ganho",
      etapaId: final?.id ?? alvo?.etapaId ?? "",
      motivoPerda: null,
    });
    fechar();
  }

  async function marcarPerdido(id: string, motivo: string) {
    await atualizar(id, { status: "perdido", motivoPerda: motivo });
    fechar();
  }

  async function reabrir(id: string) {
    const alvo = deals.find((d) => d.id === id);
    const etapaId =
      alvo && alvo.etapaId !== final?.id
        ? alvo.etapaId
        : ativas[0]?.id ?? alvo?.etapaId ?? "";
    await atualizar(id, { status: "aberto", motivoPerda: null, etapaId });
    fechar();
  }

  const elemento = (
    <>
      {aberto && (
        <DealForm
          deal={emEdicao}
          onSalvar={salvar}
          onClose={fechar}
          onExcluir={excluir}
          onGanho={marcarGanho}
          onPerdido={marcarPerdido}
          onReabrir={reabrir}
        />
      )}
      {dialogo}
    </>
  );

  return { abrir, abrirNovo, elemento };
}
