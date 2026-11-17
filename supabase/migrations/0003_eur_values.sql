-- Стойности в евро: договорите до края на 2025 г. са предимно в лева (фиксиран курс 1,95583).
alter table proc_contracts add column if not exists contract_value_eur numeric;
alter table proc_contracts add column if not exists estimated_value_eur numeric;
alter table proc_annexes add column if not exists last_value_eur numeric;
alter table proc_annexes add column if not exists current_value_eur numeric;
alter table proc_annexes add column if not exists value_difference_eur numeric;

update proc_contracts set
  contract_value_eur = case contract_currency when 'EUR' then contract_value when 'BGN' then round(contract_value / 1.95583, 2) end,
  estimated_value_eur = case currency when 'EUR' then estimated_value when 'BGN' then round(estimated_value / 1.95583, 2) end;
update proc_annexes set
  last_value_eur = case currency when 'EUR' then last_value when 'BGN' then round(last_value / 1.95583, 2) end,
  current_value_eur = case currency when 'EUR' then current_value when 'BGN' then round(current_value / 1.95583, 2) end,
  value_difference_eur = case currency when 'EUR' then value_difference when 'BGN' then round(value_difference / 1.95583, 2) end;

create index if not exists proc_contracts_value_eur on proc_contracts (contract_value_eur desc nulls last);
create index if not exists proc_annexes_diff_eur on proc_annexes (value_difference_eur desc nulls last);

drop view if exists proc_supplier_stats;
create view proc_supplier_stats with (security_invoker = true) as
select
  s.eik,
  max(s.name) as name,
  count(*) as contracts,
  sum(c.contract_value_eur) as total_eur,
  count(distinct c.buyer_eik) as buyers,
  count(*) filter (where c.offers_count = 1) as single_offer,
  min(c.contract_date) as first_date,
  max(c.contract_date) as last_date
from proc_contracts c
cross join lateral unnest(c.supplier_eiks, c.supplier_names) as s(eik, name)
where s.eik is not null and s.eik <> ''
group by s.eik;

drop view if exists proc_buyer_stats;
create view proc_buyer_stats with (security_invoker = true) as
select
  buyer_eik as eik,
  max(buyer_name) as name,
  max(buyer_type) as buyer_type,
  count(*) as contracts,
  sum(contract_value_eur) as total_eur,
  count(*) filter (where offers_count = 1) as single_offer
from proc_contracts
group by buyer_eik;
