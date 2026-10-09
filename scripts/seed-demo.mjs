// Cenário simulado de demonstração (pessoas e prazos fictícios; agências com
// nomes de armadores reais e endereços/horários SIMULADOS de Santos).
//
// Uso:
//   npm run seed:demo                 prazos relativos ao horário em que roda
//   npm run seed:apresentacao         prazos montados para a demo das 19:40
//   node scripts/seed-demo.mjs --para 19:40   idem, com qualquer horário (hoje)
//
// Com --para, pode rodar de manhã: os prazos ficam ancorados no horário da
// apresentação, então às 19:40 há tarefas atrasadas, vencendo em minutos e
// entrando em risco ao vivo (os pop-ups aparecem sozinhos durante a demo).
//
// Duas empresas (isolamento entre gestores), com contas criadas uma vez e
// reaproveitadas; os dados de domínio são apagados e recriados a cada execução.
// Senha de todas as contas: DEMO_PASSWORD (.env.test.local).
import { createClient } from "@supabase/supabase-js";
import { deflateSync } from "node:zlib";
import { loadEnv } from "./load-env.mjs";

const env = loadEnv(["DEMO_PASSWORD"]);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PW = env.DEMO_PASSWORD;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, noSession);
const anonClient = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, noSession);

// ---------------------------------------------------------------- horário ----
const pad = (n) => String(n).padStart(2, "0");
const spDate = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const spClock = (d) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
// São Paulo sem horário de verão (UTC-3 fixo desde 2019).
const spAt = (date, hh, mm = 0) => new Date(`${date}T${pad(hh)}:${pad(mm)}:00-03:00`);
const addDaysStr = (date, n) => spDate(new Date(spAt(date, 12).getTime() + n * 86_400_000));

const now = new Date();
const today = spDate(now);
const paraIndex = process.argv.indexOf("--para");
const paraArg = paraIndex >= 0 ? process.argv[paraIndex + 1] : undefined;
let anchor = now;
if (paraArg) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(paraArg);
  if (!m) {
    console.error("Use --para HH:MM (ex.: --para 19:40)");
    process.exit(2);
  }
  anchor = spAt(today, Number(m[1]), Number(m[2]));
  if (anchor.getTime() < now.getTime() - 5 * 60_000) {
    console.warn(`Atenção: ${paraArg} já passou hoje; os prazos ficam no passado.\n`);
  }
}
const endOfDay = spAt(today, 23, 50).getTime();
/** Prazo de hoje relativo à âncora (minutos), nunca depois de 23:50. */
const rel = (min) => new Date(Math.min(anchor.getTime() + min * 60_000, endOfDay)).toISOString();
const clockPlus = (min) => spClock(new Date(anchor.getTime() + min * 60_000));
/** Fechamento das agências: âncora + 3h40, entre 17:00 e 23:30 (a demo é à noite). */
const lateClose = (() => {
  const [hh, mm] = clockPlus(3 * 60 + 40).split(":").map(Number);
  const plus = hh * 60 + mm;
  const total = plus < 4 * 60 ? 23 * 60 + 30 : Math.min(Math.max(plus, 17 * 60), 23 * 60 + 30);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
})();
/** Uma agência fecha 50 min depois da âncora (regra "fecha em 1 h"). */
const closeSoon = clockPlus(50);

