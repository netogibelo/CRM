// Cliente Supabase para uso no browser (Client Components).
//
// Credenciais vêm de .env.local (não commitado):
//   NEXT_PUBLIC_SUPABASE_URL=...
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
//
// Para uso em Server Components / Route Handlers, importe de "@/lib/supabase-server".

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
