"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function LogoutButton() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="flex items-center gap-3">
      <span
        className="hidden text-xs text-navy-500 sm:inline"
        title={email}
        aria-label={`Logado como ${email}`}
      >
        {email}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-50"
        aria-label="Sair da sessão"
      >
        Sair
      </button>
    </div>
  );
}
