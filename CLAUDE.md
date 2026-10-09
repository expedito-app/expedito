# Expedito: Contexto do Projeto para o Claude Code

> Antigo nome provisório: Cais. Nome atual: **Expedito**.
> Leia este arquivo inteiro antes de escrever qualquer código. Em caso de conflito entre este arquivo e uma suposição sua, este arquivo vence.

---

## 1. Visão Geral

**O que é:** aplicação web para gestores de expedição de empresas de logística portuária acompanharem as **tarefas externas** da equipe (retirada e entrega de documentos em agências de armadores): quem está com o quê, o que está atrasado e o que está em risco.

**Origem:** projeto do Hackathon UNISANTA 2026 (Desafio T2S / DYNApp Hub). **Entrega: 09/10/2026.** A banca avalia, em ordem de peso: relevância do problema, comprovação da demanda e funcionamento do produto.

**Problema (hipótese a validar em 3 entrevistas):** o gestor não tem visibilidade e controle das tarefas externas. As informações ficam em planilhas, WhatsApp e na memória das pessoas, o que pode gerar atraso de BL e custo (armazenagem, demurrage).

**Objetivo principal:** ter uma demo funcionando, publicada em URL acessível, em que o gestor cadastra tarefas, acompanha o status e vê destacado o que está atrasado ou em risco, enquanto o usuário de campo atualiza o andamento pelo celular.

**Premissas de negócio**
- O gestor já mantém hoje uma base própria de agências em planilha. O sistema reproduz esse hábito: **cada gestor mantém a sua base**, sem base compartilhada entre empresas.
- A demo usa **cenário simulado**, declarado como simulado na apresentação.

### Perfis de usuário

| Perfil (`role`) | Quem é | O que pode fazer |
|---|---|---|
| `manager` (gestor) | Coordenador/gestor de expedição | Tudo sobre os seus próprios dados: agências, tarefas, usuários de campo, painel |
| `field` (campo) | Quem executa as visitas | Ver apenas as tarefas atribuídas a ele, mudar status e registrar ocorrências |

### Escopo do MVP

**Dentro (obrigatório)**
1. Login funcional com os dois perfis. **Sem cadastro público:** gestores são criados pela administração (`npm run manager:create`) e o gestor cria os usuários de campo. Toda conta nova recebe senha temporária e troca no primeiro acesso.
2. Cadastro de agências (nome, endereço, horário de atendimento, exigências).
3. Cadastro de tarefas (agência, documento/BL, prazo, urgência, responsável, status).
4. Painel do gestor com destaque para tarefas **atrasadas** e **em risco**.
5. Tela de campo (mobile web): lista do dia, mudar status, registrar ocorrência.

**Se sobrar tempo:** contadores de atrasos e ocorrências por agência; ordenação sugerida das visitas por prazo e horário da agência.

**Escopo ampliado (aprovado pelo usuário em 07/10/2026):** IA com **Gemini** (chat que cria tarefa, planos de ação preditivos/preventivos/corretivos), assinatura na conclusão da tarefa, importação de planilhas (CSV e Excel), histórico completo com filtros e, opcional, ordem sugerida das visitas com IA (sem mapas nem trânsito). Plano em `/mnt/project-files/planos/plano-novas-funcionalidades.md` (pasta do projeto no Claude).

**Escopo de gestão (pedido pelo usuário em 08/10/2026):** página Indicadores com período selecionável e análise de IA, exportação CSV (abre no Google Sheets/Excel), importação de tarefas por CSV, alertas em pop-up dentro do app (não é push), papel do usuário no token do proxy e CI no GitHub Actions.

**Roteirização (pedido pelo usuário em 08/10/2026):** meio de transporte por usuário de campo, coordenadas das agências (localizadas pelo endereço no OpenStreetMap/Nominatim, única integração externa além do Gemini, ou digitadas), ordem sugerida das visitas (`/rotas` e `/hoje`), sugestão automática de responsável ao criar tarefa (formulário e assistente) e revisão das rotas com IA. Sem mapa desenhado e sem trânsito em tempo real.

**Fora do escopo (não implementar):** recuperação de senha, login social, notificações push (fora do navegador), rotas com trânsito em tempo real e mapas desenhados, rastreamento de localização, integrações externas além do Gemini, módulo financeiro, app nativo (React Native), multiempresa compartilhada, base de agências compartilhada.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend + API | **Next.js** (App Router) + **React** + **TypeScript** (`strict`) | Aplicação única; sem NestJS |
| Hospedagem do app | **Vercel** | Deploy contínuo a partir do GitHub |
| Banco de dados | **PostgreSQL no Supabase** | Plano gratuito |
| Autenticação | **Supabase Auth** (e-mail e senha) | Substitui a escolha anterior (Better Auth + Neon), pois o banco agora é Supabase |
| Autorização | **Row Level Security (RLS)** do Postgres | Isolamento de dados por gestor |
| Estilo | **Tailwind CSS** | Ver seção 3 |
| Animação | **Motion** (`motion/react`) | Ver seção 3 |
| Validação | **Zod** | Em toda entrada de Server Action |
| Cliente Supabase | `@supabase/supabase-js` + `@supabase/ssr` | Sessão via cookies |
| Repositório | GitHub | Se privado, dar acesso a `@larguesa` e `@rodrigolopessalgado` |

