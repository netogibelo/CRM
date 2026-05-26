"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";

type Mensagem = { tipo: "ok" | "erro"; texto: string };

function ErroCallback() {
  const params = useSearchParams();
  if (!params.get("error")) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      Link inválido ou expirado. Solicite um novo abaixo.
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<Mensagem | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setEnviando(false);

    if (error) {
      setMsg({ tipo: "erro", texto: error.message });
    } else {
      setMsg({
        tipo: "ok",
        texto: "Link mágico enviado. Verifique seu email.",
      });
      setEmail("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 shadow-sm">
        <header className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white"
            aria-hidden="true"
          >
            GE
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-navy-900">
              Gibelo Engenharia
            </h1>
            <p className="text-xs text-navy-400">CRM · Funil de Vendas</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
              placeholder="seu@email.com"
              aria-label="Email para receber o link de acesso"
              className={inputCls}
            />
          </div>

          {!msg && (
            <Suspense fallback={null}>
              <ErroCallback />
            </Suspense>
          )}

          {msg && (
            <div
              role="alert"
              aria-live="polite"
              className={
                msg.tipo === "ok"
                  ? "rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
                  : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              }
            >
              {msg.texto}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !email}
            className={`${btnPrimary} w-full`}
            aria-label="Enviar link mágico para o email"
          >
            {enviando ? "Enviando…" : "Enviar link mágico"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy-400">
          Acesso restrito · Gibelo Engenharia
        </p>
      </div>
    </main>
  );
}