// ----------------------------------------------------------------- sorteio ---
let seed = 20261009;
const rand = () => {
  seed = (seed * 16807) % 2147483647; // Park–Miller
  return (seed - 1) / 2147483646;
};
const pick = (items) => items[Math.floor(rand() * items.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");

// ------------------------------------------------------- assinatura (PNG) ----
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
/** Rabisco de assinatura em PNG (data URL), parecido com o desenhado na tela. */
function signaturePng() {
  const W = 320;
  const H = 110;
  const px = Buffer.alloc(W * H * 4);
  const dot = (x, y) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const xi = Math.round(x + dx);
        const yi = Math.round(y + dy);
        if (xi < 0 || yi < 0 || xi >= W || yi >= H) continue;
        const o = (yi * W + xi) * 4;
        px[o] = 24;
        px[o + 1] = 24;
        px[o + 2] = 27;
        px[o + 3] = 255;
      }
  };
  const a = 14 + rand() * 12;
  const f1 = 0.04 + rand() * 0.05;
  const f2 = 0.11 + rand() * 0.08;
  for (let x = 20; x < W - 20; x += 0.5) {
    dot(x, H / 2 + Math.sin(x * f1) * a + Math.sin(x * f2 + 1) * (a / 2.5));
  }
  for (let x = 40; x < 140; x += 0.5) dot(x, H - 16 + Math.sin(x * 0.05) * 3); // sublinhado
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ------------------------------------------------------------------ contas ---
const { data: allUsers, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;

async function ensureUser({ email, name, transport }, manager = null, company = null) {
  let user = allUsers.users.find((u) => u.email === email);
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
  const profile = manager
    ? { role: "field", manager_id: manager.id, full_name: name, transport_mode: transport }
    : {
        role: "manager",
        manager_id: null,
        full_name: name,
        company_name: company.name,
        base_address: company.address,
        base_latitude: company.lat,
        base_longitude: company.lng,
        // Premissas de demurrage padrão (o gestor ajusta em Empresa).
        demurrage_daily_brl: 500,
        containers_per_bl: 2,
        demurrage_days_per_delay: 1,
        baseline_late_rate: 0.25,
      };
  const { error } = await admin.from("profiles").update(profile).eq("id", user.id);
  if (error) throw new Error(`${email}: ${error.message}`);
  // Papel no token; contas da demo já têm senha e empresa definidas.
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    password: PW,
    app_metadata: { expedito_role: profile.role, must_change_password: false, needs_company: false },
  });
  if (metaErr) throw metaErr;
  const c = anonClient();
  const { error: loginErr } = await c.auth.signInWithPassword({ email, password: PW });
  if (loginErr) throw new Error(`Não foi possível entrar como ${email}: ${loginErr.message}`);
  return { c, id: user.id, name };
}

// ----------------------------------------------------------------- empresas --
const COMPANY_1 = {
  name: "Rota Litoral Despachos Aduaneiros",
  address: "Rua General Câmara, 141 – Centro, Santos/SP",
  lat: -23.9334,
  lng: -46.3287,
};
const COMPANY_2 = {
  name: "Atlântica Comissária de Despachos",
  address: "Av. Conselheiro Nébias, 754 – Boqueirão, Santos/SP",
  lat: -23.959,
  lng: -46.327,
};

const mariana = await ensureUser({ email: "mariana.albuquerque@rotalitoral.test", name: "Mariana Albuquerque" }, null, COMPANY_1);
const rafael = await ensureUser({ email: "rafael.monteiro@rotalitoral.test", name: "Rafael Monteiro", transport: "motorcycle" }, mariana);
const juliana = await ensureUser({ email: "juliana.pacheco@rotalitoral.test", name: "Juliana Pacheco", transport: "transit" }, mariana);
const thiago = await ensureUser({ email: "thiago.nascimento@rotalitoral.test", name: "Thiago Nascimento", transport: "car" }, mariana);
const camila = await ensureUser({ email: "camila.duarte@rotalitoral.test", name: "Camila Duarte", transport: "motorcycle" }, mariana);

const eduardo = await ensureUser({ email: "eduardo.vasconcelos@atlanticacomissaria.test", name: "Eduardo Vasconcelos" }, null, COMPANY_2);
const lucas = await ensureUser({ email: "lucas.ferreira@atlanticacomissaria.test", name: "Lucas Ferreira", transport: "motorcycle" }, eduardo);
const patricia = await ensureUser({ email: "patricia.gomes@atlanticacomissaria.test", name: "Patrícia Gomes", transport: "transit" }, eduardo);

// Limpa os dados das duas empresas (ocorrências e assinaturas vão junto).
for (const m of [mariana, eduardo]) {
  for (const table of ["tasks", "agencies"]) {
    const { error } = await m.c.from(table).delete().eq("manager_id", m.id);
    if (error) throw error;
  }
}

