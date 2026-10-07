import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TaskOptions = {
  agencies: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

// Agências e equipe de campo do gestor logado (o RLS já filtra).
export async function loadTaskOptions(): Promise<TaskOptions> {
  const supabase = await createClient();
  const [agencies, members] = await Promise.all([
    supabase.from("agencies").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "field")
      .order("full_name"),
  ]);
  return {
    agencies: agencies.data ?? [],
    members: (members.data ?? []).map((m) => ({ id: m.id, name: m.full_name })),
  };
}
