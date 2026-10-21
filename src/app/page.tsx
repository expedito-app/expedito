import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import {
  IconBuilding,
  IconChart,
  IconHome,
  IconList,
  IconRoute,
  IconSparkle,
  IconUsers,
} from "@/components/ui/icons";
import { RiskBadge } from "@/components/ui/risk-badge";
import type { RiskLevel } from "@/lib/risk";

// Página pública de divulgação. Quem já está logado nem chega aqui: o proxy.ts
// envia cada perfil para a sua tela. Conteúdo estático, sem dados do banco;
// os exemplos são ilustrativos (cenário simulado).

export const metadata: Metadata = {
  title: "Expedito · Controle das tarefas externas da expedição portuária",
  description:
    "Saiba quem está com cada BL, o que está atrasado e o que vai atrasar, antes que vire armazenagem e demurrage.",
};

const primaryLink = `${buttonBase} ${buttonVariants.primary}`;
const ghostLink = `${buttonBase} ${buttonVariants.ghost}`;

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col p-3 md:p-4">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Profiles />
        <RiskRule />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span
        className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
          inverted ? "bg-white text-ink" : "bg-ink text-white"
        }`}
      >
        Ex
      </span>
      <span className="text-sm font-semibold">Expedito</span>
    </span>
  );
}

function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-4 rounded-full bg-ink py-2 pr-2 pl-3 text-white">
      <Logo inverted />
      <nav aria-label="Seções" className="ml-auto hidden items-center gap-1 md:flex">
        {[
          ["#como-funciona", "Como funciona"],
          ["#funcionalidades", "Funcionalidades"],
          ["#seguranca", "Segurança"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full px-4 py-2 text-sm text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            {label}
          </a>
        ))}
      </nav>
      <Link
        href="/login"
        className="ml-auto inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-white/85 md:ml-2"
      >
        Entrar
      </Link>
    </header>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 px-1 py-16 md:py-24">
      <p className="text-label font-medium text-muted uppercase">{eyebrow}</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-light tracking-tight md:text-4xl">{title}</h2>
      {intro ? <p className="mt-4 max-w-2xl text-muted">{intro}</p> : null}
      <div className="mt-10">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero() {
  return (
    <section className="grid items-center gap-10 px-1 pt-16 pb-8 md:grid-cols-[1.1fr_1fr] md:pt-24">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-ink" />
          Para gestores de expedição portuária
        </p>
        <h1 className="mt-6 text-4xl font-light tracking-tight md:text-6xl md:leading-[1.05]">
          Saiba o que vai atrasar <span className="font-medium">antes</span> que vire demurrage.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          O Expedito tira da planilha, do WhatsApp e da memória as retiradas e entregas de
          documentos nas agências dos armadores. O gestor vê quem está com cada BL e o que
          está em risco; a equipe de campo atualiza tudo pelo celular.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={primaryLink}>
            Acessar a demonstração
          </Link>
          <a href="#como-funciona" className={ghostLink}>
            Como funciona
          </a>
        </div>
      </div>
      <DashboardPreview />
    </section>
  );
}

const PREVIEW_TASKS: { bl: string; agency: string; who: string; due: string; risk: RiskLevel }[] = [
  { bl: "MSCU 4821903", agency: "MSC", who: "Rafael", due: "venceu 14:00", risk: "overdue" },
  { bl: "MAEU 7730215", agency: "Maersk", who: "Juliana", due: "até 16:30", risk: "at_risk" },
  { bl: "HLCU 1029384", agency: "Hapag-Lloyd", who: "Thiago", due: "até 17:00", risk: "at_risk" },
  { bl: "CMDU 5542170", agency: "CMA CGM", who: "Camila", due: "amanhã 11:00", risk: "ok" },
];

// Ilustração do painel montada com os mesmos primitivos do app.
function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Exemplo do painel do gestor: contadores de atrasadas, em risco e concluídas, e a lista de tarefas do dia com selo de risco."
      className="rounded-[2.5rem] bg-canvas p-3 md:p-4"
    >
      <div aria-hidden className="grid grid-cols-3 gap-3">
        <MiniMetric label="Atrasadas" value="1" tone="bg-pastel-rose" />
        <MiniMetric label="Em risco" value="2" tone="bg-pastel-amber" />
        <MiniMetric label="Concluídas hoje" value="9" tone="bg-pastel-green" />
      </div>
      <div aria-hidden className="mt-3 rounded-[2rem] border border-line bg-surface p-5">
        <p className="text-sm font-medium">Precisa de atenção</p>
        <ul className="mt-3 divide-y divide-line">
          {PREVIEW_TASKS.map((t) => (
            <li key={t.bl} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tabular-nums">{t.bl}</p>
                <p className="truncate text-xs text-muted">
                  {t.agency} · {t.who} · {t.due}
                </p>
              </div>
              <RiskBadge level={t.risk} />
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden className="mt-3 flex items-center justify-between gap-4 rounded-[2rem] bg-ink p-5 text-white">
        <div>
          <p className="text-xs text-white/60">Demurrage evitado no mês</p>
          <p className="mt-1 text-3xl font-light whitespace-nowrap tabular-nums">R$ 18,5 mil</p>
        </div>
        <p className="max-w-[8rem] text-right text-xs text-white/50">Estimativa com premissas da empresa</p>
      </div>
      <p className="mt-3 px-2 text-center text-xs text-muted">Dados ilustrativos</p>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-surface p-4">
      <span className={`inline-block size-2 rounded-full ${tone}`} />
      <p className="mt-3 text-3xl font-light tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

/* --------------------------------------------------------------- Problema */

function Problem() {
  const items = [
    {
      title: "Informação espalhada",
      text: "As tarefas externas vivem em planilhas, grupos de WhatsApp e na cabeça de quem está na rua.",
    },
    {
      title: "Atraso descoberto tarde",
      text: "O gestor só sabe que um BL não saiu quando a agência já fechou e não dá mais para agir.",
    },
    {
      title: "Custo que se acumula",
      text: "Documento que atrasa vira diária de armazenagem e demurrage do contêiner, cobrada por dia.",
    },
  ];
  return (
    <Section
      eyebrow="O problema"
      title="A expedição corre o dia todo, mas o gestor enxerga pouco."
      intro="Retirar o BL original, entregar carta de liberação, levar procuração: cada visita a uma agência de armador tem prazo e horário. Sem visibilidade, o risco só aparece quando já virou prejuízo."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <div key={item.title} className="card">
            <p className="text-metric font-light text-muted/60 tabular-nums">0{i + 1}</p>
            <h3 className="mt-6 text-title font-medium">{item.title}</h3>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------- Como funciona */

function HowItWorks() {
  const steps = [
    {
      title: "O gestor cadastra",
      text: "Agência, BL, prazo, urgência e responsável. Pelo formulário, por planilha CSV ou pedindo ao assistente de IA em linguagem natural.",
    },
    {
      title: "O campo executa",
      text: "No celular, cada pessoa vê a lista do dia na ordem sugerida da rota, muda o status em um toque e registra ocorrências.",
    },
    {
      title: "O painel avisa",
      text: "Atrasadas e em risco sobem para o topo, com alertas em pop-up. O gestor age enquanto ainda dá tempo.",
    },
  ];
  return (
    <Section
      id="como-funciona"
      eyebrow="Como funciona"
      title="Três passos, um lugar só."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="card flex flex-col">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
              {i + 1}
            </span>
            <h3 className="mt-6 text-title font-medium">{step.title}</h3>
            <p className="mt-2 text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------- Funcionalidades */

const FEATURES: { icon: ReactNode; tone: string; title: string; text: string }[] = [
  {
    icon: <IconHome />,
    tone: "bg-pastel-rose",
    title: "Painel do dia",
    text: "Tarefas agrupadas com destaque para atrasadas e em risco. Atualiza sozinho a cada minuto.",
  },
  {
    icon: <IconList />,
    tone: "bg-pastel-amber",
    title: "Alertas em pop-up",
    text: "Avisa quando algo entra em risco, vence em até 30 min, atrasa, fica sem responsável ou recebe ocorrência.",
  },
  {
    icon: <IconChart />,
    tone: "bg-pastel-blue",
    title: "Indicadores",
    text: "Pontualidade, atraso médio, desempenho por pessoa, agências que mais atrasam e mapa de calor por dia e hora.",
  },
  {
    icon: <IconBuilding />,
    tone: "bg-pastel-green",
    title: "Demurrage evitado",
    text: "Estima quanto a empresa deixou de gastar com sobre-estadia, com premissas ajustáveis e o cálculo sempre visível.",
  },
  {
    icon: <IconSparkle />,
    tone: "bg-pastel-lilac",
    title: "Assistente de IA",
    text: "“Retirar o BL MSCU123 na Maersk amanhã até 15h, urgente, com o Bruno.” A IA monta a tarefa e o gestor confirma.",
  },
  {
    icon: <IconSparkle />,
    tone: "bg-pastel-blue",
    title: "Análise com IA",
    text: "Aponta gargalos, sazonalidade e planos de ação preventivos e corretivos a partir dos números do período.",
  },
  {
    icon: <IconRoute />,
    tone: "bg-pastel-green",
    title: "Roteirização",
    text: "Ordem sugerida das visitas por prazo, horário da agência, distância e meio de transporte, com revisão por IA.",
  },
  {
    icon: <IconUsers />,
    tone: "bg-pastel-amber",
    title: "Responsável sugerido",
    text: "Ao criar uma tarefa, o sistema indica quem já vai passar perto sem atrasar as outras visitas.",
  },
  {
    icon: <IconList />,
    tone: "bg-pastel-rose",
    title: "Planilhas",
    text: "Importe tarefas por CSV do Excel ou do Google Sheets e exporte o período para análise.",
  },
];

function Features() {
  return (
    <Section
      id="funcionalidades"
      eyebrow="Funcionalidades"
      title="Do cadastro à assinatura de quem recebeu."
      intro="Tudo o que o gestor precisa para acompanhar a equipe externa, sem trocar a forma como já trabalha: cada gestor mantém a própria base de agências, como faz hoje na planilha."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <span className={`flex size-11 items-center justify-center rounded-full text-ink ${f.tone}`}>
              {f.icon}
            </span>
            <h3 className="mt-6 text-title font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- Perfis */

function Profiles() {
  return (
    <Section
      eyebrow="Dois perfis"
      title="Feito para quem coordena e para quem está na rua."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col">
          <p className="text-label font-medium text-muted uppercase">Gestor · computador</p>
          <h3 className="mt-3 text-2xl font-light">Controle da operação inteira</h3>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Cadastro de agências com horário, endereço localizado e exigências",
              "Tarefas com BL, prazo, urgência, responsável e status",
              "Equipe de campo com meio de transporte (moto, carro, ônibus)",
              "Rota do dia de cada pessoa saindo do endereço da empresa",
              "Histórico completo, com filtros e exportação",
            ].map((item) => (
              <Check key={item}>{item}</Check>
            ))}
          </ul>
        </div>
        <div className="card flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-label font-medium text-muted uppercase">Campo · celular</p>
            <h3 className="mt-3 text-2xl font-light">Status em um toque</h3>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Lista do dia na ordem sugerida, com chegada prevista",
                "Iniciar, concluir ou retomar sem formulário",
                "Ocorrências: agência fechada, faltou documento",
                "Conclusão com assinatura de quem recebeu, na tela",
              ].map((item) => (
                <Check key={item}>{item}</Check>
              ))}
            </ul>
          </div>
          <PhonePreview />
        </div>
      </div>
    </Section>
  );
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pastel-green text-[0.65rem] font-semibold text-risk-ok">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function PhonePreview() {
  return (
    <div
      role="img"
      aria-label="Exemplo da tela de campo no celular: tarefa do dia com botões Concluir e Ocorrência."
      className="mx-auto w-52 shrink-0 rounded-[2.25rem] bg-ink p-2"
    >
      <div aria-hidden className="rounded-[1.75rem] bg-paper p-3">
        <div className="rounded-full bg-ink px-3 py-1.5 text-[0.65rem] font-semibold text-white">Expedito</div>
        <p className="mt-3 px-1 text-[0.65rem] text-muted">Hoje · 3 visitas</p>
        <div className="mt-2 rounded-[1.25rem] border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">1 · Maersk</p>
            <span className="rounded-full bg-risk-at-risk-soft px-2 py-0.5 text-[0.6rem] font-medium text-risk-at-risk">
              ◷ Em risco
            </span>
          </div>
          <p className="mt-1 text-[0.65rem] text-muted">MAEU 7730215 · chega 15:40</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <span className="rounded-full bg-ink py-1.5 text-center text-[0.65rem] font-medium text-white">Concluir</span>
            <span className="rounded-full border border-line py-1.5 text-center text-[0.65rem]">Ocorrência</span>
          </div>
        </div>
        <div className="mt-2 rounded-[1.25rem] border border-line bg-surface p-3">
          <p className="text-xs font-medium">2 · Hapag-Lloyd</p>
          <p className="mt-1 text-[0.65rem] text-muted">HLCU 1029384 · chega 16:15</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Regra de risco */

function RiskRule() {
  const rows: { level: RiskLevel; when: string }[] = [
    { level: "overdue", when: "O prazo passou e a tarefa não foi concluída." },
    {
      level: "at_risk",
      when: "Faltam 2 horas ou menos para o prazo, ou o prazo é hoje e a agência fecha em 1 hora ou menos.",
    },
    { level: "ok", when: "Todas as outras tarefas abertas." },
  ];
  return (
    <Section
      eyebrow="Regra de risco"
      title="Uma regra clara, igual em todas as telas."
      intro="O horário de fechamento da agência entra na conta: não adianta ter prazo às 18h se a agência fecha às 16h."
    >
      <div className="card divide-y divide-line p-0">
        {rows.map((row) => (
          <div key={row.level} className="flex flex-col gap-3 px-7 py-5 sm:flex-row sm:items-center sm:gap-8">
            <div className="w-32 shrink-0">
              <RiskBadge level={row.level} />
            </div>
            <p className="text-sm">{row.when}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- Segurança */

function Security() {
  const items = [
    {
      title: "Dados isolados por empresa",
      text: "Cada gestor só enxerga as próprias agências, tarefas e equipe. A regra está no banco (Row Level Security), com teste automatizado.",
    },
    {
      title: "Campo só mexe no status",
      text: "A equipe de campo vê apenas as tarefas atribuídas a ela e não altera prazo, agência nem responsável.",
    },
    {
      title: "Acesso controlado",
      text: "Sem cadastro público: gestores são criados pela administração e criam a própria equipe. Senha temporária trocada no primeiro acesso.",
    },
    {
      title: "IA que só propõe",
      text: "O assistente devolve um rascunho que o gestor confirma. Nas análises, a IA recebe só números agregados, sem BLs.",
    },
  ];
  return (
    <Section
      id="seguranca"
      eyebrow="Segurança"
      title="Construído para dados de clientes desde o primeiro dia."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="card">
            <h3 className="text-title font-medium">{item.title}</h3>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- CTA e rodapé */

function FinalCta() {
  return (
    <section className="px-1 pt-8 pb-16 md:pb-24">
      <div className="flex flex-col items-start gap-8 rounded-[2.5rem] bg-ink p-8 text-white md:flex-row md:items-end md:justify-between md:p-12">
        <div>
          <h2 className="max-w-xl text-3xl font-light tracking-tight md:text-4xl">
            Menos telefonema, menos planilha, menos demurrage.
          </h2>
          <p className="mt-4 max-w-lg text-white/60">
            Entre com uma conta de demonstração e veja o painel, a tela de campo e os
            indicadores com um cenário simulado do porto de Santos.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-12 shrink-0 items-center rounded-full bg-white px-7 text-sm font-medium text-ink transition-colors duration-150 hover:bg-white/85"
        >
          Acessar a demonstração
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[2rem] bg-surface px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <Logo />
      <p>
        Projeto do Hackathon UNISANTA 2026 · Desafio T2S / DYNApp Hub. Agências com nomes de
        armadores reais e dados simulados.
      </p>
    </footer>
  );
}
