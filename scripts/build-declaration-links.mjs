// Свързва декларираните дружества (data/declarations/<година>.json) с изпълнителите на обществени поръчки.
// Правило (еднакво за всички): името на дружеството в декларацията и името на изпълнителя съвпадат след
// нормализиране (без кавички, правна форма и препинателни знаци). Ако едно име отговаря на повече от една фирма (ЕИК),
// връзката НЕ се показва: не можем да кажем коя е. Сигнал „от собствената институция“: възложителят е
// институцията, в която лицето заема длъжност (същото нормализирано име).
// Пуска се от GitHub Actions. Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY. Пише data/declarations/links.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };
const LAT = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У" };
const FORMS = new Set(["ЕООД", "ООД", "ЕАД", "АД", "ЕТ", "КД", "КДА", "СД", "ДЗЗД", "АДСИЦ", "ЛТД", "ГМБХ"]);
export const normCo = (s) => String(s ?? "").toUpperCase()
  .replace(/[ABCEHKMOPTXY]/g, (c) => LAT[c])               // латински букви, които изглеждат като кирилски
  .replace(/[^0-9A-ZА-ЯЁ]+/g, " ").trim().split(" ").filter((w) => w && !FORMS.has(w)).join(" ");
const normInst = (s) => String(s ?? "").toLowerCase().replace(/["„“”']/g, "").replace(/\s+/g, " ").trim();

// 1) Изпълнители: име → ЕИК-ове, договори, сума, възложители
const sup = new Map(); // eik → {names:Set, n, eur, buyers: Map(eik→{name,n,eur})}
const PAGE = 1000;
for (let off = 0; ; off += PAGE) {
  const r = await fetch(`${URL_}/rest/v1/proc_contracts?select=supplier_eiks,supplier_names,buyer_eik,buyer_name,contract_value_eur,contract_date&order=id&limit=${PAGE}&offset=${off}`, { headers: H });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const rows = await r.json();
  for (const c of rows) {
    (c.supplier_eiks ?? []).forEach((eik, i) => {
      if (!eik) return;
      const s = sup.get(eik) ?? { names: new Set(), n: 0, eur: 0, first: null, last: null, buyers: new Map() };
      if (c.supplier_names?.[i]) s.names.add(c.supplier_names[i]);
      s.n++; s.eur += c.contract_value_eur ?? 0;
      if (c.contract_date) { s.first = !s.first || c.contract_date < s.first ? c.contract_date : s.first; s.last = !s.last || c.contract_date > s.last ? c.contract_date : s.last; }
      const b = s.buyers.get(c.buyer_eik) ?? { name: c.buyer_name, n: 0, eur: 0 };
      b.n++; b.eur += c.contract_value_eur ?? 0; s.buyers.set(c.buyer_eik, b);
      sup.set(eik, s);
    });
  }
  if (rows.length < PAGE) break;
  if (off % 50000 === 0) console.log("договори:", off);
}
const byName = new Map(); // нормализирано име → Set(ЕИК)
for (const [eik, s] of sup) for (const n of s.names) { const k = normCo(n); if (k.replace(/ /g, "").length >= 5) (byName.get(k) ?? byName.set(k, new Set()).get(k)).add(eik); }
console.log("изпълнители:", sup.size, "имена:", byName.size);

// 2) Декларации
const links = [], ambiguous = [];
let people = 0;
for (const year of ["2026", "2025"]) {
  const f = `data/declarations/${year}.json`;
  if (!existsSync(f)) continue;
  const D = JSON.parse(readFileSync(f, "utf8"));
  for (const p of D.people) {
    people++;
    for (const it of p.items) {
      if (/^ЕТ/.test(it.kind)) continue; // едноличните търговци се водят на името на лицето; без ЕИК съвпадението е несигурно
      const k = normCo(it.co);
      const eiks = byName.get(k);
      if (!eiks) continue;
      if (eiks.size > 1) { ambiguous.push({ co: it.co, eiks: [...eiks] }); continue; }
      const eik = [...eiks][0], s = sup.get(eik);
      const top = [...s.buyers.entries()].sort((a, b) => b[1].eur - a[1].eur);
      const own = top.filter(([, b]) => normInst(b.name) === normInst(p.inst));
      links.push({
        year, name: p.name, pos: p.pos, inst: p.inst, cat: p.cat, date: p.date, decl: p.file,
        kind: it.kind, co: it.co, extra: it.extra, eik, contracts: s.n, eur: Math.round(s.eur), first: s.first, last: s.last,
        buyers: top.slice(0, 5).map(([be, b]) => ({ eik: be, name: b.name, n: b.n, eur: Math.round(b.eur) })),
        own: own.length ? { n: own.reduce((a, [, b]) => a + b.n, 0), eur: Math.round(own.reduce((a, [, b]) => a + b.eur, 0)) } : null,
      });
    }
  }
}
// по една връзка на лице + фирма (най-новата декларация)
const uniq = new Map();
for (const l of links.sort((a, b) => (a.year < b.year ? 1 : -1))) { const k = `${l.name}|${l.eik}`; if (!uniq.has(k)) uniq.set(k, l); }
const out = [...uniq.values()].sort((a, b) => b.eur - a.eur);
writeFileSync("data/declarations/links.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), people, links: out, ambiguous: ambiguous.length }));
console.log("декларации с дружества:", people, "връзки:", out.length, "лица:", new Set(out.map((l) => l.name)).size, "от собствената институция:", out.filter((l) => l.own).length, "неясни имена:", ambiguous.length);
