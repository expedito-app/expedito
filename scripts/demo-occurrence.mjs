// Durante a apresentação: registra uma ocorrência como o Rafael (campo), como
// se fosse pelo celular, para o pop-up aparecer no painel da gestora em até 1 min.
// Uso: npm run demo:ocorrencia
import { createClient } from "@supabase/supabase-js";
import { ensureDemoPassword, loadEnv } from "./load-env.mjs";

const env = loadEnv([]);
await ensureDemoPassword();
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: login, error: loginErr } = await c.auth.signInWithPassword({
  email: "rafael.monteiro@rotalitoral.test",
  password: env.DEMO_PASSWORD,
});
if (loginErr) throw loginErr;

const { data: me } = await c.from("profiles").select("manager_id").eq("id", login.user.id).single();
const { data: tasks, error } = await c
  .from("tasks")
  .select("id, document_ref, due_at")
  .in("status", ["pending", "in_progress"])
  .order("due_at")
  .limit(1);
if (error) throw error;
if (!tasks.length) {
  console.log("O Rafael não tem tarefa aberta para registrar ocorrência.");
  process.exit(1);
}
const task = tasks[0];
const { error: oErr } = await c.from("task_occurrences").insert({
  task_id: task.id,
  manager_id: me.manager_id,
  author_id: login.user.id,
  type: "missing_document",
  note: "Agência exigiu a procuração original com firma reconhecida.",
});
if (oErr) throw oErr;
const { error: sErr } = await c.rpc("field_update_task_status", { p_task_id: task.id, p_status: "problem" });
if (sErr) throw sErr;
console.log(`Ocorrência registrada em ${task.document_ref}. O pop-up aparece no painel em até 1 minuto.`);