// ----------------------------------------------------------------- agências --
// Armadores reais; endereços, horários e exigências SIMULADOS para a demo.
const AGENCIES = [
  { key: "maersk", prefix: "MAEU", len: 9, name: "Maersk – Santos", address: "Rua Augusto Severo, 7 – Centro, Santos/SP", lat: -23.9327, lng: -46.3271, opens: "08:30", requirements: "Carta de liberação assinada e procuração do importador." },
  { key: "msc", prefix: "MEDU", len: 7, name: "MSC – Santos", address: "Av. Senador Feijó, 686 – Vila Mathias, Santos/SP", lat: -23.9468, lng: -46.3214, opens: "09:00", requirements: "Comprovante de pagamento das taxas locais (THC) e procuração." },
  { key: "cma", prefix: "CMDU", len: 7, name: "CMA CGM – Santos", address: "Rua XV de Novembro, 65 – Centro, Santos/SP", lat: -23.9336, lng: -46.3282, opens: "08:30", requirements: "BL original endossado." },
  { key: "hapag", prefix: "HLCU", len: 10, name: "Hapag-Lloyd – Santos", address: "Praça Visconde de Mauá, 30 – Centro, Santos/SP", lat: -23.9317, lng: -46.3297, opens: "09:00", requirements: "Agendamento prévio no portal do armador." },
  { key: "cosco", prefix: "COSU", len: 10, name: "COSCO Shipping – Santos", address: "Av. Ana Costa, 259 – Gonzaga, Santos/SP", lat: -23.956, lng: -46.3305, opens: "08:30", requirements: null },
  { key: "one", prefix: "ONEY", len: 9, name: "ONE (Ocean Network Express) – Santos", address: "Rua Brás Cubas, 37 – Centro, Santos/SP", lat: -23.9347, lng: -46.3305, opens: "08:30", requirements: "Documento com foto de quem retira." },
  { key: "evergreen", prefix: "EGLV", len: 12, name: "Evergreen – Santos", address: "Av. Conselheiro Nébias, 340 – Paquetá, Santos/SP", lat: -23.9405, lng: -46.324, opens: "08:00", requirements: null },
  { key: "zim", prefix: "ZIMU", len: 9, name: "ZIM – Santos", address: "Av. Almirante Saldanha da Gama, 45 – Ponta da Praia, Santos/SP", lat: -23.9858, lng: -46.301, opens: "09:00", requirements: "Carta de liberação original (não aceita cópia)." },
  { key: "hmm", prefix: "HDMU", len: 9, name: "HMM – Santos", address: "Av. Pedro Lessa, 1640 – Aparecida, Santos/SP", lat: -23.964, lng: -46.312, opens: "08:30", requirements: null },
];

async function insertAgencies(manager, keys, closeOverrides = {}) {
  const chosen = AGENCIES.filter((a) => keys.includes(a.key));
  const { data, error } = await manager.c
    .from("agencies")
    .insert(
      chosen.map((a) => ({
        manager_id: manager.id,
        name: a.name,
        address: a.address,
        latitude: a.lat,
        longitude: a.lng,
        opens_at: a.opens,
        closes_at: closeOverrides[a.key] ?? lateClose,
        requirements: a.requirements,
        notes: a.key === "zim" ? "Longe do Centro (~7 km): evite encaixar entre visitas do Centro." : null,
      })),
    )
    .select("id, name");
  if (error) throw error;
  return Object.fromEntries(chosen.map((a) => [a.key, data.find((d) => d.name === a.name).id]));
}

const ag1 = await insertAgencies(mariana, AGENCIES.map((a) => a.key), { zim: closeSoon });
const ag2 = await insertAgencies(eduardo, ["maersk", "msc", "cma", "evergreen", "cosco"]);
const blOf = (key) => {
  const a = AGENCIES.find((x) => x.key === key);
  return `${a.prefix}${digits(a.len)}`;
};

