// Национална класация на риска в обществените поръчки: червени флагове за всеки договор
// (същите правила като lib/redFlags.ts), обобщени по възложител, изпълнител, година и област.
// Пуска се от GitHub Actions. Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY. Записва data/risk.json.
import { readFileSync, writeFileSync } from "node:fs";
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const HEAD = { apikey: KEY };
const pol = JSON.parse(readFileSync("data/political-links.json", "utf8")).byEik;
const BGN = 1.95583, TH = { works: 270000 / BGN, other: 70000 / BGN };
const NO_COMP = /договаряне без|пряко договаряне|без предварително обявление|без публикуване/i;

async function all(table, select) {
  const out = [];
  for (let last = ""; ;) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=${select}&order=id&limit=1000${last ? `&id=gt.${encodeURIComponent(last)}` : ""}`, { headers: HEAD });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status} ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
    last = rows[rows.length - 1].id;
  }
}
const C = await all("proc_contracts", "id,buyer_eik,buyer_name,supplier_eiks,supplier_names,tender_name,contract_number,contract_date,contract_type,procedure_type,offers_count,disqualified_offers_count,estimated_value_eur,contract_value_eur,has_subcontractors,subcontracting_percent");
const A = await all("proc_annexes", "id,buyer_eik,contract_number,value_difference_eur");
const B = await all("proc_buyers", "eik,municipality,municipality_code,oblast,level");
const buyerInfo = new Map(B.map((b) => [b.eik, b]));
const added = new Map();
for (const a of A) { const k = `${a.buyer_eik}|${a.contract_number}`; added.set(k, (added.get(k) ?? 0) + Math.max(0, a.value_difference_eur ?? 0)); }

function flags(c) {
  const f = [], v = c.contract_value_eur ?? 0, est = c.estimated_value_eur ?? 0;
  if (c.offers_count === 1) f.push(["single", 25]);
  if (c.procedure_type && NO_COMP.test(c.procedure_type)) f.push(["direct", 20]);
  if (est > 0 && v > est * 1.05) f.push(["over", 10]);
  if (est > 0 && c.offers_count === 1 && v >= est * 0.97 && v <= est * 1.0001) f.push(["exact", 10]);
  const ad = added.get(`${c.buyer_eik}|${c.contract_number}`) ?? 0;
  if (v > 0 && ad / v > 0.1) f.push(["annex", ad / v > 0.3 ? 20 : 12]);
  if ((c.disqualified_offers_count ?? 0) > 0 && (c.offers_count ?? 0) - (c.disqualified_offers_count ?? 0) <= 1) f.push(["disq", 15]);
  const th = /строител|works/i.test(c.contract_type ?? "") ? TH.works : TH.other;
  if (v > th * 0.9 && v < th) f.push(["threshold", 10]);
  if ((c.supplier_eiks ?? []).some((e) => pol[e]?.length)) f.push(["political", 20]);
  if (c.has_subcontractors && Number(String(c.subcontracting_percent ?? "").replace(",", ".")) >= 50) f.push(["sub", 8]);
  return f;
}
const scored = C.map((c) => { const f = flags(c); return { c, f: f.map((x) => x[0]), s: Math.min(100, f.reduce((a, x) => a + x[1], 0)) }; });

const agg = (keyFn, nameFn) => {
  const m = new Map();
  for (const x of scored) for (const k of [].concat(keyFn(x.c))) {
    if (!k) continue;
    const e = m.get(k) ?? { key: k, name: nameFn(x.c, k), n: 0, value: 0, risky: 0, riskyValue: 0, single: 0, political: 0, scoreSum: 0 };
    const v = x.c.contract_value_eur ?? 0;
    e.n++; e.value += v; e.scoreSum += x.s;
    if (x.s >= 45) { e.risky++; e.riskyValue += v; }
    if (x.f.includes("single")) e.single++;
    if (x.f.includes("political")) e.political++;
    m.set(k, e);
  }
  return [...m.values()].map((e) => ({ ...e, value: Math.round(e.value), riskyValue: Math.round(e.riskyValue), avg: Math.round(e.scoreSum / e.n), scoreSum: undefined }));
};
const buyers = agg((c) => c.buyer_eik, (c) => c.buyer_name).filter((b) => b.n >= 20).map((b) => ({ ...b, ...(buyerInfo.get(b.key) ? { muni: buyerInfo.get(b.key).municipality, muniCode: buyerInfo.get(b.key).municipality_code, oblast: buyerInfo.get(b.key).oblast, level: buyerInfo.get(b.key).level } : {}) }));
const suppliers = agg((c) => c.supplier_eiks ?? [], (c, k) => c.supplier_names?.[(c.supplier_eiks ?? []).indexOf(k)] ?? k).filter((s) => s.n >= 5);
const years = agg((c) => (c.contract_date ?? "").slice(0, 4), (c, k) => k).filter((y) => y.key >= "2020").sort((a, b) => (a.key < b.key ? -1 : 1));
const oblasts = agg((c) => buyerInfo.get(c.buyer_eik)?.oblast, (c, k) => k);
const flagCount = {};
for (const x of scored) for (const f of x.f) flagCount[f] = (flagCount[f] ?? 0) + 1;
const top = scored.filter((x) => (x.c.contract_value_eur ?? 0) >= 50000 && x.s >= 45).sort((a, b) => b.s - a.s || (b.c.contract_value_eur ?? 0) - (a.c.contract_value_eur ?? 0)).slice(0, 300)
  .map(({ c, f, s }) => ({ id: c.id, buyer: c.buyer_name, buyerEik: c.buyer_eik, number: c.contract_number, suppliers: c.supplier_names, supplierEiks: c.supplier_eiks, title: c.tender_name, date: c.contract_date, value: Math.round(c.contract_value_eur ?? 0), flags: f, score: s }));

writeFileSync("data/risk.json", JSON.stringify({
  updated: new Date().toISOString().slice(0, 10), total: C.length, annexes: A.length,
  from: C.reduce((m, c) => (c.contract_date && c.contract_date < m ? c.contract_date : m), "9999"), flagCount,
  byScore: { high: scored.filter((x) => x.s >= 45).length, mid: scored.filter((x) => x.s >= 20 && x.s < 45).length, low: scored.filter((x) => x.s > 0 && x.s < 20).length, none: scored.filter((x) => x.s === 0).length },
  years, oblasts: oblasts.sort((a, b) => b.avg - a.avg),
  buyers: buyers.sort((a, b) => b.riskyValue - a.riskyValue).slice(0, 400),
  suppliers: suppliers.sort((a, b) => b.riskyValue - a.riskyValue).slice(0, 400),
  top,
}));
console.log(`Риск: ${C.length} договора, висок риск: ${scored.filter((x) => x.s >= 45).length}`);
