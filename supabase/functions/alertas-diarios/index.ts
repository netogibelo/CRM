// Edge Function: alertas-diarios
//
// Roda 1x/dia (10h UTC = 07h Brasília) via pg_cron e também pode ser disparada
// manualmente pela UI (Configurações → Testar agora).
//
// Para cada deal aberto identifica três tipos de alerta:
//   - parado: dias sem atividade > limite da etapa (7 ou 14)
//   - retorno_vencido: previsao_fechamento < hoje
//   - tarefa_vencida: tarefa não concluída com data_vencimento < hoje
//
// Agrupa por responsavel_email, envia um email por responsável via Brevo. Se
// algum alerta não tiver responsável definido, é enviado para
// netogibelo@gmail.com (fallback do dono).
//
// IMPORTANTE: a função usa o SERVICE_ROLE_KEY (auto-injetado) para bypassar RLS
// e ler todos os deals/tarefas/perfis sem necessidade de sessão.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Configuração ─────────────────────────────────────────────────────────────
// Chave Brevo: primeiro tenta env var BREVO_API_KEY (Functions secret); se não
// existir, busca no Supabase Vault via RPC `get_brevo_api_key` (security definer,
// só executável pelo service_role).
const REMETENTE_EMAIL = "netogibelo@outlook.com";
const REMETENTE_NOME = "CRM Gibelo Engenharia";
const FALLBACK_EMAIL = "netogibelo@gmail.com";
const APP_URL = "https://crm-gibelo.vercel.app";
const NAVY = "#0D2137";

// ── Tipos básicos ─────────────────────────────────────────────────────────────
type Deal = {
  id: string;
  projeto: string;
  cliente_id: string;
  etapa_id: string;
  previsao_fechamento: string | null;
  atualizado_em: string;
  status: string;
  responsavel_email: string | null;
  valor: number;
};
type Etapa = { id: string; nome: string; probabilidade: number; final: boolean };
type Tarefa = {
  id: string;
  deal_id: string;
  titulo: string;
  data_vencimento: string;
  concluida: boolean;
  responsavel_email: string | null;
};
type Cliente = { id: string; nome: string };
type Perfil = { email: string; nome_exibicao: string };
type Historico = { deal_id: string; criado_em: string };