**Pontos de atenção**
- Conferir limites e condições atuais do plano gratuito do Supabase e da Vercel (incluindo termos de uso) antes de depender deles.
- Projetos gratuitos do Supabase podem ser pausados por inatividade. Verificar o status do projeto antes da apresentação.
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas) e `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` (**somente servidor**).

---

## 3. Padrões de Arquitetura e UI/UX

### 3.1 Estrutura de pastas

```
expedito/
├── supabase/
│   └── migrations/              # SQL versionado (única fonte de verdade do schema)
├── scripts/                     # Testes de API e cenários (ver seção 5.1)
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Página de login
│   │   ├── (auth)/trocar-senha/ # Troca da senha temporária (primeiro acesso)
│   │   ├── (manager)/           # Rotas do gestor
│   │   │   ├── painel/          # Painel do dia
│   │   │   ├── tarefas/         # Lista, criação e edição de tarefas
│   │   │   ├── agencias/        # Cadastro de agências
│   │   │   └── equipe/          # Criação de usuários de campo
│   │   ├── (field)/hoje/        # Lista do dia do usuário de campo (mobile-first)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # Primitivos (Button, Input, Badge, Sheet...)
│   │   └── features/            # Componentes de domínio (TaskCard, AgencyForm...)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Cliente do navegador
│   │   │   ├── server.ts        # Cliente de servidor (cookies)
│   │   │   └── admin.ts         # Service role (somente servidor, nunca importar em client)
│   │   ├── risk.ts              # Regras de risco/atraso (espelha a view SQL)
│   │   ├── validation/          # Schemas Zod
│   │   └── format.ts            # Datas e rótulos em pt-BR
│   ├── actions/                 # Server Actions por domínio (tasks.ts, agencies.ts, team.ts)
│   ├── types/
│   │   └── database.ts          # Tipos gerados do Supabase (não editar à mão)
│   └── proxy.ts                 # Refresh de sessão + redirecionamento por perfil (ex-middleware no Next 16)
└── CLAUDE.md                    # Este arquivo
```

### 3.2 Padrões de projeto

- **Server Components por padrão.** Use `"use client"` apenas quando houver interatividade ou estado local.
- **Mutações via Server Actions**, sempre com validação Zod antes de tocar no banco.
- **Autorização em duas camadas:** RLS no banco (definitiva) e checagem de perfil no servidor (UX e mensagens de erro). Nunca confiar apenas no front.
- **Route groups por perfil**, com o `proxy.ts` redirecionando `manager` para `/painel` e `field` para `/hoje`.
- **Regra de risco em um só lugar:** a view `tasks_with_risk` (SQL) é a fonte; `lib/risk.ts` só reflete os rótulos e não recalcula regras divergentes.
- **Datas:** armazenar em `timestamptz` (UTC) e exibir em `America/Sao_Paulo`.
- **Idiomas:** identificadores de código, tabelas e colunas em **inglês**; textos de interface em **português do Brasil**.

### 3.3 Mapeamento de rótulos (enum → interface)

| Enum | Valor | Rótulo na UI |
|---|---|---|
| `task_status` | `pending` | Pendente |
| | `in_progress` | Em andamento |
| | `done` | Concluída |
| | `problem` | Com problema |
| `task_urgency` | `low` / `medium` / `high` | Baixa / Média / Alta |
| `risk_level` | `ok` / `at_risk` / `overdue` / `none` | No prazo / Em risco / Atrasada / (sem destaque) |
| `occurrence_type` | `agency_closed` | Agência fechada |
| | `missing_document` | Faltou documento |
| | `other` | Outro |

### 3.4 Diretrizes visuais (redesenho de 08/10/2026, pedido do usuário)

