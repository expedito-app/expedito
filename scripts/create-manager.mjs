// Cria um gestor (não há cadastro público). O gestor recebe uma senha
// temporária, mostrada uma única vez, e é obrigado a trocá-la no primeiro acesso.
// Uso: npm run manager:create -- --email gestor@empresa.com --name "Nome Completo"
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
if (!email || !email.includes("@") || !name || name.length < 2) {
  console.error('Uso: npm run manager:create -- --email gestor@empresa.com --name "Nome Completo"');
  process.exit(2);
}

const env = loadEnv([]);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Sem caracteres ambíguos (0/O, 1/l/I) para ditar a senha sem erro.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const tempPassword = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// O trigger handle_new_user cria o perfil como gestor.
const { data, error } = await admin.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: { full_name: name },
  app_metadata: { must_change_password: true, expedito_role: "manager" },
});
if (error) {
  console.error(
    error.code === "email_exists"
      ? `Já existe uma conta com ${email}.`
      : `Não foi possível criar o gestor: ${error.message}`,
  );
  process.exit(1);
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("role")
  .eq("id", data.user.id)
  .single();
if (profileError || profile.role !== "manager") {
  console.error("Conta criada, mas o perfil de gestor não foi encontrado. Confira o trigger handle_new_user.");
  process.exit(1);
}

console.log(`Gestor criado: ${name} <${email}>`);
console.log(`Senha temporária: ${tempPassword}`);
console.log("Ela não será mostrada de novo. A troca é obrigatória no primeiro acesso.");