// ── Utilitários ──────────────────────────────────────────────────────────────
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function limitePorEtapa(etapa: Etapa | undefined): number {
  if (!etapa) return 14;
  if (etapa.probabilidade >= 0.6) return 7;
  if (etapa.probabilidade < 0.2) return 7;
  return 14;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nomeResponsavel(email: string, perfis: Perfil[]): string {
  const p = perfis.find((x) => x.email === email);
  if (p && p.nome_exibicao.trim()) return p.nome_exibicao;
  const local = email.split("@")[0];
  return local || email;
}

// ── Cálculo dos alertas ──────────────────────────────────────────────────────
interface AlertaParado {
  tipo: "parado";
  dealId: string;
  projeto: string;
  cliente: string;
  etapa: string;
  dias: number;
  limite: number;
}
interface AlertaRetorno {
  tipo: "retorno_vencido";
  dealId: string;
  projeto: string;
  cliente: string;
  dataPrevista: string;
  diasAtraso: number;
}
interface AlertaTarefa {
  tipo: "tarefa_vencida";
  tarefaId: string;
  dealId: string;
  projeto: string;
  cliente: string;
  titulo: string;
  vencimento: string;
  diasAtraso: number;
}
type Alerta = AlertaParado | AlertaRetorno | AlertaTarefa;

interface AlertasPorResponsavel {
  parados: AlertaParado[];
  retornos: AlertaRetorno[];
  tarefas: AlertaTarefa[];
}

function emptyBucket(): AlertasPorResponsavel {
  return { parados: [], retornos: [], tarefas: [] };
}

function calcularAlertas(input: {
  deals: Deal[];
  etapas: Etapa[];
  tarefas: Tarefa[];
  clientes: Cliente[];
  historicoPorDeal: Map<string, string>;
}): Map<string, AlertasPorResponsavel> {
  const { deals, etapas, tarefas, clientes, historicoPorDeal } = input;
  const mapaEtapa = new Map(etapas.map((e) => [e.id, e]));
  const mapaCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const hoje = hojeISO();
  const out = new Map<string, AlertasPorResponsavel>();

  function bucket(email: string | null): AlertasPorResponsavel {
    const chave = email ?? FALLBACK_EMAIL;
    let b = out.get(chave);
    if (!b) {
      b = emptyBucket();
      out.set(chave, b);
    }
    return b;
  }

  for (const d of deals) {
    if (d.status !== "aberto") continue;
    const etapa = mapaEtapa.get(d.etapa_id);
    if (etapa?.final) continue;

    const cliente = mapaCliente.get(d.cliente_id) ?? "—";

    // 1. Parado
    const ultima = historicoPorDeal.get(d.id) ?? d.atualizado_em;
    const dias = diasDesde(ultima);
    const limite = limitePorEtapa(etapa);
    if (dias > limite) {
      bucket(d.responsavel_email).parados.push({
        tipo: "parado",
        dealId: d.id,
        projeto: d.projeto,
        cliente,
        etapa: etapa?.nome ?? "—",
        dias,
        limite,
      });
    }

    // 2. Retorno vencido
    if (d.previsao_fechamento && d.previsao_fechamento < hoje) {
      const diasAtraso = diasDesde(`${d.previsao_fechamento}T00:00:00`);
      bucket(d.responsavel_email).retornos.push({
        tipo: "retorno_vencido",
        dealId: d.id,
        projeto: d.projeto,
        cliente,
        dataPrevista: d.previsao_fechamento,
        diasAtraso,
      });
    }
  }

  // 3. Tarefas vencidas
  const dealById = new Map(deals.map((d) => [d.id, d]));
  for (const t of tarefas) {
    if (t.concluida) continue;
    if (t.data_vencimento >= hoje) continue;
    const deal = dealById.get(t.deal_id);
    if (!deal) continue;
    const cliente = mapaCliente.get(deal.cliente_id) ?? "—";
    const diasAtraso = diasDesde(`${t.data_vencimento}T00:00:00`);
    // Tarefa segue seu próprio responsável; cai no do deal se nula.
    const resp = t.responsavel_email ?? deal.responsavel_email;
    bucket(resp).tarefas.push({
      tipo: "tarefa_vencida",
      tarefaId: t.id,
      dealId: t.deal_id,
      projeto: deal.projeto,
      cliente,
      titulo: t.titulo,
      vencimento: t.data_vencimento,
      diasAtraso,
    });
  }

  return out;
}

// ── Geração de HTML ──────────────────────────────────────────────────────────
function linkDeal(dealId: string): string {
  return `${APP_URL}/?deal=${encodeURIComponent(dealId)}`;
}

function secao(titulo: string, corBadge: string, itens: string[]): string {
  if (itens.length === 0) return "";
  return `
    <tr><td style="padding:18px 0 8px 0;">
      <div style="display:inline-block;background:${corBadge};color:#fff;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(titulo)} · ${itens.length}</div>
    </td></tr>
    ${itens
      .map(
        (it) => `
      <tr><td style="padding:6px 0;">
        <div style="border:1px solid #e2e9f1;border-radius:10px;padding:12px 14px;background:#fff;">
          ${it}
        </div>
      </td></tr>`,
      )
      .join("")}
  `;
}

function itemParado(a: AlertaParado): string {
  return `
    <div style="font-size:14px;font-weight:600;color:${NAVY};margin-bottom:4px;">
      <a href="${linkDeal(a.dealId)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(a.projeto)}</a>
    </div>
    <div style="font-size:12px;color:#5b7693;">
      ${escapeHtml(a.cliente)} · ${escapeHtml(a.etapa)} · <strong style="color:#b45309;">parado há ${a.dias}d</strong> (limite ${a.limite}d)
    </div>`;
}

function itemRetorno(a: AlertaRetorno): string {
  return `
    <div style="font-size:14px;font-weight:600;color:${NAVY};margin-bottom:4px;">
      <a href="${linkDeal(a.dealId)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(a.projeto)}</a>
    </div>
    <div style="font-size:12px;color:#5b7693;">
      ${escapeHtml(a.cliente)} · retorno previsto em ${escapeHtml(a.dataPrevista.split("-").reverse().join("/"))} · <strong style="color:#dc2626;">${a.diasAtraso}d em atraso</strong>
    </div>`;
}

function itemTarefa(a: AlertaTarefa): string {
  return `
    <div style="font-size:14px;font-weight:600;color:${NAVY};margin-bottom:4px;">
      <a href="${linkDeal(a.dealId)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(a.titulo)}</a>
    </div>
    <div style="font-size:12px;color:#5b7693;">
      ${escapeHtml(a.projeto)} · ${escapeHtml(a.cliente)} · venceu em ${escapeHtml(a.vencimento.split("-").reverse().join("/"))} · <strong style="color:#dc2626;">${a.diasAtraso}d em atraso</strong>
    </div>`;
}

function montarHTML(
  destinatario: string,
  nomeDest: string,
  alertas: AlertasPorResponsavel,
): string {
  const total =
    alertas.parados.length + alertas.retornos.length + alertas.tarefas.length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e9f1;">
        <tr><td style="background:${NAVY};padding:20px 24px;">
          <div style="color:#fff;font-size:18px;font-weight:700;">CRM Gibelo Engenharia</div>
          <div style="color:#a8c2e0;font-size:13px;margin-top:2px;">Resumo diário de alertas</div>
        </td></tr>
        <tr><td style="padding:24px 24px 8px 24px;">
          <div style="font-size:14px;color:${NAVY};">
            Olá, <strong>${escapeHtml(nomeDest)}</strong>.
          </div>
          <div style="font-size:13px;color:#5b7693;margin-top:6px;">
            Você tem <strong style="color:${NAVY};">${total} ${total === 1 ? "alerta" : "alertas"}</strong> que precisam de atenção hoje.
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${secao("Deals parados", "#b45309", alertas.parados.map(itemParado))}
            ${secao("Retornos vencidos", "#dc2626", alertas.retornos.map(itemRetorno))}
            ${secao("Tarefas vencidas", "#dc2626", alertas.tarefas.map(itemTarefa))}
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 28px 24px;">
          <a href="${APP_URL}" style="display:inline-block;background:${NAVY};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
            Abrir o CRM
          </a>
        </td></tr>
        <tr><td style="background:#f6f8fb;padding:16px 24px;border-top:1px solid #e2e9f1;text-align:center;">
          <div style="font-size:11px;color:#7a93b1;">
            Gibelo Engenharia • CREA-SP 5070966442
          </div>
          <div style="font-size:11px;color:#a8b8cc;margin-top:4px;">
            Enviado para ${escapeHtml(destinatario)}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Envio via Brevo ──────────────────────────────────────────────────────────
async function enviarBrevo(
  apiKey: string,
  destinatario: string,
  nomeDest: string,
  alertas: AlertasPorResponsavel,
): Promise<{ ok: boolean; status: number; body?: string }> {
  const total =
    alertas.parados.length + alertas.retornos.length + alertas.tarefas.length;
  if (total === 0) return { ok: true, status: 200, body: "sem alertas" };

  const subject = `CRM Gibelo - ${total} ${total === 1 ? "alerta" : "alertas"} para hoje`;
  const html = montarHTML(destinatario, nomeDest, alertas);

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: REMETENTE_EMAIL, name: REMETENTE_NOME },
      to: [{ email: destinatario, name: nomeDest }],
      subject,
      htmlContent: html,
    }),
  });

  const body = await resp.text();
  return { ok: resp.ok, status: resp.status, body };
}

