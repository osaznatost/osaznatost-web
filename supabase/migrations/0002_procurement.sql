-- Обществени поръчки от отворените данни на ЦАИС ЕОП (storage.eop.bg): договори и анекси.
-- Записва ги ботът в GitHub Actions с тайния ключ; сайтът само чете.

create table if not exists proc_contracts (
  id text primary key,                    -- noticeId|lot|contractNumber
  notice_id bigint,
  published_at timestamptz,
  unp text,                               -- уникален номер на поръчката
  tender_id bigint,
  tender_name text,
  procedure_type text,
  legal_basis text,
  award_method text,
  cpv text,
  cpv_desc text,
  contract_type text,                     -- Строителство / Доставки / Услуги
  estimated_value numeric,                -- прогнозна стойност (не е похарчена сума)
  currency text,
  buyer_eik text,
  buyer_name text,
  buyer_type text,
  lot text,
  contract_number text,
  contract_date date,
  contract_value numeric,
  contract_currency text,
  supplier_eiks text[],
  supplier_names text[],
  supplier_nuts text[],
  awarded_to_group boolean,
  has_subcontractors boolean,
  subcontractor_names text,
  subcontractor_eiks text,
  subcontracting_percent text,
  subcontracting_amount text,
  is_eu_funded boolean,
  eu_program text,
  is_framework boolean,
  direct_award_justification text,
  offers_count int,
  sme_offers_count int,
  disqualified_offers_count int,
  contract_period_days int,
  ted_link text,
  imported_at timestamptz default now()
);
create index if not exists proc_contracts_buyer on proc_contracts (buyer_eik);
create index if not exists proc_contracts_suppliers on proc_contracts using gin (supplier_eiks);
create index if not exists proc_contracts_date on proc_contracts (contract_date desc);
create index if not exists proc_contracts_number on proc_contracts (contract_number);
create index if not exists proc_contracts_tender on proc_contracts (tender_id);

create table if not exists proc_annexes (
  id text primary key,                    -- noticeId|lot|contractNumber
  notice_id bigint,
  published_at timestamptz,
  unp text,
  tender_id bigint,
  tender_name text,
  contract_type text,
  buyer_eik text,
  buyer_name text,
  buyer_type text,
  lot text,
  contract_number text,
  contract_date date,
  last_value numeric,
  current_value numeric,
  value_difference numeric,
  currency text,
  supplier_eiks text[],
  supplier_names text[],
  is_eu_funded boolean,
  eu_program text,
  change_description text,
  imported_at timestamptz default now()
);
create index if not exists proc_annexes_number on proc_annexes (contract_number);
create index if not exists proc_annexes_buyer on proc_annexes (buyer_eik);
create index if not exists proc_annexes_suppliers on proc_annexes using gin (supplier_eiks);

-- Докъде е стигнал импортът (по ден).
create table if not exists proc_import_state (
  feed text primary key,
  last_day date,
  updated_at timestamptz default now()
);

-- Обобщение по изпълнител: колко договора, за колко, при колко възложители, колко с една оферта.
create or replace view proc_supplier_stats as
select
  s.eik,
  max(s.name) as name,
  count(*) as contracts,
  sum(c.contract_value) filter (where c.contract_currency = 'EUR') as total_eur,
  count(distinct c.buyer_eik) as buyers,
  count(*) filter (where c.offers_count = 1) as single_offer,
  min(c.contract_date) as first_date,
  max(c.contract_date) as last_date
from proc_contracts c
cross join lateral unnest(c.supplier_eiks, c.supplier_names) as s(eik, name)
group by s.eik;

-- Обобщение по възложител.
create or replace view proc_buyer_stats as
select
  buyer_eik as eik,
  max(buyer_name) as name,
  max(buyer_type) as buyer_type,
  count(*) as contracts,
  sum(contract_value) filter (where contract_currency = 'EUR') as total_eur,
  count(*) filter (where offers_count = 1) as single_offer
from proc_contracts
group by buyer_eik;

alter table proc_contracts enable row level security;
alter table proc_annexes enable row level security;
alter table proc_import_state enable row level security;
drop policy if exists "public read" on proc_contracts;
drop policy if exists "public read" on proc_annexes;
drop policy if exists "public read" on proc_import_state;
create policy "public read" on proc_contracts for select using (true);
create policy "public read" on proc_annexes for select using (true);
create policy "public read" on proc_import_state for select using (true);

-- Изгледите се изпълняват с правата на питащия (за да важат правилата за четене).
alter view proc_supplier_stats set (security_invoker = true);
alter view proc_buyer_stats set (security_invoker = true);
