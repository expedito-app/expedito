-- Expedito: schema inicial (CLAUDE.md, seções 4.2 a 4.5)
-- Aplicar colando no SQL Editor do Supabase. Roda em uma transação única.

begin;

-- 4.2 Tipos e tabelas -------------------------------------------------------

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

create index tasks_manager_due_idx     on tasks (manager_id, due_at);
create index tasks_assignee_status_idx on tasks (assigned_to, status);
create index agencies_manager_idx      on agencies (manager_id);
create index occurrences_task_idx      on task_occurrences (task_id);

-- 4.3 Criação de perfil no cadastro (sempre gestor) --------------------------

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

-- 4.4 Funções auxiliares e RLS ----------------------------------------------

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

-- Campo não tem UPDATE em tasks: muda status somente por esta função.
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

-- 4.5 View de risco (fonte da regra) -----------------------------------------

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

commit;