- **Estilo:** minimalista monocromático. **Preto** é a cor de ênfase (sidebar, botão principal, destaque); **pastéis** (azul, verde, âmbar, rosa, lilás: tokens `pastel-*`) só para **categorizar** (risco, status, tipos de análise). Nunca depender só da cor: sempre rótulo ou ícone.
- **Cores:** fundo cinza-azulado claro (`paper`), container principal `canvas`, **cards brancos** (`surface`). Risco: texto escuro sobre pastel (atrasada = rosa, em risco = âmbar, no prazo = verde).
- **Tipografia:** uma única sans-serif (Inter). Hierarquia por tamanho e peso; **números grandes e leves** (`text-metric font-light`).
- **Formas:** cantos muito arredondados (cards `rounded-[2rem]` via utilitário `card`, botões e campos pequenos `rounded-full`, campos `rounded-2xl`); bordas de 1px quase invisíveis (`line`); quase sem sombra (só pop-ups).
- **Espaçamento:** padding generoso (`card` = 1.75rem), grid regular, gaps uniformes (`gap-4`).
- **Layout do gestor:** sidebar escura **flutuante só com ícones** (rótulo no hover/foco e em `aria-label`; no celular vira barra inferior), container principal arredondado sobre o fundo, seções em **grid de cards**. Campo: barra escura arredondada no topo, cards de tarefa brancos.
- **Animação fluida e discreta** (Motion): 150 a 250 ms, easing suave, respeitar `prefers-reduced-motion`.
- **Mobile-first na tela de campo:** alvos de toque ≥ 44 px, ações alcançáveis com o polegar, status em no máximo 2 toques.
- **Acessibilidade:** contraste adequado, foco visível (contorno preto), rótulos em formulários, navegação por teclado.

---

## 4. Esquema do Banco de Dados

Todo o schema deve ser criado por **migrations em `supabase/migrations/`**. Todas as tabelas de domínio têm `manager_id`, o gestor dono dos dados, e é isso que sustenta o isolamento por RLS.

### 4.1 Relacionamentos

| Tabela | Chaves estrangeiras |
|---|---|
| `profiles` | `id` → `auth.users.id`; `manager_id` → `profiles.id` (só para `field`) |
| `agencies` | `manager_id` → `profiles.id` |
| `tasks` | `manager_id` → `profiles.id`; `agency_id` → `agencies.id`; `assigned_to` → `profiles.id` |
| `task_occurrences` | `task_id` → `tasks.id`; `manager_id` → `profiles.id`; `author_id` → `profiles.id` |

### 4.2 Tipos e tabelas

```sql
create type user_role       as enum ('manager', 'field');
create type task_urgency    as enum ('low', 'medium', 'high');
create type task_status     as enum ('pending', 'in_progress', 'done', 'problem');
create type occurrence_type as enum ('agency_closed', 'missing_document', 'other');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'manager',
  full_name  text not null,
  manager_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint role_manager_link check (
    (role = 'manager' and manager_id is null) or
    (role = 'field'   and manager_id is not null)
  )
);

create table agencies (
  id           uuid primary key default gen_random_uuid(),
  manager_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  address      text,
  opens_at     time,
  closes_at    time,
  requirements text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  manager_id   uuid not null references profiles(id) on delete cascade,
  agency_id    uuid not null references agencies(id) on delete restrict,
  assigned_to  uuid references profiles(id) on delete set null, -- deve ser role = 'field' (validar na Server Action)
  document_ref text not null,               -- BL ou identificador do documento
  description  text,
  urgency      task_urgency not null default 'medium',
  due_at       timestamptz not null,
  status       task_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table task_occurrences (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  manager_id uuid not null references profiles(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  type       occurrence_type not null,
  note       text,
  created_at timestamptz not null default now()
);

create index tasks_manager_due_idx    on tasks (manager_id, due_at);
create index tasks_assignee_status_idx on tasks (assigned_to, status);
create index agencies_manager_idx     on agencies (manager_id);
create index occurrences_task_idx     on task_occurrences (task_id);
```

### 4.3 Criação de perfil no cadastro

Não há cadastro público (desligado no Supabase: Authentication → "Allow new users to sign up"). Contas criadas pelo admin disparam o trigger, que cria **sempre** um gestor; o papel nunca vem de metadados enviados pelo cliente. Gestores são criados por `npm run manager:create`. Usuários de campo são criados somente no servidor (service role) pela Server Action da equipe, que depois insere o perfil `field` com o `manager_id` correto.

```sql
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, 'manager', coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

> Atenção: ao criar um usuário de campo via API de administração, o trigger acima também dispara. A Server Action deve, em seguida, **atualizar** o perfil para `role = 'field'` e `manager_id` do gestor logado, usando o cliente admin.

### 4.4 Funções auxiliares e RLS

```sql
create function current_owner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case when role = 'manager' then id else manager_id end
  from profiles where id = auth.uid()
$$;

alter table profiles         enable row level security;
alter table agencies         enable row level security;
alter table tasks            enable row level security;
alter table task_occurrences enable row level security;

-- profiles: o usuário vê o próprio perfil; o gestor vê os seus usuários de campo
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or manager_id = auth.uid());

