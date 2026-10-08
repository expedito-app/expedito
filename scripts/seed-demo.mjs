// Cenário simulado da apresentação: uma gestora, dois usuários de campo,
// agências fictícias de Santos e tarefas com prazos relativos ao horário em
// que o script roda (o risco depende do relógio: rode pouco antes da demo).
// Uso: npm run seed:demo
// Recria só os dados da gestora da demo; as contas são criadas uma vez e
// reaproveitadas. Senha em DEMO_PASSWORD (.env.test.local).
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const env = loadEnv(["DEMO_PASSWORD"]);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PW = env.DEMO_PASSWORD;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, noSession);
const anonClient = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, noSession);

const MANAGER = { email: "ana.ribeiro@expedito.test", name: "Ana Ribeiro" };
const BRUNO = { email: "bruno.santos@expedito.test", name: "Bruno Santos" };
const CARLA = { email: "carla.mendes@expedito.test", name: "Carla Mendes" };

const spParts = (d) => {
  const [hh, mm] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .split(":")
    .map(Number);
  return { hh, mm };
};
const pad = (n) => String(n).padStart(2, "0");
const spTime = (d) => {
  const { hh, mm } = spParts(d);
  return `${pad(hh)}:${pad(mm)}`;
};

// Cria a conta (o trigger gera o perfil como gestor) ou reaproveita a existente,
// e acerta o perfil. Para o campo, repete o que faz a Server Action da Equipe.
async function ensureUser({ email, name }, managerId = null) {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PW,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    user = data.user;
  }
  const profile = managerId
    ? { role: "field", manager_id: managerId, full_name: name }
    : { role: "manager", manager_id: null, full_name: name };
  const { error } = await admin.from("profiles").update(profile).eq("id", user.id);
  if (error) throw error;
  // Papel no token (o proxy lê daqui e dispensa a consulta ao perfil).
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { expedito_role: profile.role },
  });
  if (metaErr) throw metaErr;

  const c = anonClient();
  const { error: loginErr } = await c.auth.signInWithPassword({ email, password: PW });
  if (loginErr) {
    throw new Error(`Não foi possível entrar como ${email}: ${loginErr.message} (confira DEMO_PASSWORD)`);
  }
  return { c, id: user.id };
}

const now = new Date();
const { hh: nowHour, mm: nowMin } = spParts(now);
if (nowHour < 7 || nowHour >= 21) {
  console.warn(
    `Atenção: agora são ${spTime(now)} em SP. Fora de 07h–21h parte dos prazos cai em outro dia\n` +
      "e o cenário não fica como o esperado. Rode o seed pouco antes da apresentação.\n",
  );
}

const ana = await ensureUser(MANAGER);
const bruno = await ensureUser(BRUNO, ana.id);
const carla = await ensureUser(CARLA, ana.id);
const m = ana.c;

// Remove o cenário anterior da gestora (ocorrências caem junto com as tarefas).
for (const table of ["tasks", "agencies"]) {
  const { error } = await m.from(table).delete().eq("manager_id", ana.id);
  if (error) throw error;
}

const h = (n) => new Date(now.getTime() + n * 3_600_000).toISOString();
// Prazos "de hoje" nunca passam de 23:50 em SP, para a demo noturna
// (19:30–21:30) continuar com as tarefas no painel do dia.
const endOfDayMs = now.getTime() + (24 * 60 - (nowHour * 60 + nowMin) - 10) * 60_000;
const today = (n) => new Date(Math.min(now.getTime() + n * 3_600_000, endOfDayMs)).toISOString();
// Agências "normais" fecham às 17h, ou mais tarde se a demo for no fim da tarde,
// para não caírem na regra "fecha em 1 hora" sem querer.
const normalClose = `${pad(Math.min(Math.max(17, nowHour + 4), 23))}:00`;
const soonClose = `${spTime(new Date(now.getTime() + 40 * 60_000))}:00`;

