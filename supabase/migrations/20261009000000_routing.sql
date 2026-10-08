-- Expedito: roteirização (meio de transporte, base de saída e ordem das visitas).
-- Aplicar colando no SQL Editor do Supabase. Roda em uma transação única.
-- Não altera RLS: as novas colunas de profiles só são gravadas pelo servidor
-- (service role, depois de conferir o gestor); route_* em tasks segue a política
-- tasks_manager_all (só o gestor dono grava; o campo só lê as suas).

begin;

create type transport_mode as enum ('transit', 'motorcycle', 'car');

alter table profiles
  add column transport_mode transport_mode,           -- só para role = 'field'
  add column base_address   text,                     -- só para role = 'manager'
  add column route_manual   boolean not null default false; -- gestor reordenou à mão

alter table tasks
  add column route_position integer,  -- ordem da visita no roteiro do responsável
  add column route_reason   text;     -- motivo curto da posição (gerado pela IA)

-- Usuários de campo já existentes começam como transporte público / a pé.
update profiles set transport_mode = 'transit' where role = 'field' and transport_mode is null;

commit;
