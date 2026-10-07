// Variáveis públicas: referenciadas literalmente para o Next.js embuti-las no bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  if (!url || !anonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
    );
  }
  return { url, anonKey };
}