const { data: agencies, error: aErr } = await m
  .from("agencies")
  .insert([
    {
      name: "Atlântico Marítima",
      address: "Rua XV de Novembro, 95 – Centro, Santos/SP",
      opens_at: "08:00",
      closes_at: normalClose,
      requirements: "Procuração original e documento com foto.",
      notes: "Atendimento no 2º andar. Senha na recepção.",
    },
    {
      name: "Porto Sul Agenciamentos",
      address: "Av. Senador Feijó, 200 – Vila Mathias, Santos/SP",
      opens_at: "09:00",
      closes_at: normalClose,
      requirements: "BL só é liberado com carta de liberação assinada pelo cliente.",
      notes: null,
    },
    {
      name: "Maré Alta Shipping",
      address: "Rua Frei Gaspar, 22 – Centro, Santos/SP",
      opens_at: "08:00",
      closes_at: soonClose,
      requirements: "Comprovante de pagamento das taxas locais.",
      notes: "Fecha cedo; fila costuma ser grande no fim do expediente.",
    },
    {
      name: "Costa Verde Navegação",
      address: "Av. Ana Costa, 433 – Gonzaga, Santos/SP",
      opens_at: "08:30",
      closes_at: normalClose,
      requirements: "Agendamento prévio por e-mail.",
      notes: null,
    },
    {
      name: "Baía Logística Marítima",
      address: "Rua do Comércio, 60 – Centro, Santos/SP",
      opens_at: "08:00",
      closes_at: normalClose,
      requirements: null,
      notes: "Aceita retirada por terceiros com autorização simples.",
    },
  ].map((a) => ({ ...a, manager_id: ana.id })))
  .select("id, name");
if (aErr) throw aErr;
const ag = Object.fromEntries(agencies.map((a) => [a.name.split(" ")[0], a.id]));

// expect: risco esperado na view logo após o seed ("fora" = prazo amanhã).
const rows = [
  { ref: "BL ATMU2610451", desc: "Retirada do BL original", agency: "Atlântico", who: bruno, due: -20, status: "pending", urgency: "high", expect: "overdue" },
  { ref: "BL PSAG7781203", desc: "Entrega da carta de liberação assinada", agency: "Porto", who: carla, due: -1.5, status: "in_progress", urgency: "high", expect: "overdue" },
  { ref: "BL CVNU5530912", desc: "Retirada do BL para desembaraço", agency: "Costa", who: bruno, due: 1, status: "pending", urgency: "high", expect: "at_risk" },
  { ref: "BL BLMU3349870", desc: "Entrega de carta de indenidade", agency: "Baía", who: carla, due: 1.75, status: "in_progress", urgency: "medium", expect: "at_risk" },
  { ref: "BL MASH9012476", desc: "Retirada do BL original", agency: "Maré", who: bruno, due: 3, status: "pending", urgency: "medium", expect: "at_risk" },
  { ref: "BL ATMU2610588", desc: "Entrega de procuração", agency: "Atlântico", who: carla, due: 3.5, status: "pending", urgency: "medium", expect: "ok" },
  { ref: "BL PSAG7781377", desc: "Retirada de BL", agency: "Porto", who: bruno, due: 4, status: "pending", urgency: "medium", expect: "ok", occurrence: { type: "missing_document", note: "Agência pediu a carta de liberação assinada pelo cliente; a cópia não foi aceita." } },
  { ref: "BL CVNU5531044", desc: "Entrega de comprovante de pagamento", agency: "Costa", who: carla, due: 4.5, status: "pending", urgency: "low", expect: "ok", occurrence: { type: "agency_closed", note: "Portão fechado com aviso de expediente interno até 14h." } },
  { ref: "BL BLMU3350011", desc: "Retirada do BL original", agency: "Baía", who: null, due: 5, status: "pending", urgency: "low", expect: "ok" },
  { ref: "BL ATMU2609975", desc: "Retirada do BL original", agency: "Atlântico", who: bruno, due: 1, status: "done", done: -2, urgency: "high", expect: "none" },
  { ref: "BL PSAG7780946", desc: "Entrega de carta de liberação", agency: "Porto", who: carla, due: 2, status: "done", done: -1, urgency: "medium", expect: "none" },
  { ref: "BL MASH9012630", desc: "Retirada do BL original", agency: "Maré", who: bruno, due: 26, status: "pending", urgency: "medium", expect: "fora" },
  { ref: "BL CVNU5531190", desc: "Entrega de procuração", agency: "Costa", who: carla, due: 28, status: "pending", urgency: "low", expect: "fora" },
];

