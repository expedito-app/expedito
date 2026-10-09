-- Expedito: roteirização e correção da assinatura ao reabrir pelo gestor.
-- Aplicar colando no SQL Editor do Supabase ANTES de publicar o código desta
-- versão. Roda em uma transação única. Não altera nenhuma política de RLS.

begin;

-- 1. Meio de transporte de cada usuário de campo (velocidade estimada da rota).
--    transit = ônibus/a pé, motorcycle = moto, car = carro.
create type transport_mode as enum ('transit', 'motorcycle', 'car');

alter table profiles
  add column transport_mode transport_mode not null default 'transit';

-- 2. Coordenadas da agência (preenchidas pelo endereço ou à mão), para
--    calcular a distância entre as visitas. Ou as duas, ou nenhuma.
alter table agencies
  add column latitude  double precision check (latitude  between -90  and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add constraint agencies_coords_pair check ((latitude is null) = (longitude is null));

-- 3. Gestor reabriu uma tarefa concluída (status saiu de "done") pelo formulário:
--    a assinatura da conclusão antiga não vale mais. task_signatures continua
--    sem política de escrita; o gestor só apaga por esta função, e só a
--    assinatura de tarefa dele que NÃO está concluída.
create function manager_clear_task_signature(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from task_signatures s
   using tasks t
   where s.task_id = p_task_id
     and t.id = s.task_id
     and t.manager_id = auth.uid()
     and t.status <> 'done';
end $$;

revoke all on function manager_clear_task_signature(uuid) from public, anon;
grant execute on function manager_clear_task_signature(uuid) to authenticated;

commit;
