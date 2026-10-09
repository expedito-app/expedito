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

// Papel do usuário também em app_metadata (gravado na criação da conta pelo
// servidor), para o proxy não consultar o banco a cada requisição.
export const ROLE_KEY = "expedito_role";

export function roleFromClaims(
  appMetadata: UserAppMetadata | undefined,
): "manager" | "field" | null {
  const value = appMetadata?.[ROLE_KEY];
  return value === "manager" || value === "field" ? value : null;
}

// Gestor recém-criado precisa cadastrar a empresa e o endereço-base (ponto de
// saída das rotas) antes de usar o sistema. Marca em app_metadata, como a senha.
export const NEEDS_COMPANY_KEY = "needs_company";
export const COMPANY_SETUP_PATH = "/cadastro-empresa";

export function needsCompanySetup(appMetadata: UserAppMetadata | undefined): boolean {
  return appMetadata?.[NEEDS_COMPANY_KEY] === true;
}
