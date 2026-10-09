-- Expedito: empresa e endereço-base do gestor (ponto de saída das rotas).
-- Aplicar colando no SQL Editor do Supabase ANTES de publicar o código desta
-- versão. Roda em uma transação única. Não altera nenhuma política de RLS.

begin;

-- Só faz sentido para gestor; o campo herda a base do seu gestor.
alter table profiles
  add column company_name   text check (char_length(company_name) between 2 and 120),
  add column base_address   text check (char_length(base_address) between 5 and 240),
  add column base_latitude  double precision check (base_latitude  between -90  and 90),
  add column base_longitude double precision check (base_longitude between -180 and 180),
  add constraint profiles_base_pair check ((base_latitude is null) = (base_longitude is null));

-- O usuário de campo não lê o perfil do gestor (RLS). Esta função devolve só
-- a empresa e a base do dono dos dados do usuário logado (o próprio gestor,
-- ou o gestor do campo), para a rota sair do lugar certo.
create function current_base()
returns table (
  company_name   text,
  base_address   text,
  base_latitude  double precision,
  base_longitude double precision
)
language sql stable security definer set search_path = public as $$
  select p.company_name, p.base_address, p.base_latitude, p.base_longitude
    from profiles p
   where p.id = current_owner_id()
$$;

revoke all on function current_base() from public, anon;
grant execute on function current_base() to authenticated;

commit;
