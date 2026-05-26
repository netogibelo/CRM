"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setEnviando(false);

    if (error) {
      setErro(traduzErro(error.message));
      return;
    }

    router.push("/");
    router.refresh();
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
              aria-label="Email"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="senha" className={labelCls}>
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              placeholder="••••••••"
              aria-label="Senha"
              className={inputCls}
            />
          </div>

          {erro && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !email || !senha}
            className={`${btnPrimary} w-full`}
            aria-label="Entrar"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy-400">
          Acesso restrito · Gibelo Engenharia
        </p>
      </div>
    </main>
  );
}

function traduzErro(mensagem: string): string {
  const lower = mensagem.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email ainda não confirmado. Verifique a caixa de entrada.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos.";
  }
  return mensagem;
}
