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
1. Login funcional com os dois perfis. O gestor cria os usuários de campo.
2. Cadastro de agências (nome, endereço, horário de atendimento, exigências).
3. Cadastro de tarefas (agência, documento/BL, prazo, urgência, responsável, status).
4. Painel do gestor com destaque para tarefas **atrasadas** e **em risco**.
5. Tela de campo (mobile web): lista do dia, mudar status, registrar ocorrência.

**Se sobrar tempo:** contadores de atrasos e ocorrências por agência; ordenação sugerida das visitas por prazo e horário da agência.

**Fora do escopo (não implementar):** recuperação de senha, login social, notificações push, rotas com trânsito, rastreamento de localização, integrações externas, módulo financeiro, app nativo (React Native), multiempresa compartilhada, base de agências compartilhada.

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
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas) e `SUPABASE_SERVICE_ROLE_KEY` (**somente servidor**).

---

## 3. Padrões de Arquitetura e UI/UX

### 3.1 Estrutura de pastas

```
expedito/
├── supabase/
│   └── migrations/              # SQL versionado (única fonte de verdade do schema)
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Página de login
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

### 3.4 Diretrizes visuais

- **Minimalista e editorial:** muito espaço em branco, poucos elementos por tela, hierarquia clara, sem decoração gratuita.
- **Tipografia estruturada:** par de fontes via `next/font` (sugestão: uma serifada editorial para títulos, como Fraunces ou Newsreader, e uma sans neutra para interface, como Inter). Escala tipográfica definida em tokens do Tailwind; títulos grandes com contraste de peso, rótulos pequenos em caixa alta com espaçamento entre letras.
- **Cores:** base neutra (off-white e grafite). Uma única cor de destaque. Cores de estado usadas **apenas** para risco: atrasada (vermelho contido), em risco (âmbar), no prazo (neutro ou verde discreto). Nunca depender só da cor: acompanhar de texto ou ícone.
- **Componentes:** linhas e bordas finas em vez de sombras pesadas; cartões planos; tabelas limpas no desktop.
- **Animação fluida e discreta** (Motion): transições de entrada em 150 a 250 ms, easing suave, mudança de status com transição de layout, sem animações que atrasem o uso. Respeitar `prefers-reduced-motion`.
- **Mobile-first na tela de campo:** alvos de toque grandes (mínimo 44 px), ações principais (iniciar, concluir, ocorrência) alcançáveis com o polegar, atualização de status em no máximo 2 toques.
- **Painel do gestor:** otimizado para desktop, com lista do dia agrupada por status e destaque imediato para atrasadas e em risco.
- **Acessibilidade:** contraste adequado, foco visível, rótulos em formulários, navegação por teclado.

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

Cadastro público cria **sempre** um gestor. O papel nunca vem de metadados enviados pelo cliente. Usuários de campo são criados somente no servidor (service role) pela Server Action da equipe, que depois insere o perfil `field` com o `manager_id` correto.

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
| Migrations aplicadas | `..._init.sql` sim; `..._tasks_same_owner.sql` proposta, não aplicada |
| Login com perfis | Sim: login, cadastro de gestor, logout, redirecionamento e criação de campo (testado local) |
| Deploy na Vercel | Não |
| Cadastros, painel e tela de campo | Não |
| Cenário simulado de dados (seed) | Não |

---

## 6. Objetivo Imediato

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
- [ ] A URL publicada abre a tela de login.
- [ ] Um gestor se cadastra, entra e cai em `/painel`.
- [ ] O gestor cria um usuário de campo, que entra e cai em `/hoje`.
- [ ] **Teste de isolamento:** com dois gestores, um não consegue ver agências ou tarefas do outro (verificar também direto pela API).
- [ ] Usuário de campo não acessa rotas do gestor.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle do cliente.
- [ ] `tsc --noEmit` e o lint passam sem erros.

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