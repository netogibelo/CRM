// Cliente Supabase — INATIVO até o projeto Supabase existir.
//
// Tudo abaixo está comentado de propósito: o pacote @supabase/supabase-js ainda
// NÃO está instalado, então deixar o import ativo quebraria `npm run typecheck`
// e `npm run build`. Mantemos o arquivo como módulo vazio (o `export {}` no fim)
// para o build continuar limpo.
//
// Para ATIVAR:
//   1. npm install @supabase/supabase-js
//   2. Criar .env.local com:
//        NEXT_PUBLIC_SUPABASE_URL=...
//        NEXT_PUBLIC_SUPABASE_ANON_KEY=...
//   3. Descomentar o bloco abaixo (e remover o `export {}` final).
//   4. Trocar as instâncias no final de lib/repository.ts (LocalStorage* → Supabase*).

/*
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
*/

export {};
