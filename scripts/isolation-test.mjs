// Teste de isolamento direto pela API do Supabase (RLS e funções).
// Uso: npm run test:isolation
// Cria (ou reaproveita) gestor A, gestor B e um campo de A; os dados de
// domínio criados são apagados no fim. As contas de teste são mantidas.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PW = env.TEST_PASSWORD;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, noSession);
const anonClient = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, noSession);

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function signUpManager(email, fullName) {
  const c = anonClient();
  let { data, error } = await c.auth.signUp({
    email,
    password: PW,
    options: { data: { full_name: fullName } },
  });
  if (error?.code === "user_already_exists") {
    ({ data, error } = await c.auth.signInWithPassword({ email, password: PW }));
  }
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, id: data.user.id };
}

// Reproduz a Server Action createFieldUser (perfil nasce gestor e é convertido).
async function ensureField(email, fullName, managerId) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PW,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await admin
    .from("profiles")
    .update({ role: "field", manager_id: managerId, full_name: fullName })
    .eq("id", user.id);
  if (error) throw error;
  const c = anonClient();
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: PW });
  if (e2) throw e2;
  return { c, id: user.id };
}

const A = await signUpManager(env.TEST_MANAGER_A, "Gestor A (teste)");
const B = await signUpManager(env.TEST_MANAGER_B, "Gestor B (teste)");
const F = await ensureField(env.TEST_FIELD_A, "Campo A (teste)", A.id);
const created = { tasks: [], agencies: [] };

try {
  console.log("\n# Perfis");
  const { data: profA } = await A.c.from("profiles").select("id, role");
  check("gestor A vê o próprio perfil e o do seu campo", profA.length === 2 && profA.some((p) => p.id === F.id));
  const { data: profB } = await B.c.from("profiles").select("id");
  check("gestor B vê só o próprio perfil", profB.length === 1 && profB[0].id === B.id);
  const { data: esc } = await B.c.from("profiles").update({ role: "field", manager_id: A.id }).eq("id", B.id).select();
  check("gestor B não altera o próprio perfil (sem política de UPDATE)", !esc || esc.length === 0);
  const { data: escF } = await F.c.from("profiles").update({ role: "manager", manager_id: null }).eq("id", F.id).select();
  check("campo não se promove a gestor", !escF || escF.length === 0);

  console.log("\n# Dados do gestor A");
  const { data: agency, error: agErr } = await A.c
    .from("agencies")
    .insert({ manager_id: A.id, name: "Agência Teste A", closes_at: "17:00" })
    .select()
    .single();
  check("gestor A cria agência", !agErr, agErr?.message);
  created.agencies.push(agency.id);
  const { data: task, error: tErr } = await A.c
    .from("tasks")
    .insert({
      manager_id: A.id,
      agency_id: agency.id,
      assigned_to: F.id,
      document_ref: "BL-TESTE-ISOLAMENTO",
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .select()
    .single();
  check("gestor A cria tarefa atribuída ao campo", !tErr, tErr?.message);
  created.tasks.push(task.id);

  console.log("\n# Gestor B não enxerga nem altera nada de A");
  for (const t of ["agencies", "tasks", "tasks_with_risk", "task_occurrences"]) {
    const { data } = await B.c.from(t).select("id").in("manager_id", [A.id]);
    check(`gestor B não lê ${t} de A`, data.length === 0);
  }
  const { data: upd } = await B.c.from("tasks").update({ status: "done" }).eq("id", task.id).select();
  check("gestor B não altera tarefa de A", upd.length === 0);
  const { data: del } = await B.c.from("agencies").delete().eq("id", agency.id).select();
  check("gestor B não apaga agência de A", del.length === 0);
  const { error: insErr } = await B.c.from("agencies").insert({ manager_id: A.id, name: "Intrusa" });
  check("gestor B não cria agência em nome de A", !!insErr);
  const { error: rpcB } = await B.c.rpc("field_update_task_status", { p_task_id: task.id, p_status: "done" });
  check("gestor B não muda status via função do campo", !!rpcB);

  // Brecha conhecida (migration 20261007000100 não aplicada): só informativo.
  const { data: cross, error: crossErr } = await B.c
    .from("tasks")
    .insert({
      manager_id: B.id,
      agency_id: agency.id,
      assigned_to: F.id,
      document_ref: "BL-CRUZADO",
      due_at: new Date().toISOString(),
    })
    .select("id");
  console.log(`INFO  brecha: B cria tarefa com agência/campo de A pela API -> ${crossErr ? "bloqueado" : "PERMITIDO"}`);
  if (cross?.length) await admin.from("tasks").delete().eq("id", cross[0].id);

  console.log("\n# Usuário de campo");
  const { data: fTasks } = await F.c.from("tasks").select("id");
  check("campo lê só a tarefa atribuída", fTasks.length === 1 && fTasks[0].id === task.id);
  const { data: fUpd } = await F.c.from("tasks").update({ due_at: new Date().toISOString() }).eq("id", task.id).select();
  check("campo não altera tarefa diretamente", fUpd.length === 0);
  const { error: fRpc } = await F.c.rpc("field_update_task_status", { p_task_id: task.id, p_status: "in_progress" });
  check("campo muda status pela função", !fRpc, fRpc?.message);
  const { error: fAg } = await F.c.from("agencies").insert({ manager_id: A.id, name: "Do campo" });
  check("campo não cria agência", !!fAg);
  const { error: fOcc } = await F.c.from("task_occurrences").insert({
    task_id: task.id, manager_id: A.id, author_id: F.id, type: "other", note: "teste",
  });
  check("campo registra ocorrência na sua tarefa", !fOcc, fOcc?.message);
  const { error: fOccSpoof } = await F.c.from("task_occurrences").insert({
    task_id: task.id, manager_id: A.id, author_id: A.id, type: "other", note: "x",
  });
  check("campo não registra ocorrência em nome de outra pessoa", !!fOccSpoof);
  const { data: risk } = await F.c.from("tasks_with_risk").select("risk_level").eq("id", task.id).single();
  check("view de risco responde para o campo", !!risk?.risk_level, risk?.risk_level);

  console.log("\n# Outros perfis contra a tarefa de A");
  const { error: bOcc } = await B.c.from("task_occurrences").insert({
    task_id: task.id, manager_id: B.id, author_id: B.id, type: "other", note: "x",
  });
  check("gestor B não registra ocorrência na tarefa de A", !!bOcc);
  const { data: anonTasks } = await anonClient().from("tasks").select("id");
  check("anônimo não lê tarefas", anonTasks.length === 0);
} finally {
  // Ocorrências caem junto com a tarefa (on delete cascade).
  for (const id of created.tasks) await admin.from("tasks").delete().eq("id", id);
  for (const id of created.agencies) await admin.from("agencies").delete().eq("id", id);
}

console.log(failures ? `\n${failures} falha(s)` : "\nTodos os testes passaram");
process.exit(failures ? 1 : 0);
