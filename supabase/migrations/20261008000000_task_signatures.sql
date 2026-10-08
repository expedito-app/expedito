-- Expedito: assinatura obrigatória na conclusão da tarefa pelo campo.
-- Aplicar colando no SQL Editor do Supabase. Roda em uma transação única.

begin;

-- Uma assinatura por tarefa (a da conclusão vigente).
create table task_signatures (
  task_id     uuid primary key references tasks(id) on delete cascade,
  manager_id  uuid not null references profiles(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  signer_name text not null check (char_length(signer_name) between 1 and 120),
  -- PNG do desenho em data URL; limite de tamanho para não inflar o banco.
  image       text not null check (
    image like 'data:image/png;base64,%' and char_length(image) <= 200000
  ),
  signed_at   timestamptz not null default now()
);

alter table task_signatures enable row level security;

-- Leitura: gestor vê as suas; campo vê as que coletou.
-- Sem INSERT/UPDATE/DELETE direto: a gravação passa só pela função abaixo.
create policy signatures_manager_select on task_signatures for select to authenticated
  using (manager_id = auth.uid());
create policy signatures_field_select on task_signatures for select to authenticated
  using (author_id = auth.uid());

-- Conclui a tarefa e grava a assinatura numa só operação.
create function field_complete_task_with_signature(
  p_task_id uuid,
  p_signer_name text,
  p_image text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_manager_id uuid;
begin
  update tasks
     set status       = 'done',
         updated_at   = now(),
         completed_at = now()
   where id = p_task_id and assigned_to = auth.uid() and status <> 'done'
  returning manager_id into v_manager_id;
  if not found then
    raise exception 'Tarefa não encontrada, já concluída ou não atribuída a você';
  end if;

  insert into task_signatures (task_id, manager_id, author_id, signer_name, image)
  values (p_task_id, v_manager_id, auth.uid(), btrim(p_signer_name), p_image)
  on conflict (task_id) do update
     set author_id   = excluded.author_id,
         signer_name = excluded.signer_name,
         image       = excluded.image,
         signed_at   = now();
end $$;

revoke all on function field_complete_task_with_signature(uuid, text, text) from public, anon;
grant execute on function field_complete_task_with_signature(uuid, text, text) to authenticated;

-- A função de status do campo deixa de concluir (concluir exige assinatura).
-- Reabrir uma tarefa (ex.: "Desfazer") apaga a assinatura da conclusão desfeita.
-- create or replace mantém os grants existentes.
create or replace function field_update_task_status(p_task_id uuid, p_status task_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status = 'done' then
    raise exception 'Para concluir, colete a assinatura';
  end if;

  update tasks
     set status       = p_status,
         updated_at   = now(),
         completed_at = null
   where id = p_task_id and assigned_to = auth.uid();
  if not found then
    raise exception 'Tarefa não encontrada ou não atribuída a você';
  end if;

  delete from task_signatures where task_id = p_task_id;
end $$;

commit;
