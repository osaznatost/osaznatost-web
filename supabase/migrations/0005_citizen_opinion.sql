-- Мнение на гражданите по законите (За / Против / Не знам).
-- Не пазим имейли. Пазим само необратими отпечатъци (HMAC с тайна „пипер“, която е само на сървъра):
--  • cv_codes: отпечатък на имейла + отпечатък на кода, за 15 минути, после редът се трие;
--  • cv_votes: отпечатък на гласуващия, различен за всеки закон, затова гласовете на един човек по различни
--    закони не могат да се свържат помежду си, дори при изтичане на базата.
-- Достъп само със сървърния (secret) ключ: RLS е включен и няма публични правила.
create table if not exists cv_codes (
  email_hash text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now(),
  sends_hour int not null default 1
);
create table if not exists cv_sends (
  day date primary key,
  n int not null default 0
);
create table if not exists cv_votes (
  item text not null,
  voter text not null,
  choice smallint not null check (choice in (-1, 0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item, voter)
);
create index if not exists cv_votes_item on cv_votes (item);
alter table cv_codes enable row level security;
alter table cv_sends enable row level security;
alter table cv_votes enable row level security;

create or replace view cv_totals with (security_invoker = true) as
select item,
  count(*) filter (where choice = 1)  as za,
  count(*) filter (where choice = -1) as protiv,
  count(*) filter (where choice = 0)  as ne_znam,
  count(*) as total
from cv_votes group by item;

-- Брояч на изпратените писма за деня (лимит на безплатния план за имейли).
create or replace function cv_count_send(d date) returns int language sql as $$
  insert into cv_sends (day, n) values (d, 1)
  on conflict (day) do update set n = cv_sends.n + 1
  returning n;
$$;
revoke all on function cv_count_send(date) from public, anon, authenticated;
grant execute on function cv_count_send(date) to service_role;
