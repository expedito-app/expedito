-- PROPOSTA (ainda não aplicada): fecha a brecha encontrada no teste de isolamento.
-- Hoje a política tasks_manager_all confere apenas manager_id, então um gestor
-- consegue criar/editar tarefa usando a agência ou o usuário de campo de OUTRO
-- gestor, e o campo alheio passa a ver essa tarefa.
-- Aqui o banco passa a exigir que agency_id e assigned_to pertençam ao gestor.

begin;

drop policy tasks_manager_all on tasks;

create policy tasks_manager_all on tasks for all to authenticated
  using (manager_id = auth.uid())
  with check (
    manager_id = auth.uid()
    and exists (
      select 1 from agencies a
      where a.id = agency_id and a.manager_id = auth.uid()
    )
    and (
      assigned_to is null
      or exists (
        select 1 from profiles p
        where p.id = assigned_to and p.role = 'field' and p.manager_id = auth.uid()
      )
    )
  );

commit;
