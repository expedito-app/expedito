import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  CHANGE_PASSWORD_PATH,
  mustChangePassword,
  roleFromClaims,
} from "@/lib/password-change";

const PUBLIC_PATHS = ["/login"];
const MANAGER_PATHS = ["/painel", "/indicadores", "/tarefas", "/rotas", "/agencias", "/equipe"];
const FIELD_PATHS = ["/hoje"];
const HOME = { manager: "/painel", field: "/hoje" } as const;

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Renova a sessão do Supabase e envia cada perfil para a sua área.
// É a camada de UX; a autorização definitiva é o RLS no banco.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Não colocar código entre a criação do cliente e getClaims():
  // é essa chamada que valida o token e dispara a renovação dos cookies.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  // Redireciona mantendo os cookies de sessão renovados acima.
  const redirectTo = (pathname: string) => {
    const redirect = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { pathname } = request.nextUrl;

  if (!userId) {
    return matches(pathname, PUBLIC_PATHS) ? response : redirectTo("/login");
  }

  // Papel gravado no token (app_metadata, que só o service role altera) evita
  // uma consulta ao banco por requisição. Contas antigas sem a marca caem na
  // consulta ao perfil. A autorização definitiva continua no RLS.
  let role = roleFromClaims(data?.claims.app_metadata);
  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    role = profile?.role ?? null;
  }
  if (!role) {
    return matches(pathname, PUBLIC_PATHS) ? response : redirectTo("/login");
  }
  const profile = { role };

  // Senha temporária: só a tela de troca fica acessível até a senha mudar.
  const onChangePassword = matches(pathname, [CHANGE_PASSWORD_PATH]);
  if (mustChangePassword(data?.claims.app_metadata)) {
    return onChangePassword ? response : redirectTo(CHANGE_PASSWORD_PATH);
  }

  const home = HOME[profile.role];
  if (pathname === "/" || onChangePassword || matches(pathname, PUBLIC_PATHS)) {
    return redirectTo(home);
  }
  if (profile.role === "field" && matches(pathname, MANAGER_PATHS)) {
    return redirectTo(home);
  }
  if (profile.role === "manager" && matches(pathname, FIELD_PATHS)) {
    return redirectTo(home);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