// ------------------------------------------------------ hoje (empresa 1) -----
// min = minutos em relação à âncora; "live" = o que acontece durante a demo.
const T = (agency, who, min, urgency, desc, extra = {}) => ({ agency, who, min, urgency, desc, ...extra });
const todayRows = [
  T("maersk", rafael, -190, "high", "Retirada do BL original", { live: "atrasada desde a tarde" }),
  T("msc", juliana, -80, "high", "Entrega da carta de liberação assinada", { status: "in_progress", live: "atrasada" }),
  T("cma", null, -25, "high", "Retirada do BL original endossado", { live: "atrasada e sem responsável" }),
  T("hapag", thiago, 10, "high", "Retirada do BL para desembaraço", { status: "in_progress", live: "vence em 10 min e atrasa ao vivo" }),
  T("one", camila, 25, "medium", "Entrega de procuração", { live: "vence em 25 min e atrasa ao vivo" }),
  T("cma", rafael, 50, "medium", "Entrega de carta de indenidade", { live: "em risco" }),
  T("msc", camila, 70, "medium", "Retirada de BL", { occurrence: ["missing_document", "Agência pediu a carta de liberação original; levamos cópia."], live: "com problema (ocorrência)" }),
  T("evergreen", juliana, 95, "medium", "Entrega de comprovante de pagamento", { live: "em risco" }),
  T("hapag", thiago, 120, "low", "Retirada de cópia não negociável", { occurrence: ["agency_closed", "Atendimento suspenso para inventário até 14h."], live: "com problema (ocorrência)" }),
  T("cosco", camila, 135, "medium", "Retirada do BL original", { live: "entra em risco 2 h antes do prazo" }),
  T("maersk", rafael, 150, "high", "Entrega da carta de liberação", { live: "entra em risco 2 h antes do prazo" }),
  T("zim", thiago, 180, "medium", "Retirada do BL original", { live: "em risco: a agência fecha em menos de 1 h" }),
  T("hmm", juliana, 200, "low", "Entrega de procuração", { live: "no prazo" }),
  T("msc", null, 230, "medium", "Retirada de BL", { live: "no prazo, sem responsável" }),
];
// Concluídas hoje, com assinatura (prazo de manhã/tarde).
const doneRows = [
  T("maersk", rafael, null, "high", "Retirada do BL original", { dueAt: spAt(today, 10, 30), signer: "Fernanda Lopes" }),
  T("cma", juliana, null, "medium", "Entrega de procuração", { dueAt: spAt(today, 11, 0), signer: "Ricardo Almeida" }),
  T("one", camila, null, "medium", "Retirada de BL", { dueAt: spAt(today, 14, 0), signer: "Beatriz Souza" }),
  T("evergreen", thiago, null, "low", "Entrega de comprovante", { dueAt: spAt(today, 15, 30), signer: "Marcos Oliveira" }),
];

const allToday = [...todayRows, ...doneRows];
const { data: insertedToday, error: todayErr } = await mariana.c
  .from("tasks")
  .insert(
    allToday.map((r) => ({
      manager_id: mariana.id,
      agency_id: ag1[r.agency],
      assigned_to: r.who?.id ?? null,
      document_ref: blOf(r.agency),
      description: r.desc,
      urgency: r.urgency,
      due_at: r.dueAt ? r.dueAt.toISOString() : rel(r.min),
      status: r.status ?? "pending",
    })),
  )
  .select("id, document_ref, due_at");
if (todayErr) throw todayErr;
allToday.forEach((r, i) => {
  r.id = insertedToday[i].id;
  r.ref = insertedToday[i].document_ref;
  r.due = insertedToday[i].due_at;
});

// Ocorrências registradas pelo campo (a tarefa passa a "Com problema").
for (const r of todayRows.filter((x) => x.occurrence)) {
  const { error } = await r.who.c.from("task_occurrences").insert({
    task_id: r.id,
    manager_id: mariana.id,
    author_id: r.who.id,
    type: r.occurrence[0],
    note: r.occurrence[1],
  });
  if (error) throw error;
  const { error: sErr } = await r.who.c.rpc("field_update_task_status", { p_task_id: r.id, p_status: "problem" });
  if (sErr) throw sErr;
}
// Conclusões com assinatura, pela mesma função da tela /hoje.
for (const r of doneRows) {
  const { error } = await r.who.c.rpc("field_complete_task_with_signature", {
    p_task_id: r.id,
    p_signer_name: r.signer,
    p_image: signaturePng(),
  });
  if (error) throw error;
}

