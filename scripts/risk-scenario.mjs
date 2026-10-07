// Cenário de teste do painel e da tela de campo: uma tarefa por situação de
// risco, com prazos relativos ao horário em que o script roda.
// Uso: npm run scenario:risk            (recria o cenário)
//      npm run scenario:risk -- --clean (só remove)
// Atua como TEST_MANAGER_UI (sob RLS) e atribui as tarefas ao seu 1º campo.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const env = loadEnv();
const clean = process.argv.includes("--clean");
const PREFIX = "TESTE-";

const spTime = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data: session, error: loginError } = await c.auth.signInWithPassword({
  email: env.TEST_MANAGER_UI,
  password: env.TEST_PASSWORD,
});
if (loginError) {
  console.error(`Não foi possível entrar como ${env.TEST_MANAGER_UI}: ${loginError.message}`);
  process.exit(1);
}
const me = session.user.id;

// Remove o cenário anterior (ocorrências caem junto com as tarefas).
await c.from("tasks").delete().like("document_ref", `${PREFIX}%`);
await c.from("agencies").delete().like("name", "% (teste)");
if (clean) {
  console.log("Cenário removido.");
  process.exit(0);
}

const { data: field } = await c.from("profiles").select("id").eq("role", "field").limit(1).maybeSingle();
const now = new Date();
const h = (n) => new Date(now.getTime() + n * 3_600_000).toISOString();
const closesSoon = `${spTime(new Date(now.getTime() + 30 * 60_000))}:00`;

const { data: agencies, error: aErr } = await c
  .from("agencies")
  .insert([
    { manager_id: me, name: "Agência Centro (teste)", opens_at: "00:00", closes_at: "23:59" },
    { manager_id: me, name: "Agência Fecha Logo (teste)", opens_at: "08:00", closes_at: closesSoon },
  ])
  .select("id, name");
if (aErr) throw aErr;
const [centro, fechaLogo] = agencies;

const rows = [
  { ref: "ATRASADA-ONTEM", agency: centro, due: h(-24), status: "pending", expect: "overdue" },
  { ref: "ATRASADA-1H", agency: centro, due: h(-1), status: "in_progress", expect: "overdue" },
  { ref: "RISCO-PRAZO-1H", agency: centro, due: h(1), status: "pending", expect: "at_risk" },
  { ref: "RISCO-AGENCIA-FECHA", agency: fechaLogo, due: h(3), status: "pending", expect: "at_risk" },
  { ref: "NO-PRAZO", agency: centro, due: h(3), status: "in_progress", expect: "ok" },
  { ref: "COM-PROBLEMA", agency: centro, due: h(4), status: "problem", expect: "ok" },
  { ref: "CONCLUIDA", agency: centro, due: h(2), status: "done", expect: "none" },
  { ref: "AMANHA", agency: centro, due: h(30), status: "pending", expect: "fora do painel" },
];

const { error: tErr } = await c.from("tasks").insert(
  rows.map((r) => ({
    manager_id: me,
    agency_id: r.agency.id,
    assigned_to: field?.id ?? null,
    document_ref: PREFIX + r.ref,
    due_at: r.due,
    urgency: r.ref.startsWith("RISCO") ? "high" : "medium",
    status: r.status,
    completed_at: r.status === "done" ? now.toISOString() : null,
  })),
);
if (tErr) throw tErr;

const { data: view } = await c
  .from("tasks_with_risk")
  .select("document_ref, risk_level, due_at")
  .like("document_ref", `${PREFIX}%`);

console.log(`Agora em SP: ${spTime(now)} | "Fecha Logo" fecha ${closesSoon.slice(0, 5)}`);
console.log("Obs.: perto da meia-noite os prazos de +1h a +4h caem no dia seguinte.\n");
let failures = 0;
for (const r of rows) {
  const v = view.find((x) => x.document_ref === PREFIX + r.ref);
  const ok = r.expect === "fora do painel" || v.risk_level === r.expect;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${r.ref.padEnd(20)} view=${v.risk_level.padEnd(8)} esperado=${r.expect}  prazo SP ${spTime(new Date(v.due_at))}`,
  );
}
process.exit(failures ? 1 : 0);
