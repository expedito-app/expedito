import type { UserAppMetadata } from "@supabase/supabase-js";

// Marca de senha temporária, em app_metadata do Supabase Auth: só o servidor
// (service role) altera, então o cliente não consegue removê-la por conta própria.
export const MUST_CHANGE_PASSWORD_KEY = "must_change_password";
export const CHANGE_PASSWORD_PATH = "/trocar-senha";

export function mustChangePassword(
  appMetadata: UserAppMetadata | undefined,
): boolean {
  return appMetadata?.[MUST_CHANGE_PASSWORD_KEY] === true;
}