// ---------------------------------------------------- amanhã (empresa 1) -----
// Dia cheio para testar Rotas > Amanhã, a sugestão de responsável e o assistente.
const tomorrow = addDaysStr(today, 1);
const tomorrowRows = [
  ["maersk", rafael, 9, 30, "high"], ["cma", rafael, 10, 0, "medium"], ["hapag", rafael, 10, 30, "medium"],
  ["zim", rafael, 11, 30, "high"], ["msc", juliana, 9, 30, "medium"], ["evergreen", juliana, 11, 0, "high"],
  ["one", juliana, 14, 0, "low"], ["hmm", thiago, 10, 0, "medium"], ["zim", thiago, 14, 0, "medium"],
  ["cosco", camila, 9, 0, "medium"], ["msc", camila, 15, 0, "low"],
  ["one", null, 15, 30, "medium"], ["hapag", null, 16, 0, "high"], ["cosco", null, 11, 0, "low"],
];
const { error: tmErr } = await mariana.c.from("tasks").insert(
  tomorrowRows.map(([agency, who, hh, mm, urgency]) => ({
    manager_id: mariana.id,
    agency_id: ag1[agency],
    assigned_to: who?.id ?? null,
    document_ref: blOf(agency),
    description: pick(["Retirada do BL original", "Entrega de carta de liberação", "Entrega de procuração", "Retirada de BL para desembaraço"]),
    urgency,
    due_at: spAt(tomorrow, hh, mm).toISOString(),
    status: "pending",
  })),
);
if (tmErr) throw tmErr;

// --------------------------------------------------------------- histórico ---
// Só tarefas concluídas (não poluem o painel do dia). Padrões de propósito:
// picos em março e out–nov; MSC concentra "faltou documento"; ZIM, longe,
// concentra "agência fechada"; Camila entrou há 90 dias; sobrecarga derruba a
// pontualidade.
const SEASON = [0.9, 0.95, 1.35, 1.0, 0.95, 0.9, 1.0, 1.05, 1.1, 1.45, 1.5, 0.75];
const HOURS = [9, 10, 10, 11, 11, 12, 14, 15, 15, 16, 16, 16, 17];
const DESCS = ["Retirada do BL original", "Entrega de carta de liberação", "Entrega de procuração", "Retirada de BL para desembaraço", "Entrega de comprovante de pagamento"];

async function history(manager, ag, days, membersFor, perDay, adoptedDaysAgo = days) {
  const keys = Object.keys(ag);
  const weights = keys.flatMap((k) => (k === "maersk" || k === "msc" ? [k, k, k] : k === "cma" || k === "hapag" ? [k, k] : [k]));
  const rows = [];
  const occ = [];
  for (let back = days; back >= 1; back--) {
    const day = addDaysStr(today, -back);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday === 0) continue;
    const month = Number(day.slice(5, 7)) - 1;
    const team = membersFor(back);
    const base = (weekday === 6 ? 0.3 : weekday === 1 ? 1.25 : 1) * perDay;
    const count = Math.max(0, Math.round(base * SEASON[month] + (rand() - 0.5) * 3));
    const overload = count > team.length * 3;
    for (let i = 0; i < count; i++) {
      const agency = pick(weights);
      const who = pick(team);
      const due = spAt(day, pick(HOURS), pick([0, 0, 30]));
      // Antes do Expedito (planilha/WhatsApp) atrasava ~1 em 4; depois, ~1 em 15.
      const before = back > adoptedDaysAgo;
      const lateChance = before
        ? 0.2 + (overload ? 0.1 : 0) + (agency === "zim" ? 0.1 : 0)
        : 0.035 + (overload ? 0.1 : 0) + (agency === "zim" ? 0.1 : 0) + (agency === "msc" ? 0.03 : 0);
      const late = rand() < lateChance;
      const completed = late
        ? new Date(due.getTime() + (0.5 + rand() * (rand() < 0.2 ? 30 : 6)) * 3_600_000)
        : new Date(due.getTime() - (0.3 + rand() * 4) * 3_600_000);
      rows.push({
        manager_id: manager.id,
        agency_id: ag[agency],
        assigned_to: who.id,
        document_ref: blOf(agency),
        description: pick(DESCS),
        urgency: rand() < 0.25 ? "high" : rand() < 0.7 ? "medium" : "low",
        due_at: due.toISOString(),
        status: "done",
        created_at: new Date(due.getTime() - (3 + rand() * 60) * 3_600_000).toISOString(),
        updated_at: completed.toISOString(),
        completed_at: completed.toISOString(),
      });
      const occChance = agency === "zim" ? 0.16 : agency === "msc" ? 0.12 : 0.025;
      if (rand() < occChance) {
        occ.push({
          index: rows.length - 1,
          who,
          type: agency === "zim" ? "agency_closed" : agency === "msc" ? "missing_document" : pick(["agency_closed", "missing_document", "other"]),
          note:
            agency === "zim"
              ? "Chegamos e a agência já tinha encerrado o atendimento."
              : agency === "msc"
                ? "Faltou o comprovante de pagamento das taxas locais."
                : "Sistema do armador fora do ar; atendimento suspenso.",
          at: new Date(due.getTime() - rand() * 2 * 3_600_000).toISOString(),
        });
      }
    }
  }
  const ids = [];
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await manager.c.from("tasks").insert(rows.slice(i, i + 500)).select("id");
    if (error) throw error;
    ids.push(...data.map((t) => t.id));
  }
  const byWho = new Map();
  for (const o of occ) byWho.set(o.who, [...(byWho.get(o.who) ?? []), o]);
  for (const [who, list] of byWho) {
    const { error } = await who.c.from("task_occurrences").insert(
      list.map((o) => ({
        task_id: ids[o.index],
        manager_id: manager.id,
        author_id: who.id,
        type: o.type,
        note: o.note,
        created_at: o.at,
      })),
    );
    if (error) throw error;
  }
  return { tasks: rows.length, occurrences: occ.length };
}

