// Социологически агенции: колко точно са предсказали изборите (средна грешка, отклонения по партии).
// Източник: „Наясно“ (MIT), сравнение на последните проучвания преди изборите с резултатите на ЦИК.
import { writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/polls";
const get = async (f) => (await fetch(`${B}/${f}`)).json();
const [acc, agencies] = await Promise.all([get("accuracy.json"), get("agencies.json")]);
const ag = Object.fromEntries(agencies.map((a) => [a.id, { name: a.name_bg, eik: a.eik ?? null, site: a.website ?? null }]));
const out = {
  source: "„Наясно“ (github.com/atanasster/electionsbg), по публикуваните проучвания и резултатите на ЦИК",
  generatedAt: acc.generatedAt,
  agencies: acc.agencyProfiles.map((p) => ({
    id: p.agencyId, name: p.name_bg, eik: ag[p.agencyId]?.eik ?? null, site: ag[p.agencyId]?.site ?? null,
    polls: p.totalPolls, pre: p.preElectionPolls, elections: p.electionsCovered?.length ?? 0, mae: p.overallMAE, maeAdj: p.overallMAEAdjusted, grade: p.grade,
    barrier: p.barrierCallRate, history: (p.maeHistory ?? []).map((h) => [h.electionDate, h.mae]),
    bias: (p.partyBias ?? []).filter((b) => b.samples >= 2).sort((a, b) => Math.abs(b.meanError) - Math.abs(a.meanError)).slice(0, 4).map((b) => [b.key, b.meanError, b.samples]),
  })).sort((a, b) => (a.mae ?? 99) - (b.mae ?? 99)),
  elections: acc.elections.map((e) => ({
    date: e.electionDate,
    actual: e.actualResults.filter((r) => r.pct >= 2).map((r) => [r.key, r.pct]),
    polls: e.agencies.map((a) => ({ id: a.agencyId, end: a.fieldworkEnd, days: a.daysBefore, n: a.respondents, errors: a.errors.filter((x) => x.actual >= 2).map((x) => [x.key, x.polled, x.actual, x.error]) })),
  })),
};
writeFileSync("data/polls.json", JSON.stringify(out));
console.log(`Агенции: ${out.agencies.length}; избори: ${out.elections.length}`);
