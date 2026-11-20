// Предишните народни събрания (49–51): поименните гласувания от „Наясно“ (MIT), свити до позиция на всяка група.
// Пускане: node scripts/build-parliament-prev.mjs (нужни са временните файлове от import-parliament.mjs с NS=49/50/51 в PREV_DIR).
// Пазим само същинските решения: първо гласуване на законопроекти, решения, избори; без процедурите и текстовете на второ четене.
import { readFileSync, writeFileSync } from "node:fs";

const DIR = process.env.PREV_DIR ?? "/tmp/prev/data";
const norm = (p) => p.replace(/\s*-\s*/g, "-").replace(/^НЕЧЛ.*$/, "Независими").replace(/^НЕЗ$/, "Независими");
const out = { source: "Стенограми на Народното събрание, обработени от проекта „Наясно“ (github.com/atanasster/electionsbg, лиценз MIT)", ns: {} };
for (const n of ["49", "50", "51"]) {
  const d = JSON.parse(readFileSync(`${DIR}/parliament-ns${n}.json`, "utf8"));
  const party = d.mps.map((m) => norm(m.party || "Независими"));
  const votes = d.votes
    .filter((v) => !/^Процедура/.test(v.title) && !/второ гласуване/.test(v.title) && !/^Гласуване без заглавие/.test(v.title))
    .map((v) => {
      const g = {};
      [...v.v].forEach((c, i) => { if (c === "y" || c === "n" || c === "a") { const p = party[i]; g[p] ??= [0, 0, 0]; g[p]["yna".indexOf(c)]++; } });
      return { id: v.id, date: v.date, title: v.title, outcome: v.outcome, first: /първо гласуване/.test(v.title), g };
    });
  const dates = d.votes.map((v) => v.date).sort();
  out.ns[n] = { from: dates[0], to: dates.at(-1), total: d.votes.length, mps: d.mps.map((m, i) => ({ name: m.name, party: party[i], present: m.presentPct })), votes };
  console.log(n, votes.length, "от", d.votes.length);
}
writeFileSync("data/parliament-prev.json", JSON.stringify(out));