// Rota Litoral adotou o Expedito há 9 meses (270 dias): os 3 primeiros meses do
// histórico são o "antes" e mostram a virada em Indicadores > Demurrage evitado.
const h1 = await history(mariana, ag1, 365, (back) => (back <= 90 ? [rafael, juliana, thiago, camila] : [rafael, juliana, thiago]), 7, 270);
const h2 = await history(eduardo, ag2, 90, () => [lucas, patricia], 3);

// Empresa 2: poucas tarefas hoje (isolamento: a Mariana não vê nada disto).
const { error: e2Err } = await eduardo.c.from("tasks").insert(
  [
    ["maersk", lucas, -40, "high"], ["msc", patricia, 30, "medium"], ["cosco", lucas, 120, "medium"],
    ["evergreen", patricia, 180, "low"], ["cma", null, 210, "medium"],
  ].map(([agency, who, min, urgency]) => ({
    manager_id: eduardo.id,
    agency_id: ag2[agency],
    assigned_to: who?.id ?? null,
    document_ref: blOf(agency),
    description: "Retirada do BL original",
    urgency,
    due_at: rel(min),
    status: "pending",
  })),
);
if (e2Err) throw e2Err;

// ----------------------------------------------------------------- resumo ---
const at = spClock(anchor);
console.log(`\nCenário pronto. Âncora: ${at} de ${today}${paraArg ? " (apresentação)" : ""}.`);
console.log(`Agências fecham ${lateClose}; ZIM fecha ${closeSoon} (regra "fecha em 1 h").`);
console.log(`Premissas de demurrage: R$ 500/dia por contêiner, 2 contêineres por BL, 1 dia por atraso, 25% de atraso antes do Expedito (editáveis em Empresa).`);
console.log(`Histórico: Rota Litoral ${h1.tasks} tarefas / ${h1.occurrences} ocorrências (12 meses); Atlântica ${h2.tasks} / ${h2.occurrences} (90 dias).`);
console.log(`Amanhã (${tomorrow}): ${tomorrowRows.length} tarefas, 3 sem responsável.\n`);
console.log(`Linha do tempo de hoje (Rota Litoral), a partir das ${at}:`);
for (const r of todayRows) {
  console.log(`  prazo ${spClock(new Date(r.due))}  ${r.ref.padEnd(16)} ${(r.who?.name ?? "sem responsável").padEnd(18)} ${r.live}`);
}
console.log(`\nContas (senha DEMO_PASSWORD):`);
console.log(`  Gestora  mariana.albuquerque@rotalitoral.test   (${COMPANY_1.name})`);
console.log(`  Campo    rafael.monteiro@ · juliana.pacheco@ · thiago.nascimento@ · camila.duarte@ (rotalitoral.test)`);
console.log(`  Gestor   eduardo.vasconcelos@atlanticacomissaria.test   (${COMPANY_2.name})`);
console.log(`  Campo    lucas.ferreira@ · patricia.gomes@ (atlanticacomissaria.test)`);
console.log(`\nPop-up de ocorrência ao vivo: npm run demo:ocorrencia (registra como Rafael).`);