-- agencies: gestor controla as suas; campo só lê as do seu gestor
create policy agencies_manager_all on agencies for all to authenticated
  using (manager_id = auth.uid()) with check (manager_id = auth.uid());
create policy agencies_field_select on agencies for select to authenticated
  using (manager_id = current_owner_id());

-- tasks: gestor controla as suas; campo só lê as atribuídas a ele
create policy tasks_manager_all on tasks for all to authenticated
  using (manager_id = auth.uid()) with check (manager_id = auth.uid());
create policy tasks_field_select on tasks for select to authenticated
  using (assigned_to = auth.uid());

-- ocorrências: gestor lê as suas; campo lê e cria apenas nas suas tarefas
create policy occurrences_manager_select on task_occurrences for select to authenticated
  using (manager_id = auth.uid());
create policy occurrences_field_select on task_occurrences for select to authenticated
  using (author_id = auth.uid());
create policy occurrences_field_insert on task_occurrences for insert to authenticated
  with check (
    author_id = auth.uid()
    and manager_id = current_owner_id()
    and exists (select 1 from tasks t where t.id = task_id and t.assigned_to = auth.uid())
  );
```

O usuário de campo **não tem política de UPDATE** em `tasks`. Ele altera o status somente por esta função, que impede mexer em prazo, agência ou qualquer outra coluna:

```sql
create function field_update_task_status(p_task_id uuid, p_status task_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tasks
     set status       = p_status,
         updated_at   = now(),
         completed_at = case when p_status = 'done' then now() else null end
   where id = p_task_id and assigned_to = auth.uid();
  if not found then
    raise exception 'Tarefa não encontrada ou não atribuída a você';
  end if;
end $$;

revoke all on function field_update_task_status(uuid, task_status) from public, anon;
grant execute on function field_update_task_status(uuid, task_status) to authenticated;
```

### 4.5 View de risco (fonte da regra)

Regra: tarefa **atrasada** se o prazo já passou e não está concluída; **em risco** se faltam 2 horas ou menos para o prazo, ou se a agência fecha em 1 hora ou menos e o prazo é hoje.

```sql
create view tasks_with_risk with (security_invoker = true) as
select
  t.*,
  a.name      as agency_name,
  a.closes_at as agency_closes_at,
  case
    when t.status = 'done'  then 'none'
    when t.due_at < now()   then 'overdue'
    when t.due_at - now() <= interval '2 hours'
      or (
        a.closes_at is not null
        and (t.due_at at time zone 'America/Sao_Paulo')::date
            = (now()  at time zone 'America/Sao_Paulo')::date
        and (now() at time zone 'America/Sao_Paulo')::time >= a.closes_at - interval '1 hour'
      )
    then 'at_risk'
    else 'ok'
  end as risk_level
from tasks t
join agencies a on a.id = t.agency_id;
```

### 4.6 Queries importantes

```sql
-- Painel do gestor: tarefas do dia, mais críticas primeiro
select *
from tasks_with_risk
where (due_at at time zone 'America/Sao_Paulo')::date
      = (now() at time zone 'America/Sao_Paulo')::date
   or (status <> 'done' and due_at < now())
order by
  case risk_level when 'overdue' then 0 when 'at_risk' then 1 else 2 end,
  due_at;

-- Tela de campo: tarefas atribuídas ao usuário logado (RLS já filtra)
select id, document_ref, agency_name, agency_closes_at, due_at, urgency, status, risk_level
from tasks_with_risk
where status <> 'done'
order by due_at;

-- Contadores do painel
select
  count(*) filter (where risk_level = 'overdue')  as overdue,
  count(*) filter (where risk_level = 'at_risk')  as at_risk,
  count(*) filter (where status = 'done'
                   and (completed_at at time zone 'America/Sao_Paulo')::date
                       = (now() at time zone 'America/Sao_Paulo')::date) as done_today
from tasks_with_risk;

-- (Se sobrar tempo) Ocorrências por agência
select a.name, o.type, count(*) as total
from task_occurrences o
join tasks t    on t.id = o.task_id
join agencies a on a.id = t.agency_id
group by a.name, o.type
order by total desc;
```

---

## 5. Estado Atual

> Atualize esta seção a cada entrega. **Antes de começar, verifique o estado real do repositório** (`git log`, árvore de arquivos, `supabase/migrations/`) e não presuma que algo abaixo existe sem conferir.

| Item | Situação |
|---|---|
| Escopo, perfis e regras de negócio definidos | Definido (este documento) |
| Stack definida (Next.js + Supabase + Vercel) | Definida |
| Repositório no GitHub | Sim: github.com/expedito-app/expedito |
| Projeto Next.js inicializado | Sim (Next 16.4, `cacheComponents` ligado, `proxy.ts`) |
| Projeto Supabase criado e variáveis configuradas | Sim (local em `.env.local`) |
| Migrations aplicadas | `..._init.sql` sim; `..._tasks_same_owner.sql` proposta, **não aplicada** por decisão do usuário; `20261008000000_task_signatures.sql` aplicada em 07/10; `20261009000000_roteirizacao.sql` aplicada em 08/10; `20261009010000_empresa_do_gestor.sql` (PR `claude/empresa-e-apresentacao`) **aplicar antes de publicar esse PR** |
| Login com perfis (Fase 0) | Sim, testado local e em produção |
| Sem cadastro público + senha temporária (Fase 6, item 1) | Sim (na `main`); cadastro público desligado no Supabase (conferido pelo `test:isolation` em 08/10) |
| Deploy na Vercel | Sim: https://expedito-two.vercel.app |
| Cadastros de agências e tarefas (Fase 1) | Sim: lista, criação, edição e exclusão; checagem de dono na Server Action |
| Painel com risco (Fase 2) | Sim: contadores, lista do dia agrupada, atualização a cada 60 s, Motion |
| Tela de campo (Fase 3) | Sim: status em um toque, Desfazer, ocorrências; gestor vê ocorrências na tarefa e no painel |
| Chat de IA que cria tarefa (escopo ampliado) | Sim (na `main` desde 08/10, botão "Assistente" no cabeçalho do gestor): `GEMINI_API_KEY` e `GEMINI_MODEL=gemini-3.5-flash` no `.env.local` e na Vercel (Production); testado no local e em produção |
| Assinatura na conclusão (escopo ampliado) | Sim (na `main` desde 08/10): migration aplicada, `test:isolation` 100% PASS e testado de ponta a ponta no local |
| Melhorias de gestão (08/10, PR `claude/melhorias-gestao`) | `/indicadores` (KPIs, série, equipe, agências, mapa de calor, próximos 7 dias, custo de atraso, análise com Gemini), exportar CSV, `/tarefas/importar` (CSV), pop-ups de alerta (gestor e campo), risco e busca por BL em `/tarefas`, Gemini padrão 3.5, papel no token, CI, README em pt-BR, seed com 12 meses de histórico. **Sem migration** |
| Roteirização (08/10, PR `claude/roteirizacao`, depende do PR de gestão) | Transporte na Equipe, coordenadas na Agência, `/rotas` (rota do dia por pessoa + revisão com IA), ordem sugerida no `/hoje`, sugestão de responsável no formulário e no assistente, assinatura apagada quando o gestor reabre. **Com migration** |
| Empresa do gestor + reset + seed da apresentação + redesenho (08/10, PR `claude/empresa-e-apresentacao`) | Gestor novo cadastra empresa e endereço-base no primeiro acesso (`/cadastro-empresa`), edita em `/empresa`; rotas saem da base. `reset:all`, `seed:demo` reescrito (duas empresas, nomes realistas), `seed:apresentacao`, `demo:ocorrencia`. Visual monocromático com sidebar de ícones. **Com migration** |
| Cenário simulado de dados (Fase 4) | Sim: `npm run seed:demo`, executado em 07/10 às 19:33 (13/13 PASS); contas da demo criadas em produção |

### 5.1 Como rodar e testar (em qualquer máquina)

1. `git clone https://github.com/expedito-app/expedito.git` e `npm install`.
2. Criar `.env.local` a partir de `.env.example` (chaves em Supabase → Project Settings → API, ou Vercel → Settings → Environment Variables). Nunca versionar.
3. Para os scripts de teste, criar `.env.test.local` a partir de `.env.test.example`.
4. `npm run dev` para desenvolver; `npm run typecheck`, `npm run lint` e `npm run build` antes de cada commit.

| Comando | O que faz |
|---|---|
| `npm run test:isolation` | Teste de RLS direto pela API: confere que o cadastro público está desligado, dois gestores e um campo; apaga os dados que cria (mantém as contas). Rodar após qualquer mudança em migration, RLS ou Server Action |
| `npm run scenario:risk` | Recria, para `TEST_MANAGER_UI`, 8 tarefas `TESTE-*` (uma por situação de risco, prazos relativos ao horário atual) e confere a view. `-- --clean` só remove |
| `npm run reset:all -- --confirmo-apagar-tudo` | **Apaga todas as contas e todos os dados** (sem a flag, só lista). Depois, rode o seed |
| `npm run seed:demo` | Cenário completo, com prazos relativos ao horário em que roda. Duas empresas (isolamento): **Rota Litoral Despachos Aduaneiros** (Mariana Albuquerque; campo Rafael/moto, Juliana/ônibus, Thiago/carro, Camila/moto; `@rotalitoral.test`) e **Atlântica Comissária de Despachos** (Eduardo Vasconcelos; Lucas, Patrícia; `@atlanticacomissaria.test`), senha `DEMO_PASSWORD`. 9 agências de armadores reais com endereços/horários **simulados**, tarefas de hoje (atrasadas, vencendo, em risco, com ocorrência, concluídas com assinatura), 14 de amanhã (3 sem responsável), 12 meses de histórico (~2.000) com padrões para a IA. Recria só os dados de domínio; contas são reaproveitadas |
| `npm run seed:apresentacao` | Igual, mas com os prazos **ancorados às 19:40 de hoje** (`--para HH:MM` para outro horário). Rode de manhã (antes das 12h): às 19:40 há atrasadas, uma vence em 10 min e outra em 25 min (atrasam ao vivo), outras entram em risco durante a demo e a ZIM fecha 50 min depois da âncora. O script imprime a linha do tempo |
| `npm run demo:ocorrencia` | Durante a demo: registra uma ocorrência como Rafael (campo) para o pop-up aparecer no painel da gestora em até 1 min |
| `npm run manager:create -- --email <e-mail> --name "<nome>"` | Cria um gestor com senha temporária (mostrada uma vez no terminal); a troca é obrigatória no primeiro acesso |

Num clone novo, rode `npx next typegen` (ou `npm run build`) antes do `typecheck`: `PageProps`/`LayoutProps` são gerados pelo Next.

### 5.2 Decisões tomadas

- **`proxy.ts`** em vez de `middleware.ts` (renomeado no Next 16).
- **`cacheComponents` ligado:** dados de sessão sempre dentro de `<Suspense>`; `lib/supabase/server.ts` chama `connection()` (o supabase-js usa `Date.now()`). Datas exibidas em Client Components chegam já formatadas do servidor (evita divergência de hidratação).
- **Migration `20261007000100_tasks_same_owner.sql` NÃO aplicada** por decisão do usuário. A brecha (gestor criar tarefa com agência/campo de outro gestor pela API) é barrada só na Server Action (`actions/tasks.ts`, `checkOwnership`). O `test:isolation` mostra a brecha como `INFO`. Aplicar só se o usuário pedir.
- **`types/database.ts` escrito à mão** (sem login no Supabase CLI). Trocar por `npx supabase gen types typescript --project-id <id>` quando houver acesso; ao mudar o schema, atualizar à mão.
- **Dependências além da stack base:** `server-only` (impede `admin.ts` no navegador) e `motion` 14 (aprovado na Fase 2).
- **Painel:** atualização automática a cada 60 s (pausa com a aba oculta); agrupamento "Precisa de atenção" (atrasadas e em risco) e depois por status.
- **Senha temporária:** marca `must_change_password` em `app_metadata` do Supabase Auth (só o service role altera; sem migration). `proxy.ts` prende o usuário em `/trocar-senha` até trocar; `changePassword` troca com a sessão do usuário, limpa a marca pelo admin e renova o token. Contas da demo e de teste não têm a marca.
- **Assistente de IA (Gemini):** `@google/genai` só no servidor (`lib/ai/gemini.ts`, `actions/assistant.ts`); chave `GEMINI_API_KEY` e modelo opcional `GEMINI_MODEL` (padrão `gemini-3.5-flash` desde 08/10; o 2.5 já não aceita chaves novas). O Gemini recebe as agências e a equipe do gestor e só **propõe** a tarefa pela ferramenta `criar_tarefa`; a gravação acontece quando o gestor clica em "Criar", por `createTaskFromDraft`, que usa a mesma validação Zod e `checkOwnership` do formulário. A conversa fica só no navegador (nada salvo no banco); o navegador envia só as últimas 20 mensagens. O assistente **não vê nem edita tarefas existentes** (diz isso e orienta usar o formulário) e pergunta antes de criar sem responsável quando o nome citado não está na equipe. Na Vercel usamos `gemini-3.5-flash`: o `gemini-3.8-flash` deu 503 (alta demanda) em cerca de metade das chamadas em 08/10.
- **Assinatura obrigatória (campo):** "Concluir" no `/hoje` abre uma folha com o nome de quem recebeu e a assinatura desenhada em `<canvas>` (PNG em data URL, ~12 KB, limite 200 KB). Tabela `task_signatures` (uma por tarefa, sem política de escrita) e função `field_complete_task_with_signature`; `field_update_task_status` passa a recusar `done` e, ao reabrir, apaga a assinatura. O gestor vê a assinatura na tela da tarefa concluída. Concluir pelo formulário do gestor continua possível, sem assinatura.
- **Gestor pode excluir tarefas** (com confirmação); agência com tarefas não pode ser excluída (FK).
- **Registrar ocorrência muda a tarefa para "Com problema"** automaticamente; o campo usa "Retomar" para voltar a "Em andamento".
- **Status (sem risco) usa estilo neutro**; cores de estado só para risco.
- **Indicadores (`lib/insights.ts`, `lib/period.ts`):** calculados no servidor sob RLS, pelo prazo da tarefa. "Atrasou" = concluída depois do prazo **ou** `risk_level = overdue` (não recalcula a regra da view). Pontualidade = no prazo ÷ (concluídas + vencidas abertas). Gráficos em SVG puro (`insights-charts.tsx`), sem dependência nova. A análise de IA (`actions/insights.ts`) recalcula o período no servidor e manda ao Gemini só agregados (sem BL nem descrição), com resposta em JSON validada por Zod.
- **Exportação:** `GET /indicadores/exportar` gera CSV com `;` e BOM (Excel pt-BR e Google Sheets), neutralizando fórmulas. Integração direta com Google Sheets (OAuth) ficou de fora.
- **Importação (`actions/import.ts`):** CSV até 900 KB/500 linhas, tudo ou nada; agência e responsável casados pelo nome (sem acento/maiúscula) nas listas do próprio gestor. `.xlsx` é recusado com instrução para salvar como CSV (sem dependência nova).
- **Alertas (`actions/alerts.ts`, `alert-center.tsx`):** pop-ups dentro do app, consulta a cada 60 s com a aba visível; atrasada, vence em ≤ 30 min, em risco, sem responsável e ocorrência nova. Dispensados ficam no `localStorage` até o fim do dia; o id muda quando a situação piora. No campo aparecem no topo.
- **Papel no token:** `app_metadata.expedito_role` gravado na criação (equipe, `manager:create`, seed). O `proxy.ts` usa a marca e só consulta `profiles` em contas antigas sem ela.
- **Roteirização (`lib/routing.ts` puro, `lib/routes.ts` com as consultas):** distância em linha reta × 1,35 (ruas), velocidade e tempo extra por parada de cada transporte (`lib/transport.ts`: ônibus/a pé 14 km/h, moto 28, carro 22 com 10 min para estacionar), 15 min de atendimento. Prazo efetivo = menor entre o prazo e o fechamento da agência. Ordem gulosa: folga < 30 min vai primeiro; senão menor deslocamento com peso leve para a folga. Saída = agora (hoje) ou 08:00. Agência sem coordenada conta 2,5 km. Sugestão de responsável = menor (minutos a mais na rota + 60 por visita que passa a atrasar + 8 por tarefa já no dia); o formulário pré-seleciona enquanto o gestor não escolhe à mão.
- **Geocodificação (`lib/geocode.ts`):** Nominatim, só no servidor, ao salvar agência sem coordenadas (ou com endereço novo e coordenadas antigas). Timeout de 4 s; se falhar, salva sem coordenadas.
- **Transporte:** coluna `profiles.transport_mode`; o gestor altera pela Equipe com o cliente admin preso a `manager_id` do gestor logado (profiles não tem política de UPDATE).
- **Reabrir pelo gestor:** `updateTask` chama `manager_clear_task_signature` quando o status sai de "Concluída"; a função só apaga assinatura de tarefa do próprio gestor que não está concluída.
- **Empresa do gestor:** colunas `company_name`, `base_address`, `base_latitude/longitude` em `profiles` (migration `20261009010000`). Gestor criado por `manager:create` ganha a marca `needs_company` em `app_metadata`; o `proxy.ts` prende em `/cadastro-empresa` (depois de `/trocar-senha`) até salvar, e `saveCompany` limpa a marca e renova o token. Endereço localizado pelo Nominatim (obrigatório achar ou digitar coordenadas). O campo lê a base do gestor por `current_base()` (security definer). Rotas e sugestão de responsável partem da base.
- **Nomes da demo:** pessoas e empresas fictícias com nomes realistas; agências usam nomes de armadores reais com dados simulados (declarar como simulado na apresentação).
- **`/tarefas`:** sem filtro mostra abertas + concluídas da última semana (o histórico antigo fica no filtro "Concluída", na busca e em Indicadores); limite de 200 linhas.

### 5.3 Pendências para a Fase 4 (perguntar ao usuário antes de começar)

1. **Contas da demo (decidido em 07/10):** contas novas apresentáveis (Ana, Bruno, Carla) e agências fictícias. Contas `@expedito.test` de teste e dados `TESTE-*` **mantidos** por enquanto (apagar exige confirmação explícita).
2. **Frescor do cenário:** resolvido com `npm run seed:demo` (relativo ao horário em que roda). A apresentação de 09/10 é entre **19:30 e 21:30**: recriar o cenário por volta de 19:15. Durante a demo as tarefas mudam de risco sozinhas (em risco → atrasada; no prazo → em risco), o que mostra o painel atualizando a cada 60 s.
3. Antes da apresentação: verificar se o projeto Supabase não foi pausado por inatividade (plano gratuito).

---

## 6. Objetivo Imediato

> **Andamento:** Fases 0 a 4 concluídas (Fase 4, seed do cenário simulado, em 07/10/2026). **Próxima: Fase 5 (itens opcionais), só com pedido do usuário**; antes da apresentação, ver checklist na seção 5.3. O texto abaixo é o plano original da Fase 0, mantido como referência.

**Fase 0: fundação publicada, com login funcionando.** Tudo o mais depende disto.

**Tarefas, em ordem**
1. Verificar o estado do repositório. Se não houver projeto, inicializar Next.js (App Router, TypeScript `strict`, Tailwind) na estrutura da seção 3.1.
2. Configurar os clientes Supabase (`client.ts`, `server.ts`, `admin.ts`) e o `proxy.ts` com refresh de sessão.
3. Criar a migration com tipos, tabelas, trigger, funções, RLS e view das seções 4.2 a 4.5, **e mostrar o SQL ao usuário antes de aplicar**.
4. Implementar login (e-mail e senha), cadastro de gestor e logout.
5. Implementar redirecionamento por perfil: `manager` → `/painel`, `field` → `/hoje`, ambas com página provisória.
6. Implementar a Server Action de criação de usuário de campo (cliente admin, seguindo a nota da seção 4.3).
7. Publicar na Vercel com as variáveis de ambiente configuradas.

**Critérios de aceite**
- [x] A URL publicada abre a tela de login.
- [x] Um gestor se cadastra, entra e cai em `/painel`.
- [x] O gestor cria um usuário de campo, que entra e cai em `/hoje`.
- [x] **Teste de isolamento:** com dois gestores, um não consegue ver agências ou tarefas do outro (verificar também direto pela API).
- [x] Usuário de campo não acessa rotas do gestor.
- [x] `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle do cliente.
- [x] `tsc --noEmit` e o lint passam sem erros.

**Próximas fases (não iniciar sem pedido):** (1) cadastros de agências e tarefas; (2) painel com risco; (3) tela de campo com status e ocorrências; (4) seed do cenário simulado; (5) itens opcionais.

---

## 7. Regras Estritas (Constraints)

**Código**
- **Nunca usar `any`** no TypeScript (nem `as any`). Use tipos gerados em `types/database.ts`, `unknown` com *narrowing* ou Zod.
- `strict: true` sempre ligado. Sem `// @ts-ignore` e sem `// @ts-expect-error` sem justificativa em comentário.
- **Apenas componentes funcionais.** Sem componentes de classe.
- Server Components por padrão; `"use client"` somente quando necessário e o mais baixo possível na árvore.
- Toda entrada de Server Action é validada com Zod antes de uso.
- Não duplicar a regra de risco fora da view `tasks_with_risk` e de `lib/risk.ts`.

**Banco e segurança**
- **Não alterar configuração de banco sem avisar**: migrations, RLS, funções, triggers, extensões e configurações do projeto Supabase. Mostre o SQL e aguarde confirmação antes de aplicar.
- Nunca desativar RLS, nem "temporariamente".
- Nunca importar `lib/supabase/admin.ts` em código que roda no navegador. A service role só existe no servidor.
- Nunca confiar em `role`, `manager_id` ou qualquer permissão vinda do cliente.
- Nunca versionar segredos. Usar `.env.local` e manter `.env.example` sem valores.
- Nenhuma operação destrutiva (apagar tabelas, dados, histórico do Git) sem confirmação explícita.

**Escopo e dependências**
- **Não implementar nada da lista "Fora do escopo"** (seção 1).
- Não introduzir NestJS, outro backend, ORM adicional ou React Native.
- Não adicionar dependências novas sem avisar e justificar. Prefira o que já está na stack.
- Não refatorar código fora da tarefa pedida. Se achar um problema fora do escopo, aponte em vez de corrigir.

**UI/UX**
- Seguir as diretrizes visuais da seção 3.4. Sem sombras pesadas, gradientes decorativos ou animações que atrasem o uso.
- Todo texto de interface em pt-BR; datas exibidas em `America/Sao_Paulo`.
- Respeitar `prefers-reduced-motion` e requisitos básicos de acessibilidade.

**Forma de trabalhar**
- Antes de uma mudança grande, explique o plano em poucas linhas e aguarde confirmação.
- Entregas em passos pequenos, com commits descritivos e um critério de teste para cada passo.
- Se uma instrução deste arquivo conflitar com a tarefa pedida, **pare e pergunte** em vez de escolher sozinho.
- Prazo curto (09/10/2026): priorize o caminho que faz a demo funcionar. Funcionar vem antes de polir.