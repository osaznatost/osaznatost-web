// Подкрепа за партиите във времето: всички публикувани проучвания (намерение за гласуване), събрани от „Наясно“ (MIT).
import { writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/polls";
const [polls, det, ag] = await Promise.all(["polls.json", "polls_details.json", "agencies.json"].map((f) => fetch(`${B}/${f}`).then((r) => r.json())));
const MAP = [
  [/^ГЕРБ/, "ГЕРБ"], [/^БСП|Коалиция за България|Левицата/, "БСП"], [/^ДПС\s*[–-]\s*(НН|Ново)/i, "ДПС–НН"], [/^ДПС$/, "ДПС"], [/^АПС/, "АПС"],
  [/^ПП\s*[–-]\s*ДБ$|^ПП-ДБ$/, "ПП–ДБ"], [/^ПП$|Продължаваме промяната/, "ПП"], [/^Демократична България$|^ДБ$/, "ДБ"],
  [/^Възраждане/, "Възраждане"], [/^ИТН$|Има такъв народ/, "ИТН"], [/^Прогресивна България/, "Прогресивна България"], [/^Величие/, "Величие"], [/^МЕЧ/, "МЕЧ"],
];
const norm = (n) => MAP.find(([r]) => r.test(n.trim()))?.[1] ?? null;
const agency = Object.fromEntries((Array.isArray(ag) ? ag : ag.agencies ?? []).map((a) => [a.id, a.name_bg ?? a.nameBg ?? a.name ?? a.id]));
const byPoll = new Map();
for (const d of det) {
  const p = norm(d.nickName_bg);
  if (!p) continue;
  const m = byPoll.get(d.pollId) ?? {};
  m[p] = (m[p] ?? 0) + d.support; // ДПС и ДПС–НН остават отделно; ПП и ДБ поотделно, когато са поотделно
  byPoll.set(d.pollId, m);
}
const out = polls.map((p) => {
  const date = (p.id.match(/(\d{4}-\d{2}-\d{2})/) ?? [])[1];
  return date && byPoll.has(p.id) ? { date, agency: agency[p.agencyId] ?? p.agencyId, election: p.electionDate, n: p.respondents ?? null, source: p.source ?? null, support: byPoll.get(p.id) } : null;
}).filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : 1));
writeFileSync("data/polls-trend.json", JSON.stringify({ source: "Публикуваните проучвания на социологическите агенции, събрани от „Наясно“ (github.com/atanasster/electionsbg, MIT)", polls: out }));
console.log("проучвания:", out.length, out[0]?.date, "–", out.at(-1)?.date);
