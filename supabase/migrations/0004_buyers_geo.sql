-- Къде се намира всеки възложител: област, община, населено място (по ЕКАТТЕ).
create table if not exists proc_buyers (
  eik text primary key,
  name text,
  buyer_type text,
  level text,            -- държавен / областен / общински / друг публичен
  ekatte text,
  settlement text,
  is_village boolean,
  municipality text,
  municipality_code text,
  oblast text,
  geo_source text,       -- откъде е определено мястото
  updated_at timestamptz default now()
);
create index if not exists proc_buyers_oblast on proc_buyers (oblast);
create index if not exists proc_buyers_muni on proc_buyers (municipality_code);
create index if not exists proc_buyers_ekatte on proc_buyers (ekatte);
alter table proc_buyers enable row level security;
drop policy if exists "public read" on proc_buyers;
create policy "public read" on proc_buyers for select using (true);

create or replace view proc_contracts_geo with (security_invoker = true) as
select c.*, b.level, b.ekatte, b.settlement, b.is_village, b.municipality, b.municipality_code, b.oblast
from proc_contracts c left join proc_buyers b on b.eik = c.buyer_eik;

create or replace view proc_annexes_geo with (security_invoker = true) as
select a.*, b.level, b.ekatte, b.settlement, b.municipality, b.municipality_code, b.oblast
from proc_annexes a left join proc_buyers b on b.eik = a.buyer_eik;

-- Обобщения по място.
create or replace view proc_place_oblast with (security_invoker = true) as
select b.oblast, count(*) as contracts, sum(c.contract_value_eur) as total_eur,
  count(*) filter (where c.offers_count = 1) as single_offer, count(distinct c.buyer_eik) as buyers
from proc_contracts c join proc_buyers b on b.eik = c.buyer_eik
where b.oblast is not null group by b.oblast;

create or replace view proc_place_municipality with (security_invoker = true) as
select b.oblast, b.municipality, b.municipality_code, count(*) as contracts, sum(c.contract_value_eur) as total_eur,
  count(*) filter (where c.offers_count = 1) as single_offer, count(distinct c.buyer_eik) as buyers
from proc_contracts c join proc_buyers b on b.eik = c.buyer_eik
where b.municipality_code is not null group by b.oblast, b.municipality, b.municipality_code;

create or replace view proc_place_settlement with (security_invoker = true) as
select b.municipality_code, b.ekatte, b.settlement, b.is_village, count(*) as contracts, sum(c.contract_value_eur) as total_eur,
  count(*) filter (where c.offers_count = 1) as single_offer
from proc_contracts c join proc_buyers b on b.eik = c.buyer_eik
where b.ekatte is not null group by b.municipality_code, b.ekatte, b.settlement, b.is_village;

-- Изпълнители по община.
create or replace view proc_place_suppliers with (security_invoker = true) as
select b.municipality_code, s.eik, max(s.name) as name, count(*) as contracts, sum(c.contract_value_eur) as total_eur
from proc_contracts c
join proc_buyers b on b.eik = c.buyer_eik
cross join lateral unnest(c.supplier_eiks, c.supplier_names) as s(eik, name)
where b.municipality_code is not null and s.eik <> ''
group by b.municipality_code, s.eik;
