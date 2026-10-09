-- Expedito: premissas do cálculo de "demurrage evitado", por gestor.
-- Aplicar colando no SQL Editor do Supabase ANTES de publicar o código desta
-- versão. Roda em uma transação única. Não altera nenhuma política de RLS
-- (o gestor grava pelo servidor, como a empresa).

begin;

alter table profiles
  -- Diária de demurrage por contêiner, em reais (dry 20' ~US$ 75/dia; reefer até ~US$ 460).
  add column demurrage_daily_brl numeric(10, 2) not null default 500
    check (demurrage_daily_brl > 0 and demurrage_daily_brl <= 100000),
  -- Contêineres por BL, em média.
  add column containers_per_bl numeric(4, 1) not null default 2
    check (containers_per_bl > 0 and containers_per_bl <= 50),
  -- Dias de demurrage que cada atraso gera, em média (conservador: 1).
  add column demurrage_days_per_delay numeric(4, 1) not null default 1
    check (demurrage_days_per_delay > 0 and demurrage_days_per_delay <= 30),
  -- Taxa de atraso antes do Expedito (planilha/WhatsApp), de 0 a 1.
  add column baseline_late_rate numeric(5, 4) not null default 0.25
    check (baseline_late_rate >= 0 and baseline_late_rate < 1);

commit;