// ── Handler HTTP ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS (UI pode chamar via supabase.functions.invoke)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "authorization, x-client-info, apikey, content-type",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }

  const corsHeaders = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ ok: false, erro: "env vars ausentes" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Carrega chave Brevo: env var primeiro, depois Vault via RPC.
    let apiKey = Deno.env.get("BREVO_API_KEY") ?? "";
    if (!apiKey) {
      const rpc = await client.rpc("get_brevo_api_key");
      if (rpc.error) throw rpc.error;
      apiKey = (rpc.data as string | null) ?? "";
    }
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: "BREVO_API_KEY ausente — defina via env var ou Supabase Vault",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Body pode trazer { forcar: true } pra ignorar o toggle (usado pelo botão "Testar agora").
    let forcar = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && body.forcar === true) forcar = true;
      } catch {
        /* sem body — segue */
      }
    }

    if (!forcar) {
      const cfg = await client
        .from("alertas_config")
        .select("ativo")
        .eq("id", 1)
        .maybeSingle();
      if (cfg.error) throw cfg.error;
      if (cfg.data && cfg.data.ativo === false) {
        return new Response(
          JSON.stringify({ ok: true, ignorado: true, motivo: "alertas desativados" }),
          { headers: corsHeaders },
        );
      }
    }

    const [
      dealsRes,
      etapasRes,
      tarefasRes,
      clientesRes,
      perfisRes,
      histRes,
    ] = await Promise.all([
      client.from("deals").select(
        "id, projeto, cliente_id, etapa_id, previsao_fechamento, atualizado_em, status, responsavel_email, valor",
      ).eq("status", "aberto"),
      client.from("etapas").select("id, nome, probabilidade, final"),
      client.from("tarefas").select(
        "id, deal_id, titulo, data_vencimento, concluida, responsavel_email",
      ).eq("concluida", false),
      client.from("clientes").select("id, nome"),
      client.from("perfis").select("email, nome_exibicao"),
      client.from("deal_historico").select("deal_id, criado_em").order(
        "criado_em",
        { ascending: false },
      ),
    ]);

    for (const r of [
      dealsRes,
      etapasRes,
      tarefasRes,
      clientesRes,
      perfisRes,
      histRes,
    ]) {
      if (r.error) throw r.error;
    }

    const deals = (dealsRes.data ?? []) as Deal[];
    const etapas = (etapasRes.data ?? []) as Etapa[];
    const tarefas = (tarefasRes.data ?? []) as Tarefa[];
    const clientes = (clientesRes.data ?? []) as Cliente[];
    const perfis = (perfisRes.data ?? []) as Perfil[];
    const historicos = (histRes.data ?? []) as Historico[];

    // Mapa dealId → criado_em mais recente
    const historicoPorDeal = new Map<string, string>();
    for (const h of historicos) {
      if (!historicoPorDeal.has(h.deal_id)) {
        historicoPorDeal.set(h.deal_id, h.criado_em);
      }
    }

    const buckets = calcularAlertas({
      deals,
      etapas,
      tarefas,
      clientes,
      historicoPorDeal,
    });

    const enviados: Array<{
      destinatario: string;
      totalAlertas: number;
      ok: boolean;
      status: number;
    }> = [];

    for (const [email, alertas] of buckets.entries()) {
      const total =
        alertas.parados.length +
        alertas.retornos.length +
        alertas.tarefas.length;
      if (total === 0) continue;
      const nome = nomeResponsavel(email, perfis);
      const res = await enviarBrevo(apiKey, email, nome, alertas);
      enviados.push({
        destinatario: email,
        totalAlertas: total,
        ok: res.ok,
        status: res.status,
      });
      if (!res.ok) {
        console.error("Brevo falhou", email, res.status, res.body);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        rodadoEm: new Date().toISOString(),
        responsaveisNotificados: enviados.length,
        detalhes: enviados,
      }),
      { headers: corsHeaders },
    );
  } catch (e) {
    const msg = (e as any)?.message ?? String(e);
    console.error("Erro alertas-diarios:", msg);
    return new Response(JSON.stringify({ ok: false, erro: msg }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
