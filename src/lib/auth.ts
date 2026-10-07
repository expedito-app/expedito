import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type Role = Enums<"user_role">;
export type Profile = Tables<"profiles">;

export const HOME_BY_ROLE: Record<Role, string> = {
  manager: "/painel",
  field: "/hoje",
};

// Perfil do usuário logado, lido do banco (nunca de dados do cliente).
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return profile;
});

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(HOME_BY_ROLE[profile.role]);
  return profile;
}
