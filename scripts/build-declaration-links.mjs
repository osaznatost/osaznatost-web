// Свързва декларираните дружества (data/declarations/<година>.json) с изпълнителите на обществени поръчки.
// Правило (еднакво за всички): името на дружеството в декларацията и името на изпълнителя съвпадат след
// нормализиране (без кавички, правна форма и препинателни знаци). Ако едно име отговаря на повече от една фирма (ЕИК),
// връзката НЕ се показва: не можем да кажем коя е. Сигнал „от собствената институция“: възложителят е
// институцията, в която лицето заема длъжност (същото нормализирано име).
// Пуска се от GitHub Actions. Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY. Пише data/declarations/links.json.
import { readdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
// Всички години, за които има прочетени декларации (data/declarations/<година>.json), от най-новата.
const YEARS_ALL = readdirSync("data/declarations").map((f) => f.match(/^(\d{4})\.json$/)?.[1]).filter(Boolean).sort().reverse();

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };
const LAT = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У" };
const FORMS = new Set(["ЕООД", "ООД", "ЕАД", "АД", "ЕТ", "КД", "КДА", "СД", "ДЗЗД", "АДСИЦ", "ЛТД", "ГМБХ"]);
export const normCo = (s) => String(s ?? "").toUpperCase()
  .replace(/[ABCEHKMOPTXY]/g, (c) => LAT[c])               // латински букви, които изглеждат като кирилски
  .replace(/[^0-9A-ZА-ЯЁ]+/g, " ").trim().split(" ").filter((w) => w && !FORMS.has(w)).join(" ");
const normInst = (s) => normCo(s);
// Институцията на лицето може да е записана кратко („Благоевград“ за община): сравняваме и с „Община <име>“.
const instKeys = (inst, cat) => { const k = normInst(inst); return /общин|кмет/i.test(cat ?? "") && !/^ОБЩИНА /.test(k) ? [k, `ОБЩИНА ${k}`] : [k]; };
const isOwn = (buyer, inst, cat) => instKeys(inst, cat).includes(normInst(buyer));
// Търговски регистър (частичен): потвърждава, че лицето наистина е в тази фирма.
const trShards = new Map();
const trFor = (eik) => { const k = String(eik).slice(0, 2); if (!trShards.has(k)) { const f = `data/tr/${k}.json`; trShards.set(k, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}); } return trShards.get(k)[String(eik).slice(0, 9)] ?? null; };
const trNames = (f) => new Set(["managers", "board", "partners", "owner", "ubo", "procurator"].flatMap((r) => (f?.[r] ?? []).map((p) => String(p.name).toUpperCase().replace(/\s+/g, " ").trim())));
const STATE_OWNER = /държав|министерств|народна банка|общин|агенция|република българия/i;
// Публични предприятия (регистър на АППК) и дружества с държавен или общински собственик по ТР.
const PUBLIC = new Set((existsSync("data/public-companies.json") ? [].concat(JSON.parse(readFileSync("data/public-companies.json", "utf8")).companies ?? []) : []).map((c) => String(c.eik).slice(0, 9)));
const isPublicCo = (eik, name) => PUBLIC.has(String(eik).slice(0, 9)) || (trFor(eik)?.owner ?? []).some((o) => STATE_OWNER.test(o.name)) || /ДЪРЖАВН|НАЦИОНАЛНА КОМПАНИЯ| ДП$|ЧЕРВЕН КРЪСТ|ОБЕРТЮР ФИДЮСИЕР|ПЕЧАТНИЦА НА (БЪЛГАРСКА НАРОДНА БАНКА|БНБ)/i.test(name);

