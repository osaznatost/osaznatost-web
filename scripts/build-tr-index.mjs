// Обратен индекс на свързаните лица по Търговския регистър: ЕИК на фирма → кои лица на власт са свързани с нея.
// Чете data/tr-links/<код>.json (длъжностни лица в общините) и data/tr-links/MP.json (депутати) и пише
// data/tr-links/eik-index.json. Видове връзка:
//   own     — лицето е било или е управител, съдружник, собственик или член на съвет на фирмата (с периода);
//   partner — фирмата е на човек, който е бил съдружник или управител заедно с лицето в друга фирма.
// По три имена, без ЕГН: възможни са съвпадения. Повод за въпрос, не доказателство.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const DIR = "data/tr-links";
const idx = {};
const P = {};
const add = (eik, x) => { if (!eik) return; const k = String(eik).slice(0, 9); (idx[k] ??= []).push(x); };
const cur = (rs) => rs.some((r) => !r.to);
const yr = (d) => (d ? d.slice(0, 4) : "");
const per = (rs) => rs.map((r) => `${r.role}${r.from || r.to ? ` ${yr(r.from)}–${r.to ? yr(r.to) : "досега"}` : ""}`).join(", ");

let people = 0;
for (const f of readdirSync(DIR).filter((f) => /^([A-Z]{3}\d{2}|MP|GOV)\.json$/.test(f))) {
  const code = f.replace(".json", "");
  const D = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  for (const [slug, p] of Object.entries(D)) {
    people++;
    // имената и длъжностите са веднъж в P (по slug), за да е малък индексът
    P[slug] = [code, p.name, p.role];
    const who = { s: slug };
    for (const fm of p.firms ?? []) add(fm.eik, { ...who, k: "own", how: per(fm.mine ?? []), now: cur(fm.mine ?? []) });
    for (const co of p.co ?? []) {
      const via = (co.via ?? []).map((e) => (p.firms ?? []).find((x) => x.eik === e)?.name).filter(Boolean);
      for (const t of co.firms ?? []) {
        if ((p.firms ?? []).some((x) => x.eik === t.eik)) continue; // вече е „own“
        add(t.eik, { ...who, k: "partner", partner: co.n, via: [...new Set(via)].slice(0, 2), roles: (t.roles ?? []).slice(0, 2) });
      }
    }
  }
}
// Разделено по първите две цифри на ЕИК, за да не се зарежда целият индекс (паметта в Workers е 128 MB).
mkdirSync(`${DIR}/eik`, { recursive: true });
const sh = {};
for (const [e, v] of Object.entries(idx)) (sh[e.slice(0, 2)] ??= {})[e] = v;
for (const [k, v] of Object.entries(sh)) writeFileSync(`${DIR}/eik/${k}.json`, JSON.stringify(v));
writeFileSync(`${DIR}/eik/people.json`, JSON.stringify(P));
if (existsSync(`${DIR}/eik-index.json`)) rmSync(`${DIR}/eik-index.json`);
console.log(`Индекс на свързаните фирми: ${Object.keys(idx).length} фирми, ${people} лица`);
if (!existsSync(`${DIR}/MP.json`)) console.log("(няма MP.json)");
