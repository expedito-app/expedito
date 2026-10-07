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
