// Carrega .env.local e .env.test.local (sem dependências: Node >= 20.12).
import { existsSync } from "node:fs";

export function loadEnv() {
  for (const file of [".env.local", ".env.test.local"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TEST_PASSWORD",
    "TEST_MANAGER_A",
    "TEST_MANAGER_B",
    "TEST_FIELD_A",
    "TEST_MANAGER_UI",
  ];
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
