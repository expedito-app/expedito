import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "./env";

// Service role: ignora RLS. Somente em Server Actions, nunca no navegador.
// O import "server-only" faz o build falhar se este módulo chegar ao cliente.
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY no .env.local");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
