// APAGA TUDO: todas as contas (gestores, campo, contas de teste) e todos os
// dados de domínio (agências, tarefas, ocorrências, assinaturas).
// Uso: npm run reset:all -- --confirmo-apagar-tudo
// Sem a flag, só mostra o que seria apagado.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const env = loadEnv([]);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const confirmed = process.argv.includes("--confirmo-apagar-tudo");

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function count(table) {
  const { count: total, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return total ?? 0;
}

const users = await listAllUsers();
const counts = {};
for (const table of ["profiles", "agencies", "tasks", "task_occurrences", "task_signatures"]) {
  counts[table] = await count(table);
}
console.log(`Contas: ${users.length}`);
for (const u of users) console.log(`  - ${u.email}`);
console.log("Registros:", counts);

if (!confirmed) {
  console.log("\nNada foi apagado. Para apagar TUDO, rode: npm run reset:all -- --confirmo-apagar-tudo");
  process.exit(0);
}

// Ordem: tarefas (levam ocorrências e assinaturas), agências (FK restrict com
// tarefas) e por fim as contas (levam os perfis em cascata).
const NONE = "00000000-0000-0000-0000-000000000000";
for (const table of ["tasks", "agencies"]) {
  const { error } = await admin.from(table).delete().neq("id", NONE);
  if (error) throw error;
}
for (const u of users) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) throw new Error(`${u.email}: ${error.message}`);
}
console.log(`\nApagado: ${users.length} contas e todos os dados. Rode agora: npm run seed:demo`);
