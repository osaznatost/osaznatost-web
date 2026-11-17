// Сверява парламентарната група на всеки депутат с официалното членство в parliament.bg (data/mp-profiles.json).
// Обработените данни понякога бъркат ПП и ДБ, защото на изборите са били в обща листа.
import { readFileSync, writeFileSync } from "node:fs";
const MAIN = "data/parliament-ns52.json";
const main = JSON.parse(readFileSync(MAIN, "utf8"));
const prof = JSON.parse(readFileSync("data/mp-profiles.json", "utf8")).byId;
const norm = (n) => n.toUpperCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
const byName = new Map(Object.values(prof).map((p) => [norm(p.name), p]));
const G = [["прогресивна българия", "ПБ"], ["герб", "ГЕРБ - СДС"], ["демократична българия", "ДБ"], ["продължаваме промяната", "ПП"], ["права и свободи", "ДПС"], ["дпс", "ДПС"], ["възраждане", "ВЪЗРАЖДАНЕ"]];
let fixed = 0;
for (const m of main.mps) {
  const p = byName.get(norm(m.name));
  if (!p) continue;
  m.pid = p.id; // номер в parliament.bg
  const cur = p.ms.find((x) => x.t === 2 && String(x.to).startsWith("9999"));
  const g = cur && G.find(([k]) => cur.c.toLowerCase().includes(k))?.[1];
  if (g && g !== m.party) { console.log(`  ${m.name}: ${m.party} → ${g}`); m.party = g; fixed++; }
}
// Един и същ депутат понякога присъства с няколко номера (от различни източници):
// сливаме гласовете в един запис (предпочитаме номера от parliament.bg) и махаме дублираните.
const groups = new Map();
main.mps.forEach((m, i) => { const k = norm(m.name); (groups.get(k) ?? groups.set(k, []).get(k)).push(i); });
const drop = new Set();
let merged = 0;
const chars = main.votes.map((v) => [...v.v]);
for (const idx of groups.values()) {
  if (idx.length < 2) continue;
  const keep = idx.find((i) => main.mps[i].id === main.mps[i].pid) ?? idx[0];
  for (const i of idx) {
    if (i === keep) continue;
    for (const c of chars) if (c[keep] === "-" && c[i] !== "-") c[keep] = c[i];
    drop.add(i);
  }
  merged += idx.length - 1;
}
if (drop.size) {
  main.mps = main.mps.filter((_, i) => !drop.has(i));
  main.votes.forEach((v, j) => { v.v = chars[j].filter((_, i) => !drop.has(i)).join(""); });
  for (const m of main.mps) m.presentPct = null; // изчислява се наново от гласовете
}
writeFileSync(MAIN, JSON.stringify(main));
console.log(`Поправени групи: ${fixed}; слети дублирани записи: ${merged}; депутати: ${main.mps.length}`);
