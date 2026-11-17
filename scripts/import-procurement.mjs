// Импорт на договори и анекси от отворените данни на ЦАИС ЕОП (storage.eop.bg) в Supabase.
// Пуска се от GitHub Actions. Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY.
//
// По подразбиране продължава от последния внесен ден (таблица proc_import_state)
// и внася най-много MAX_DAYS дни на едно пускане, за да не изтече времето на задачата.
// Ръчно: node scripts/import-procurement.mjs 2025-01-01 2025-03-31

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");

const START = "2025-01-01";               // откъдето започва историята при първото пускане
const MAX_DAYS = Number(process.env.MAX_DAYS ?? 250);
const EOP = "https://storage.eop.bg";

const HEAD = { apikey: KEY, "Content-Type": "application/json" };

const fileKey = (kind, day) => {
  const [y, m, d] = day.split("-");
  return `Автоматично генерирани данни за ${kind}, публикувани в ЦАИС ЕОП на ${d}.${m}.${y}.json`;
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const date = (v) => {
  const m = String(v ?? "").match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const list = (v) => (v ? String(v).split(";").map((s) => s.trim()).filter(Boolean) : []);
const yes = (v) => (v === "Да" ? true : v === "Не" ? false : null);
const int = (v) => (v === null || v === undefined || v === "" ? null : Number.parseInt(v, 10));

function contractRow(r) {
  return {
    id: `${r.noticeId}|${r.lotIdentifier ?? ""}|${r.contractNumber ?? ""}`,
    notice_id: r.noticeId,
    published_at: r.publicationDate,
    unp: r.uniqueProcurementNumber,
    tender_id: r.tenderId,
    tender_name: r.tenderName,
    procedure_type: r.procedureType || null,
    legal_basis: r.legalBasis || null,
    award_method: r.awardMethod || null,
    cpv: r.tenderMainCpv,
    cpv_desc: r.tenderMainCpvDescription,
    contract_type: r.typeOfContract,
    estimated_value: num(r.estimatedValue),
    currency: r.currency,
    buyer_eik: r.buyerRegistryNumber,
    buyer_name: r.buyerName,
    buyer_type: r.buyerType,
    lot: r.lotIdentifier,
    contract_number: r.contractNumber,
    contract_date: date(r.contractDate),
    contract_value: num(r.contractValue),
    contract_currency: r.contractCurrency,
    supplier_eiks: list(r.supplierRegisterNumber),
    supplier_names: list(r.supplierName),
    supplier_nuts: list(r.supplierNutsCode),
    awarded_to_group: yes(r.awardedToGroup),
    has_subcontractors: yes(r.hasSubcontractors),
    subcontractor_names: r.subcontractorName,
    subcontractor_eiks: r.subcontractorRegistryNumber,
    subcontracting_percent: r.subcontractingPercent == null ? null : String(r.subcontractingPercent),
    subcontracting_amount: r.subcontractingAmount == null ? null : String(r.subcontractingAmount),
    is_eu_funded: yes(r.isEuFunded),
    eu_program: r.europeanProgram || null,
    is_framework: yes(r.isFrameworkAgreement),
    direct_award_justification: r.directAwardJustification || null,
    offers_count: int(r.offersCount),
    sme_offers_count: int(r.smeOffersCount),
    disqualified_offers_count: int(r.disqualifiedOffersCount),
    contract_period_days: int(r.contractPeriod),
    ted_link: r.linkToOjEu || null,
  };
}

function annexRow(r) {
  return {
    id: `${r.noticeId}|${r.lotIdentifier ?? ""}|${r.contractNumber ?? ""}`,
    notice_id: r.noticeId,
    published_at: r.publicationDate,
    unp: r.uniqueProcurementNumber,
    tender_id: r.tenderId,
    tender_name: r.tenderName,
    contract_type: r.typeOfContract,
    buyer_eik: r.buyerRegistryNumber,
    buyer_name: r.buyerName,
    buyer_type: r.buyerType,
    lot: r.lotIdentifier,
    contract_number: r.contractNumber,
    contract_date: date(r.contractDate),
    last_value: num(r.lastContractValue),
    current_value: num(r.currentContractValue),
    value_difference: num(r.contractValueDifference),
    currency: r.contractCurrency,
    supplier_eiks: list(r.supplierRegisterNumber),
    supplier_names: list(r.supplierName),
    is_eu_funded: yes(r.isEuFunded),
    eu_program: r.europeanProgram || null,
    change_description: r.changeDescription || null,
  };
}

async function fetchDay(kind, day) {
  const url = `${EOP}/open-data-${day}/${encodeURIComponent(fileKey(kind, day))}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js = JSON.parse((await res.text()).replace(/^﻿/, ""));
      return Array.isArray(js) ? js : [];
    } catch (e) {
      if (i === 3) throw new Error(`${kind} ${day}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function upsert(table, rows) {
  const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: { ...HEAD, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(unique.slice(i, i + 500)),
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  }
  return unique.length;
}

async function getState() {
  const res = await fetch(`${URL_}/rest/v1/proc_import_state?feed=eq.eop&select=last_day`, { headers: HEAD });
  if (!res.ok) throw new Error(`state: HTTP ${res.status} ${await res.text()}`);
  return (await res.json())[0]?.last_day ?? null;
}
async function setState(day) {
  const res = await fetch(`${URL_}/rest/v1/proc_import_state?on_conflict=feed`, {
    method: "POST",
    headers: { ...HEAD, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ feed: "eop", last_day: day, updated_at: new Date().toISOString() }]),
  });
  if (!res.ok) throw new Error(`state: HTTP ${res.status} ${await res.text()}`);
}

const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);

let [from, to] = process.argv.slice(2);
const manual = Boolean(from);
if (!from) {
  const last = await getState();
  from = last ? addDays(last, 1) : START;
}
to = to ?? yesterday;

let day = from, done = 0, nC = 0, nA = 0;
while (day <= to && done < MAX_DAYS) {
  const [c, a] = await Promise.all([fetchDay("договори", day), fetchDay("анекси", day)]);
  nC += await upsert("proc_contracts", c.map(contractRow));
  nA += await upsert("proc_annexes", a.map(annexRow));
  if (!manual) await setState(day);
  if (done % 20 === 0) console.log(`${day}: ${c.length} договора, ${a.length} анекса`);
  day = addDays(day, 1);
  done++;
}
console.log(`Готово: ${done} дни, ${nC} договора, ${nA} анекса. Последен ден: ${addDays(day, -1)}`);
