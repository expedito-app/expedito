import type { ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";

// Checagem de perfil no servidor (a definitiva é o RLS no banco).
export async function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  await requireRole(role);
  return children;
}
