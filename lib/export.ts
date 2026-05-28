// Exportadores de relatórios — Excel (XLSX) e PDF (window.print).

import * as XLSX from "xlsx";
import type {
  Cliente,
  Contato,
  Deal,
  DealServico,
  Etapa,
  Origem,
  Perfil,
} from "./types";
import { formatBRL, formatDateBR, diasDesde } from "./format";
import { nomeOuEmail } from "./equipe";
import { ordenarEtapas } from "./stages";

export interface ExportContext {
  deals: Deal[];
  clientes: Cliente[];
  contatos: Contato[];
  origens: Origem[];
  etapas: Etapa[];
  servicos: DealServico[];
  perfis: Perfil[];
  /** Período rotulado (ex.: "30 dias"). */
  periodoLabel: string;
  /** Dias da janela usada para filtrar fechados/perdidos. */
  periodoDias: number;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nomeArquivo(ext: string): string {
  return `CRM-Gibelo-${hojeISO()}.${ext}`;
}

function dentroDoPeriodo(iso: string, diasJanela: number): boolean {
  const corte = Date.now() - diasJanela * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= corte;
}

function lookupNome<T extends { id: string; nome: string }>(
  lista: T[],
  id: string,
): string {
  return lista.find((x) => x.id === id)?.nome ?? "—";
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel (XLSX)
// ─────────────────────────────────────────────────────────────────────────────
export function exportarExcel(ctx: ExportContext): void {
  const {
    deals,
    clientes,
    contatos,
    origens,
    etapas,
    servicos,
    perfis,
    periodoDias,
  } = ctx;

  const wb = XLSX.utils.book_new();
  const hoje = new Date();

  // Aba Pipeline — todos os deals abertos
  const abertos = deals
    .filter((d) => d.status === "aberto")
    .sort(
      (a, b) =>
        (etapas.find((e) => e.id === a.etapaId)?.ordem ?? 0) -
        (etapas.find((e) => e.id === b.etapaId)?.ordem ?? 0),
    );
  const pipelineRows = abertos.map((d) => {
    const contato = contatos.find((c) => c.id === d.contatoId);
    return {
      Projeto: d.projeto,
      Cliente: lookupNome(clientes, d.clienteId),
      Contato: contato?.nome ?? "",
      Cargo: contato?.cargo ?? "",
      "Telefone contato": contato?.telefone ?? "",
      "E-mail contato": contato?.email ?? "",
      "Valor (R$)": d.valor,
      Etapa: lookupNome(etapas, d.etapaId),
      Responsável: d.responsavelEmail
        ? nomeOuEmail(d.responsavelEmail, perfis)
        : "",
      Origem: lookupNome(origens, d.origemId),
      "Próximo retorno": d.previsaoFechamento || "",
      "Dias na etapa": diasDesde(d.atualizadoEm),
    };
  });
  const wsPipeline = XLSX.utils.json_to_sheet(pipelineRows);
  XLSX.utils.book_append_sheet(wb, wsPipeline, "Pipeline");

  // Aba Fechados — deals ganhos no período
  const fechadosRows = deals
    .filter(
      (d) => d.status === "ganho" && dentroDoPeriodo(d.atualizadoEm, periodoDias),
    )
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
    )
    .map((d) => ({
      Projeto: d.projeto,
      Cliente: lookupNome(clientes, d.clienteId),
      "Valor (R$)": d.valor,
      "Data fechamento": d.atualizadoEm.slice(0, 10),
      Origem: lookupNome(origens, d.origemId),
      Responsável: d.responsavelEmail
        ? nomeOuEmail(d.responsavelEmail, perfis)
        : "",
    }));
  const wsFechados = XLSX.utils.json_to_sheet(
    fechadosRows.length > 0
      ? fechadosRows
      : [{ Projeto: "—", Cliente: "—", "Valor (R$)": 0 }],
  );
  XLSX.utils.book_append_sheet(wb, wsFechados, "Fechados");

  // Aba Perdidos — deals perdidos no período
  const perdidosRows = deals
    .filter(
      (d) =>
        d.status === "perdido" && dentroDoPeriodo(d.atualizadoEm, periodoDias),
    )
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
    )
    .map((d) => ({
      Projeto: d.projeto,
      Cliente: lookupNome(clientes, d.clienteId),
      "Valor (R$)": d.valor,
      "Data perda": d.atualizadoEm.slice(0, 10),
      Motivo: d.motivoPerda ?? "",
      Origem: lookupNome(origens, d.origemId),
    }));
  const wsPerdidos = XLSX.utils.json_to_sheet(
    perdidosRows.length > 0
      ? perdidosRows
      : [{ Projeto: "—", Cliente: "—", "Valor (R$)": 0 }],
  );
  XLSX.utils.book_append_sheet(wb, wsPerdidos, "Perdidos");