const { data: tasks, error: tErr } = await m
  .from("tasks")
  .insert(
    rows.map((r) => ({
      manager_id: ana.id,
      agency_id: ag[r.agency],
      assigned_to: r.who?.id ?? null,
      document_ref: r.ref,
      description: r.desc,
      urgency: r.urgency,
      due_at: r.due > 0 && r.due < 24 ? today(r.due) : h(r.due),
      status: r.status,
      completed_at: r.status === "done" ? h(r.done) : null,
    })),
  )
  .select("id, document_ref");
if (tErr) throw tErr;
const taskId = Object.fromEntries(tasks.map((t) => [t.document_ref, t.id]));

// Ocorrências registradas pelo próprio campo, como na tela /hoje:
// insere a ocorrência e a tarefa passa para "Com problema".
for (const r of rows.filter((x) => x.occurrence)) {
  const { error: oErr } = await r.who.c.from("task_occurrences").insert({
    task_id: taskId[r.ref],
    manager_id: ana.id,
    author_id: r.who.id,
    type: r.occurrence.type,
    note: r.occurrence.note,
  });
  if (oErr) throw oErr;
  const { error: sErr } = await r.who.c.rpc("field_update_task_status", {
    p_task_id: taskId[r.ref],
    p_status: "problem",
  });
  if (sErr) throw sErr;
}

// Histórico simulado de 12 meses (só tarefas concluídas, para não poluir o painel
// do dia): alimenta a página Indicadores e a análise da IA. Gerador com semente
// fixa, então o histórico é igual a cada execução. Padrões de propósito:
// pico em mar e out–nov, Maré Alta concentrando "agência fechada", Porto Sul com
// "faltou documento", prazos concentrados no fim da tarde e pontualidade que
// cai quando a demanda passa do que a equipe dá conta.
let seed = 20261009;
const rand = () => {
  seed = (seed * 16807) % 2147483647; // Park–Miller (cabe no double sem perder precisão)
  return (seed - 1) / 2147483646;
};
const pick = (items) => items[Math.floor(rand() * items.length)];
const SEASON = [0.9, 0.95, 1.35, 1.0, 0.95, 0.9, 1.0, 1.05, 1.1, 1.45, 1.5, 0.75]; // jan..dez
const HOURS = [9, 10, 10, 11, 11, 12, 14, 15, 15, 16, 16, 16, 17];
const AGENCY_KEYS = ["Atlântico", "Atlântico", "Porto", "Porto", "Maré", "Costa", "Baía"];
const PREFIX = { Atlântico: "ATMU", Porto: "PSAG", Maré: "MASH", Costa: "CVNU", Baía: "BLMU" };
const DESCS = ["Retirada do BL original", "Entrega de carta de liberação", "Entrega de procuração", "Retirada de BL para desembaraço", "Entrega de comprovante de pagamento"];
const spDate = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const spToUtc = (date, hour, minute) => new Date(`${date}T${pad(hour)}:${pad(minute)}:00-03:00`);

