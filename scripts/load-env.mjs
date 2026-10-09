// Carrega .env.local e .env.test.local (sem dependências: Node >= 20.12).
import { existsSync } from "node:fs";

const SUPABASE_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const TEST_VARS = [
  "TEST_PASSWORD",
  "TEST_MANAGER_A",
  "TEST_MANAGER_B",
  "TEST_FIELD_A",
  "TEST_MANAGER_UI",
];

export function loadEnv(extra = TEST_VARS) {
  for (const file of [".env.local", ".env.test.local"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const required = [...SUPABASE_VARS, ...extra];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `Faltam variáveis: ${missing.join(", ")}.\n` +
        "Veja .env.example e .env.test.example na raiz do projeto.",
    );
    process.exit(2);
  }
  return process.env;
}

/**
 * Senha das contas da demo. Se DEMO_PASSWORD não estiver no .env.test.local,
 * gera uma senha forte, grava no arquivo (ignorado pelo Git) e mostra no
 * terminal; as próximas execuções reaproveitam a mesma.
 */
export async function ensureDemoPassword() {
  if (process.env.DEMO_PASSWORD) return { password: process.env.DEMO_PASSWORD, created: false };
  const { randomInt } = await import("node:crypto");
  const { appendFileSync, readFileSync } = await import("node:fs");
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const password = `Expedito-${part()}-${part()}-${part()}`;
  const file = ".env.test.local";
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const cleaned = current.replace(/^DEMO_PASSWORD=\s*$/m, "");
  if (cleaned !== current) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(file, cleaned);
  }
  appendFileSync(file, `${cleaned.endsWith("\n") || cleaned === "" ? "" : "\n"}DEMO_PASSWORD=${password}\n`);
  process.env.DEMO_PASSWORD = password;
  return { password, created: true };
}
