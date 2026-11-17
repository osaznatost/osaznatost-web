-- Osaznatost: начална схема
-- Публично четене за всички таблици; писане само със service role (cron задачите).

create table sources (
  id bigint generated always as identity primary key,
  publisher text not null,
  title text not null,
  url text not null,
  published_at date,
  fetched_at timestamptz default now(),
  kind text not null check (kind in ('official','eu','media','other')),
  raw_path text
);

create table params (
  key text primary key,
  value numeric not null,
  unit text,
  valid_from date not null,
  source_id bigint references sources(id),
  note text
);

create table series (
  id text primary key,
  title text not null,
  unit text not null,
  frequency text,
  description text,
  source_id bigint references sources(id)
);

create table data_points (
  series_id text references series(id) on delete cascade,
  period text not null,
  geo text not null default 'BG',
  value numeric,
  status text,
  primary key (series_id, period, geo)
);

create table parties (id bigint generated always as identity primary key, name text not null, short_name text, founded date, ideology_stated text, website text);
create table people (id bigint generated always as identity primary key, full_name text not null, parliament_id text unique, birth_year int, photo_url text);
create table memberships (person_id bigint references people(id), party_id bigint references parties(id), role text, from_date date, to_date date);
create table assemblies (id int primary key, start_date date, end_date date);
create table bills (id bigint generated always as identity primary key, assembly_id int references assemblies(id), parliament_ref text, title text, sponsors text, submitted_at date, motives_url text, impact_assessment boolean, public_consultation_url text);
create table votings (id bigint generated always as identity primary key, assembly_id int references assemblies(id), bill_id bigint references bills(id), held_at timestamptz, subject text, reading text, result text, yes int, no int, abstain int, source_id bigint references sources(id));
create table vote_records (voting_id bigint references votings(id) on delete cascade, person_id bigint references people(id), party_id bigint references parties(id), vote text check (vote in ('yes','no','abstain','absent','present_not_voting')), primary key (voting_id, person_id));
create table arguments (id bigint generated always as identity primary key, bill_id bigint references bills(id), side text check (side in ('pro','con')), who_benefits text, text text not null, source_id bigint references sources(id));
create table flags (id bigint generated always as identity primary key, bill_id bigint references bills(id), voting_id bigint references votings(id), rule text not null, details text, source_id bigint references sources(id));

create table promises (id bigint generated always as identity primary key, party_id bigint references parties(id), person_id bigint references people(id), text text not null, made_at date, context text, source_id bigint references sources(id), status text default 'not_started' check (status in ('not_started','in_progress','fulfilled','partly','broken','not_measurable')), assessed_at date);
create table promise_evidence (promise_id bigint references promises(id) on delete cascade, source_id bigint references sources(id), note text);
create table claims (id bigint generated always as identity primary key, person_id bigint references people(id), said_at date, channel text, text text not null, label text not null check (label in ('fact','claim','opinion')), verdict text default 'pending' check (verdict in ('true','mostly_true','misleading','false','unverifiable','opinion','pending')), explanation text, source_id bigint references sources(id));
create table claim_evidence (claim_id bigint references claims(id) on delete cascade, source_id bigint references sources(id), series_id text references series(id), note text);

create table integrity_events (id bigint generated always as identity primary key, person_id bigint references people(id), party_id bigint references parties(id), company_eik text, kind text check (kind in ('conviction','charge','sanction','audit_finding','court_decision','signal')), status text, happened_at date, summary text not null, source_id bigint not null references sources(id));

create table companies (eik text primary key, name text, legal_form text, registered_at date);
create table company_people (eik text references companies(eik), person_name text, person_id bigint references people(id), role text, share numeric, from_date date, to_date date);
create table tenders (ocid text primary key, buyer text, title text, value_eur numeric, procedure text, published_at date, source_id bigint references sources(id));
create table awards (ocid text references tenders(ocid), eik text references companies(eik), value_eur numeric, bidders int, awarded_at date);

-- RLS: всичко е публично за четене
do $$
declare t text;
begin
  foreach t in array array['sources','params','series','data_points','parties','people','memberships','assemblies','bills','votings','vote_records','arguments','flags','promises','promise_evidence','claims','claim_evidence','integrity_events','companies','company_people','tenders','awards']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
