// Местна власт: кмет, заместници, съветници и главен архитект, имуществените им декларации
// и гласуванията в общинския съвет (където са налични). Източник: „Наясно“ (MIT), който събира
// декларациите от регистъра на Сметната палата и протоколите от сайтовете на общинските съвети.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data";
const get = async (p) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(`${B}/${p}`); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch {} await new Promise((s) => setTimeout(s, 800)); } return null; };
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

const places = JSON.parse(readFileSync("data/places.json", "utf8"));
const codes = [...new Set(places.oblasts.flatMap((o) => o.municipalities.map((m) => m.code)))];
const council = await get("council/index.json");
mkdirSync("data/local", { recursive: true });
const ROLE_ORDER = { mayor: 0, deputy_mayor: 1, council_chair: 2, chief_architect: 3, councillor: 4, other: 5 };
const summary = {};
let nOff = 0, nDecl = 0;
await pool(codes, 4, async (code) => {
  const o = await get(`officials/municipal/by_obshtina/${code === "SOF46" ? "SFO_CITY" : code}.json`);
  const ccode = code === "SOF46" ? "SOF" : code;
  const res = council?.resolutionsByObshtina?.[ccode];
  if (!o && !res) return;
  const officials = await pool(o?.entries ?? [], 8, async (e) => {
    const d = (await get(`officials/municipal/declarations/${e.slug}.json`)) ?? [];
    const last = [...d].sort((a, b) => (b.declarationYear ?? 0) - (a.declarationYear ?? 0))[0];
    if (last) nDecl++;
    return {
      slug: e.slug, name: e.name, role: e.role, roleRaw: e.roleRaw,
      party: e.candidateLink?.partyName ?? null, prefVotes: e.candidateLink?.prefVotes ?? null, elected: e.candidateLink?.isElected ?? null,
      decl: last ? {
        year: last.declarationYear, fiscalYear: last.fiscalYear, filedAt: last.filedAt, url: last.sourceUrl, position: last.positionTitle,
        income: Math.round((last.income ?? []).reduce((s, x) => s + (x.amountEurDeclarant ?? 0), 0)),
        incomeSpouse: Math.round((last.income ?? []).reduce((s, x) => s + (x.amountEurSpouse ?? 0), 0)),
        stakes: (last.ownershipStakes ?? []).map((s) => ({ company: s.companyName, share: s.shareSize, kind: s.itemType, office: s.registeredOffice, holder: s.holderName, valueEur: s.valueEur ? Math.round(s.valueEur) : null })),
        realEstate: (last.assets ?? []).filter((a) => /real|land|building|apartment|house|estate|имот/i.test(a.category ?? "")).length,
        vehicles: (last.assets ?? []).filter((a) => /vehicle|car/i.test(a.category ?? "")).length,
        bankEur: Math.round((last.assets ?? []).filter((a) => a.category === "bank" || a.category === "cash").reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        debtEur: Math.round((last.assets ?? []).filter((a) => /debt|liabilit|loan_taken|obligation/i.test(a.category ?? "")).reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        receivableEur: Math.round((last.assets ?? []).filter((a) => a.category === "receivable").reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        categories: [...new Set((last.assets ?? []).map((a) => a.category))],
      } : null,
    };
  });
  officials.sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name, "bg"));
  nOff += officials.length;
  let resolutions = null;
  if (res) {
    const votes = (await get(`council/votes/${ccode}.json`))?.votesById ?? {};
    resolutions = res.slice(0, 400).map((r) => ({
      id: r.id, date: r.date, session: r.session, number: r.number, title: r.title, tags: r.tags ?? [], url: r.sourceUrl ?? r.url ?? null, result: r.result ?? null,
      tally: r.tally ? { for: r.tally.for, against: r.tally.against, abstain: r.tally.abstain, method: r.tally.method } : null,
      votes: (votes[r.id] ?? []).map((v) => [v.name, v.vote]),
    }));
  }
  const name = o?.registryName ?? null;
  writeFileSync(`data/local/${code}.json`, JSON.stringify({ code, name, generatedAt: o?.generatedAt ?? null, officials, resolutions }));
  summary[code] = { name, officials: officials.length, stakes: officials.filter((x) => x.decl?.stakes?.length).length, resolutions: resolutions?.length ?? 0 };
});
writeFileSync("data/local/index.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "„Наясно“ (github.com/atanasster/electionsbg): декларации от регистъра на Сметната палата, протоколи на общинските съвети", tags: council?.tags ?? {}, munis: summary }));
console.log(`Местна власт: ${Object.keys(summary).length} общини, ${nOff} длъжностни лица, ${nDecl} с декларация`);
