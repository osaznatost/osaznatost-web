// Български фирми в санкционните списъци (САЩ, ЕС, Великобритания и др.) — от OpenSanctions (CC BY-NC 4.0).
// Пазим само юридически лица с ЕИК, за да няма съвпадения по име. Изход: data/proc/sanctions.json
import { writeFileSync, mkdirSync } from "node:fs";

const URL = "https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv";
const r = await fetch(URL, { headers: { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" }, redirect: "follow" });
if (!r.ok) throw new Error(`OpenSanctions: ${r.status}`);
const text = await r.text();

// CSV с кавички и нови редове в полетата
function* rows(s) {
  let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); yield row; row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); yield row; }
}
const it = rows(text);
const head = it.next().value;
const col = (n) => head.indexOf(n);
const [ID, SCH, NAME, CTR, IDS, SAN, DS, FIRST] = ["id", "schema", "name", "countries", "identifiers", "sanctions", "dataset", "first_seen"].map(col);

const out = {};
for (const x of it) {
  if (!x[CTR]?.split(";").includes("bg") || x[SCH] === "Person" || x[SCH] === "Vessel") continue;
  const eiks = [...new Set((x[IDS] ?? "").split(";").map((v) => v.replace(/^BG/, "").trim()).filter((v) => /^\d{9}(\d{4})?$/.test(v)))];
  for (const e of eiks) (out[e] ??= { name: x[NAME], programs: [], sources: [], id: x[ID], since: x[FIRST]?.slice(0, 10) ?? null });
  for (const e of eiks) {
    for (const p of (x[SAN] ?? "").split(";").map((s) => s.trim()).filter(Boolean)) if (!out[e].programs.includes(p)) out[e].programs.push(p);
    for (const d of (x[DS] ?? "").split(";").map((s) => s.trim()).filter(Boolean)) if (!out[e].sources.includes(d)) out[e].sources.push(d);
  }
}
mkdirSync("data/proc", { recursive: true });
writeFileSync("data/proc/sanctions.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), firms: out }));
console.log(`Фирми с ЕИК под санкции: ${Object.keys(out).length}`);