const history = [];
const historyOccurrences = [];
for (let back = 365; back >= 1; back--) {
  const day = spDate(new Date(now.getTime() - back * 86_400_000));
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (weekday === 0) continue;
  const month = Number(day.slice(5, 7)) - 1;
  const base = weekday === 6 ? 1 : weekday === 1 ? 5 : 4;
  const count = Math.max(0, Math.round(base * SEASON[month] + (rand() - 0.5) * 3));
  const overload = count > 6; // mais de 3 por pessoa no dia
  for (let i = 0; i < count; i++) {
    const agency = pick(AGENCY_KEYS);
    const who = rand() < 0.55 ? bruno : carla;
    const due = spToUtc(day, pick(HOURS), pick([0, 0, 30]));
    let lateChance = 0.07 + (overload ? 0.18 : 0) + (agency === "Maré" ? 0.12 : 0);
    if (who === bruno && overload) lateChance += 0.08;
    const late = rand() < lateChance;
    const completed = late
      ? new Date(due.getTime() + (0.5 + rand() * (rand() < 0.2 ? 30 : 6)) * 3_600_000)
      : new Date(due.getTime() - (0.3 + rand() * 4) * 3_600_000);
    const created = new Date(due.getTime() - (3 + rand() * 60) * 3_600_000);
    const ref = `BL ${PREFIX[agency]}${String(1000000 + Math.floor(rand() * 8999999))}`;
    history.push({
      manager_id: ana.id,
      agency_id: ag[agency],
      assigned_to: who.id,
      document_ref: ref,
      description: pick(DESCS),
      urgency: rand() < 0.25 ? "high" : rand() < 0.7 ? "medium" : "low",
      due_at: due.toISOString(),
      status: "done",
      created_at: created.toISOString(),
      updated_at: completed.toISOString(),
      completed_at: completed.toISOString(),
    });
    const occurrenceChance = agency === "Maré" ? 0.14 : agency === "Porto" ? 0.1 : 0.03;
    if (rand() < occurrenceChance) {
      historyOccurrences.push({
        index: history.length - 1,
        who,
        type: agency === "Maré" ? "agency_closed" : agency === "Porto" ? "missing_document" : pick(["agency_closed", "missing_document", "other"]),
        note: agency === "Maré" ? "Agência fechou antes do horário." : agency === "Porto" ? "Faltou a carta de liberação assinada." : "Fila grande; atendimento suspenso.",
        at: new Date(due.getTime() - rand() * 2 * 3_600_000).toISOString(),
      });
    }
  }
}
const historyIds = [];
for (let i = 0; i < history.length; i += 500) {
  const { data, error } = await m.from("tasks").insert(history.slice(i, i + 500)).select("id");
  if (error) throw error;
  historyIds.push(...data.map((t) => t.id));
}
for (const who of [bruno, carla]) {
  const mine = historyOccurrences.filter((o) => o.who === who);
  if (!mine.length) continue;
  const { error } = await who.c.from("task_occurrences").insert(
    mine.map((o) => ({
      task_id: historyIds[o.index],
      manager_id: ana.id,
      author_id: who.id,
      type: o.type,
      note: o.note,
      created_at: o.at,
    })),
  );
  if (error) throw error;
}
console.log(`Histórico: ${history.length} tarefas concluídas e ${historyOccurrences.length} ocorrências nos últimos 12 meses`);

const { data: view, error: vErr } = await m
  .from("tasks_with_risk")
  .select("document_ref, risk_level, status, due_at")
  .in("document_ref", rows.map((r) => r.ref));
if (vErr) throw vErr;

console.log(`Agora em SP: ${spTime(now)} | Maré Alta fecha ${soonClose.slice(0, 5)} | demais fecham ${normalClose}`);
console.log(`Contas: ${MANAGER.email} (gestora), ${BRUNO.email} e ${CARLA.email} (campo)\n`);
let failures = 0;
for (const r of rows) {
  const v = view.find((x) => x.document_ref === r.ref);
  const ok = r.expect === "fora" || v.risk_level === r.expect;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${r.ref.padEnd(15)} ${v.status.padEnd(11)} view=${v.risk_level.padEnd(8)} esperado=${r.expect.padEnd(8)} prazo SP ${spTime(new Date(v.due_at))}`,
  );
}
console.log(failures ? `\n${failures} divergência(s)` : "\nCenário pronto");
process.exit(failures ? 1 : 0);