  // Aba Serviços — todos os serviços por deal
  const servicosRows = servicos
    .slice()
    .sort((a, b) => a.dealId.localeCompare(b.dealId) || a.ordem - b.ordem)
    .map((s) => {
      const d = deals.find((x) => x.id === s.dealId);
      return {
        Deal: d?.projeto ?? "—",
        Cliente: d ? lookupNome(clientes, d.clienteId) : "—",
        Serviço: s.descricao,
        "Valor (R$)": s.valor,
        Status: d?.status ?? "—",
      };
    });
  const wsServicos = XLSX.utils.json_to_sheet(
    servicosRows.length > 0
      ? servicosRows
      : [{ Deal: "—", Cliente: "—", Serviço: "—", "Valor (R$)": 0 }],
  );
  XLSX.utils.book_append_sheet(wb, wsServicos, "Serviços");

  // Larguras agradáveis
  for (const ws of [wsPipeline, wsFechados, wsPerdidos, wsServicos]) {
    const ref = ws["!ref"];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    ws["!cols"] = Array.from({ length: range.e.c + 1 }, () => ({ wch: 22 }));
  }

  // Suprimir o "hoje" não usado — evita warning de var não usada em modo strict.
  void hoje;

  XLSX.writeFile(wb, nomeArquivo("xlsx"));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF (via window.print de uma janela nova com HTML estilizado)
// ─────────────────────────────────────────────────────────────────────────────
function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportarPDF(ctx: ExportContext): void {
  const {
    deals,
    clientes,
    origens,
    etapas,
    perfis,
    periodoLabel,
    periodoDias,
  } = ctx;

  // Métricas
  const totalMesa = deals
    .filter((d) => d.status === "aberto")
    .reduce((a, d) => a + d.valor, 0);

  const probMap = new Map(etapas.map((e) => [e.id, e.probabilidade]));
  const valorPonderado = deals
    .filter((d) => d.status === "aberto")
    .reduce((a, d) => a + d.valor * (probMap.get(d.etapaId) ?? 0), 0);

  const ganhos = deals.filter(
    (d) => d.status === "ganho" && dentroDoPeriodo(d.atualizadoEm, periodoDias),
  );
  const perdidos = deals.filter(
    (d) =>
      d.status === "perdido" && dentroDoPeriodo(d.atualizadoEm, periodoDias),
  );
  const taxaFechamento =
    ganhos.length + perdidos.length > 0
      ? Math.round((ganhos.length / (ganhos.length + perdidos.length)) * 100)
      : 0;
  const ticketMedio =
    ganhos.length > 0
      ? ganhos.reduce((a, d) => a + d.valor, 0) / ganhos.length
      : 0;

  // Pipeline por etapa (somente etapas ativas)
  const etapasOrdenadas = ordenarEtapas(etapas).filter((e) => !e.final);
  const pipelinePorEtapa = etapasOrdenadas.map((e) => {
    const dealsEtapa = deals.filter(
      (d) => d.status === "aberto" && d.etapaId === e.id,
    );
    return {
      etapa: e,
      deals: dealsEtapa.slice().sort((a, b) => b.valor - a.valor),
      total: dealsEtapa.reduce((a, d) => a + d.valor, 0),
    };
  });

  // Funil (qtd por etapa, percentual relativo à primeira)
  const maxFunil = Math.max(1, ...pipelinePorEtapa.map((p) => p.deals.length));

  const dataAgora = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório CRM Gibelo — ${escapeHTML(dataAgora)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #0D2137; font-size: 12px; line-height: 1.45; }
  h1, h2, h3 { color: #0D2137; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0D2137; padding-bottom: 10px; margin-bottom: 16px; }
  header .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  header .logo small { display: block; font-size: 10px; font-weight: 500; color: #4f6f93; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
  header .meta { text-align: right; font-size: 11px; color: #4f6f93; }
  header .meta strong { color: #0D2137; }
  .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
  .stat { border: 1px solid #d8e0eb; border-radius: 8px; padding: 10px 12px; }
  .stat .rotulo { font-size: 10px; color: #4f6f93; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat .valor { font-size: 16px; font-weight: 700; margin-top: 4px; }
  .stat.destaque { background: #0D2137; color: #fff; border-color: #0D2137; }
  .stat.destaque .rotulo { color: #b8c5d6; }
  .stat.destaque .valor { color: #fff; }
  section { margin-bottom: 20px; page-break-inside: avoid; }
  section h2 { font-size: 14px; border-bottom: 1px solid #d8e0eb; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; color: #0D2137; text-align: left; padding: 6px 8px; font-weight: 600; border-bottom: 1px solid #d8e0eb; }
  td { padding: 5px 8px; border-bottom: 1px solid #ecf0f5; vertical-align: top; }
  tr:nth-child(even) td { background: #fafbfc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .etapa-bloco { margin-bottom: 14px; page-break-inside: avoid; }
  .etapa-bloco .titulo { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .etapa-bloco .titulo strong { font-size: 12px; }
  .etapa-bloco .titulo span { font-size: 10px; color: #4f6f93; }
  .funil { display: flex; flex-direction: column; gap: 4px; }
  .funil-linha { display: grid; grid-template-columns: 180px 1fr 120px; align-items: center; gap: 12px; }
  .funil-linha .label { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .funil-linha .bar-wrap { width: 100%; }
  .funil-linha .bar { background: #0D2137; height: 18px; border-radius: 3px; color: #fff; font-size: 10px; padding: 0 6px; display: inline-flex; align-items: center; min-width: 24px; box-sizing: border-box; }
  .funil-linha .qtd { font-size: 11px; color: #4f6f93; text-align: right; font-variant-numeric: tabular-nums; }
  footer { border-top: 1px solid #d8e0eb; margin-top: 24px; padding-top: 8px; font-size: 10px; color: #4f6f93; text-align: center; }
  @media print { header { page-break-after: avoid; } button { display: none; } }
  .botoes { text-align: center; margin: 16px 0; }
  .botoes button { padding: 8px 16px; font-size: 13px; border-radius: 6px; border: 1px solid #0D2137; background: #0D2137; color: #fff; cursor: pointer; }
  .botoes button.ghost { background: #fff; color: #0D2137; margin-left: 8px; }
</style>
</head>
<body>
<header>
  <div class="logo">Gibelo Engenharia<small>Relatório de Pipeline — CRM</small></div>
  <div class="meta">
    Emitido em <strong>${escapeHTML(dataAgora)}</strong><br/>
    Período: <strong>${escapeHTML(periodoLabel)}</strong>
  </div>
</header>

<div class="botoes">
  <button onclick="window.print()">Imprimir / Salvar PDF</button>
  <button class="ghost" onclick="window.close()">Fechar</button>
</div>

<section>
  <h2>Resumo executivo</h2>
  <div class="resumo">
    <div class="stat destaque">
      <div class="rotulo">Total na mesa</div>
      <div class="valor">${escapeHTML(formatBRL(totalMesa))}</div>
    </div>
    <div class="stat">
      <div class="rotulo">Valor ponderado</div>
      <div class="valor">${escapeHTML(formatBRL(valorPonderado))}</div>
    </div>
    <div class="stat">
      <div class="rotulo">Taxa de fechamento</div>
      <div class="valor">${taxaFechamento}%</div>
    </div>
    <div class="stat">
      <div class="rotulo">Ticket médio</div>
      <div class="valor">${escapeHTML(formatBRL(ticketMedio))}</div>
    </div>
  </div>
</section>

<section>
  <h2>Funil de conversão</h2>
  <div class="funil">
    ${pipelinePorEtapa
      .map((p) => {
        const w = Math.max(4, Math.round((p.deals.length / maxFunil) * 100));
        return `
        <div class="funil-linha">
          <div class="label">${escapeHTML(p.etapa.nome)}</div>
          <div class="bar-wrap"><div class="bar" style="width: ${w}%">${p.deals.length}</div></div>
          <div class="qtd">${escapeHTML(formatBRL(p.total))}</div>
        </div>`;
      })
      .join("")}
  </div>
</section>

<section>
  <h2>Pipeline detalhado por etapa</h2>
  ${pipelinePorEtapa
    .map(
      (p) => `
    <div class="etapa-bloco">
      <div class="titulo">
        <strong>${escapeHTML(p.etapa.nome)} — ${p.deals.length} oportunidade${p.deals.length === 1 ? "" : "s"}</strong>
        <span>Total: ${escapeHTML(formatBRL(p.total))}</span>
      </div>
      ${
        p.deals.length === 0
          ? `<p style="font-size: 11px; color: #4f6f93; margin: 4px 0;">Sem oportunidades nesta etapa.</p>`
          : `<table>
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Responsável</th>
                  <th>Origem</th>
                  <th>Próx. retorno</th>
                  <th class="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${p.deals
                  .map(
                    (d) => `
                  <tr>
                    <td>${escapeHTML(d.projeto)}</td>
                    <td>${escapeHTML(lookupNome(clientes, d.clienteId))}</td>
                    <td>${escapeHTML(d.responsavelEmail ? nomeOuEmail(d.responsavelEmail, perfis) : "—")}</td>
                    <td>${escapeHTML(lookupNome(origens, d.origemId))}</td>
                    <td>${escapeHTML(d.previsaoFechamento ? formatDateBR(d.previsaoFechamento) : "—")}</td>
                    <td class="num">${escapeHTML(formatBRL(d.valor))}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>`
      }
    </div>`,
    )
    .join("")}
</section>

<footer>
  Gibelo Engenharia · CREA-SP 5070966442 · RNP 2616239100
</footer>

<script>
  // Auto-foca para que Ctrl+P funcione imediatamente.
  window.focus();
</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    window.alert(
      "Não foi possível abrir a janela do relatório. Verifique se o navegador está bloqueando popups.",
    );
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