// 1) Изпълнители: име → ЕИК-ове, договори, сума, възложители
const sup = new Map(); // eik → {names:Set, n, eur, buyers: Map(eik→{name,n,eur})}
const subs = new Map(); // eik → {names:Set, n, mains: Map(eik→{name,n}), buyers: Map(eik→{name,n})} — като подизпълнител
const PAGE = 1000;
let lastId = null, done = 0;
for (;;) {
  // Страниране по ключ (id > последния), не по отместване: отместването над ~150 хил. реда изтича.
  const flt = lastId ? `&id=gt.${encodeURIComponent(lastId)}` : "";
  let r = null;
  for (let a = 0; a < 4 && !r?.ok; a++) { r = await fetch(`${URL_}/rest/v1/proc_contracts?select=id,supplier_eiks,supplier_names,buyer_eik,buyer_name,contract_value_eur,contract_date,subcontractor_eiks,subcontractor_names&order=id&limit=${PAGE}${flt}`, { headers: H }); if (!r.ok) await new Promise((s) => setTimeout(s, 3000 * (a + 1))); }
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const rows = await r.json();
  if (rows.length) lastId = rows.at(-1).id;
  done += rows.length;
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
    // Подизпълнители: ЕИК-овете и имената са текст, разделен със запетаи или точка и запетая.
    const se = String(c.subcontractor_eiks ?? "").split(/[,;\s]+/).filter((x) => /^\d{9,13}$/.test(x));
    const sn = String(c.subcontractor_names ?? "").split(/;|\n/).map((x) => x.trim()).filter(Boolean);
    se.forEach((eik, i) => {
      const s = subs.get(eik) ?? { names: new Set(), n: 0, mains: new Map(), buyers: new Map() };
      if (sn[i] && se.length === sn.length) s.names.add(sn[i]);
      s.n++;
      (c.supplier_eiks ?? []).forEach((m, j) => { const x = s.mains.get(m) ?? { name: c.supplier_names?.[j] ?? m, n: 0 }; x.n++; s.mains.set(m, x); });
      const b = s.buyers.get(c.buyer_eik) ?? { name: c.buyer_name, n: 0 }; b.n++; s.buyers.set(c.buyer_eik, b);
      subs.set(eik, s);
    });
  }
  if (rows.length < PAGE) break;
  if (done % 50000 < PAGE) console.log("договори:", done);
}
const byName = new Map(); // нормализирано име → Set(ЕИК)
for (const [eik, s] of [...sup, ...subs]) for (const n of s.names) { const k = normCo(n); if (k.replace(/ /g, "").length >= 5) (byName.get(k) ?? byName.set(k, new Set()).get(k)).add(eik); }
console.log("изпълнители:", sup.size, "имена:", byName.size);

// 2) Декларации
const links = [], ambiguous = [];
let publicRoles = 0;
let people = 0;
for (const year of YEARS_ALL) {
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
      const eik = [...eiks][0], s = sup.get(eik) ?? { n: 0, eur: 0, first: null, last: null, buyers: new Map() }, sb = subs.get(eik);
      const top = [...s.buyers.entries()].sort((a, b) => b[1].eur - a[1].eur);
      const own = top.filter(([, b]) => isOwn(b.name, p.inst, p.cat));
      const tr = trFor(eik);
      const confirmed = tr ? trNames(tr).has(p.name.toUpperCase().replace(/\s+/g, " ").trim()) : null;
      // Име от една дума („Екоенерджи“) може да е друга фирма със същото име, която не е печелила поръчки:
      // показваме го само ако Търговският регистър потвърждава, че лицето е в тази фирма.
      // Управление на държавно или общинско дружество (съвет на директорите и т.н.) обикновено е по служба,
      // не личен интерес: такива връзки броим отделно и не ги показваме като сигнал.
      if (/управление/.test(it.kind) && isPublicCo(eik, it.co)) { publicRoles++; continue; }
      if (k.split(" ").length < 2 && confirmed !== true) { ambiguous.push({ co: it.co, eiks: [eik], why: "една дума" }); continue; }
      links.push({
        year, name: p.name, pos: p.pos, inst: p.inst, cat: p.cat, date: p.date, decl: p.file,
        kind: it.kind, co: it.co, extra: it.extra, eik, confirmed, contracts: s.n, eur: Math.round(s.eur), first: s.first, last: s.last,
        buyers: top.slice(0, 5).map(([be, b]) => ({ eik: be, name: b.name, n: b.n, eur: Math.round(b.eur) })),
        sub: sb ? { n: sb.n, mains: [...sb.mains.values()].sort((a, b) => b.n - a.n).slice(0, 3), buyers: [...sb.buyers.values()].sort((a, b) => b.n - a.n).slice(0, 3) } : null,
        own: own.length ? { n: own.reduce((a, [, b]) => a + b.n, 0), eur: Math.round(own.reduce((a, [, b]) => a + b.eur, 0)) } : null,
      });
    }
  }
}
// по една връзка на лице + фирма (най-новата декларация)
const uniq = new Map();
for (const l of links.sort((a, b) => (a.year < b.year ? 1 : -1))) { const k = `${l.name.toUpperCase().replace(/\s+/g, " ").trim()}|${l.eik}`; if (!uniq.has(k)) uniq.set(k, l); }
const out = [...uniq.values()].sort((a, b) => b.eur - a.eur);

// 3) „Само по Търговския регистър“: лице от регистъра на декларациите е управител, съдружник или собственик
// (по Търговския регистър) на фирма, която е печелила поръчки ОТ СЪЩАТА институция, в която лицето заема
// длъжност, а тази фирма не е свързана с негова декларация. Съвпадението е по трите имена (без ЕГН), затова
// изискваме и съвпадение на институцията: така рискът от съименник е малък, но не нулев.
const trPeople = existsSync("data/tr/people.json") ? JSON.parse(readFileSync("data/tr/people.json", "utf8")) : {};
const declared = new Set(out.map((l) => `${l.name.toUpperCase()}|${l.eik}`));
const trOnly = new Map();
// Защита от съименници: името трябва да е рядко — едно лице сред декларантите (една институция)
// и в Търговския регистър да се среща в най-много 3 различни фирми.
const declInst = new Map();
for (const year of YEARS_ALL) {
  const f = `data/declarations/people-${year}.json`;
  if (!existsSync(f)) continue;
  for (const p of JSON.parse(readFileSync(f, "utf8"))) {
    const key = p.name.toUpperCase().replace(/\s+/g, " ").trim();
    if (!declInst.has(key)) declInst.set(key, new Set());
    declInst.get(key).add(p.inst);
  }
}
let namesakeSkipped = 0;
const COMMON_SURNAME = /^(ИВАНОВ|ГЕОРГИЕВ|ДИМИТРОВ|ПЕТРОВ|НИКОЛОВ|ХРИСТОВ|СТОЯНОВ|ТОДОРОВ|ИЛИЕВ|ВАСИЛЕВ|АТАНАСОВ|ПЕТКОВ|АНГЕЛОВ|ЙОРДАНОВ|КОЛЕВ|МАРИНОВ|ПОПОВ|СТЕФАНОВ|КОСТОВ|МИХАЙЛОВ)А?$/;
for (const year of YEARS_ALL) {
  const f = `data/declarations/people-${year}.json`;
  if (!existsSync(f)) continue;
  for (const p of JSON.parse(readFileSync(f, "utf8"))) {
    const key = p.name.toUpperCase().replace(/\s+/g, " ").trim();
    if (key.split(" ").length < 3) continue; // само пълни три имена
    const firms = new Set((trPeople[key] ?? []).map(([e]) => e));
    // Най-честите фамилии дават твърде много съименници — за тях сигнал само по името не показваме.
    if (COMMON_SURNAME.test(key.split(" ").at(-1))) { if (firms.size) namesakeSkipped++; continue; }
    if ((declInst.get(key)?.size ?? 0) > 1 || firms.size > 3) { if (firms.size) namesakeSkipped++; continue; }
    for (const [eik9, role] of trPeople[key] ?? []) {
      const eik = sup.has(eik9) ? eik9 : null;
      if (!eik || declared.has(`${key}|${eik}`)) continue;
      const s = sup.get(eik);
      const own = [...s.buyers.values()].filter((b) => isOwn(b.name, p.inst, p.cat));
      if (!own.length) continue;
      // Държавни и общински дружества: членството в съвета им обикновено идва по служба, не е личен интерес.
      if (isPublicCo(eik, [...s.names][0] ?? "")) continue;
      const k = `${key}|${eik}`;
      const prev = trOnly.get(k);
      const roles = [...new Set([...(prev?.roles ?? []), role])];
      trOnly.set(k, { year, name: p.name, pos: p.pos, inst: p.inst, cat: p.cat, eik, co: [...s.names][0] ?? eik, roles, contracts: s.n, eur: Math.round(s.eur),
        own: { n: own.reduce((a, b) => a + b.n, 0), eur: Math.round(own.reduce((a, b) => a + b.eur, 0)) } });
    }
  }
}
const trOut = [...trOnly.values()].sort((a, b) => b.own.eur - a.own.eur);
console.log("само по Търговския регистър (същата институция):", trOut.length, "пропуснати заради възможни съименници:", namesakeSkipped);
writeFileSync("data/declarations/links.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), people, links: out, ambiguous: ambiguous.length, publicRoles, trOnly: trOut }));
console.log("декларации с дружества:", people, "връзки:", out.length, "лица:", new Set(out.map((l) => l.name)).size, "от собствената институция:", out.filter((l) => l.own).length, "неясни имена:", ambiguous.length);
