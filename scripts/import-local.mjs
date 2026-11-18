// Местна власт: кмет, заместници, съветници и главен архитект, имуществените им декларации
// и гласуванията в общинския съвет (където са налични). Източник: „Наясно“ (MIT), който събира
// декларациите от регистъра на Сметната палата и протоколите от сайтовете на общинските съвети.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data";
const get = async (p) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(`${B}/${p}`); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch {} await new Promise((s) => setTimeout(s, 800)); } return null; };
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

const places = JSON.parse(readFileSync("data/places.json", "utf8"));
const codes = [...new Set(places.oblasts.flatMap((o) => o.municipalities.map((m) => m.code)))];
const council = await get("council/index.json");
mkdirSync("data/local", { recursive: true });
const ROLE_ORDER = { mayor: 0, deputy_mayor: 1, council_chair: 2, chief_architect: 3, councillor: 4, other: 5 };

// Решения, които четем сами от сайта на общинския съвет (scripts/import-council-sites.mjs).
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
function ownResolutions(code, officials) {
  const f = `data/council/${code}.json`;
  if (!existsSync(f)) return null;
  const C = JSON.parse(readFileSync(f, "utf8"));
  const who = (name) => {
    const [first, ...rest] = name.toUpperCase().split(/\s+/); const last = rest.at(-1) ?? "";
    const o = officials.find((x) => { const p = x.name.toUpperCase().split(/\s+/); return p[0] === first && lev(p.at(-1), last) <= 2; });
    return o ? { slug: o.slug, name: o.name } : null;
  };
  return C.decisions.map((d) => {
    const w = d.rapporteur ? who(d.rapporteur.name) : null;
    return {
      id: `${code}-${d.date}-${d.number}`, date: d.date, session: "", number: d.number, title: d.title, tags: d.tags, url: d.url, result: d.result, tally: d.tally, votes: [],
      text: d.text, rapporteur: d.rapporteur ? { name: w?.name ?? d.rapporteur.name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()), role: d.rapporteur.role, slug: w?.slug ?? null } : null,
    };
  });
}
const summary = {};
const people = {};
let nOff = 0, nDecl = 0;
await pool(codes, 4, async (code) => {
  const o = await get(`officials/municipal/by_obshtina/${code === "SOF46" ? "SFO_CITY" : code}.json`);
  const ccode = code === "SOF46" ? "SOF" : code;
  const res = council?.resolutionsByObshtina?.[ccode];
  if (!o && !res) return;
  const officials = await pool(o?.entries ?? [], 8, async (e) => {
    const d = (await get(`officials/municipal/declarations/${e.slug}.json`)) ?? [];
    const sorted = [...d].sort((a, b) => (b.declarationYear ?? 0) - (a.declarationYear ?? 0));
    const sum = (x) => {
      const assets = x.assets ?? [];
      return {
        year: x.declarationYear, fiscalYear: x.fiscalYear, filedAt: x.filedAt, url: x.sourceUrl, position: x.positionTitle, institution: x.institution ?? null,
        income: Math.round((x.income ?? []).reduce((s, i) => s + (i.amountEurDeclarant ?? 0), 0)),
        incomeSpouse: Math.round((x.income ?? []).reduce((s, i) => s + (i.amountEurSpouse ?? 0), 0)),
        incomeBy: (x.income ?? []).filter((i) => (i.amountEurDeclarant ?? 0) + (i.amountEurSpouse ?? 0) > 0).map((i) => ({ what: i.category ?? i.type ?? i.label ?? "", d: Math.round(i.amountEurDeclarant ?? 0), s: Math.round(i.amountEurSpouse ?? 0) })),
        stakes: (x.ownershipStakes ?? []).map((st) => ({ company: st.companyName, share: st.shareSize, kind: st.itemType, office: st.registeredOffice, holder: st.holderName, valueEur: st.valueEur ? Math.round(st.valueEur) : null })),
        realEstate: assets.filter((a) => /real|land|building|apartment|house|estate|имот/i.test(a.category ?? "")).length,
        vehicles: assets.filter((a) => /vehicle|car/i.test(a.category ?? "")).length,
        bankEur: Math.round(assets.filter((a) => a.category === "bank" || a.category === "cash").reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        debtEur: Math.round(assets.filter((a) => /debt|liabilit|loan_taken|obligation/i.test(a.category ?? "")).reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        receivableEur: Math.round(assets.filter((a) => a.category === "receivable").reduce((s, a) => s + (a.valueEur ?? 0), 0)),
        categories: [...new Set(assets.map((a) => a.category))],
      };
    };
    const last = sorted[0];
    if (last) nDecl++;
    return {
      slug: e.slug, name: e.name, role: e.role, roleRaw: e.roleRaw,
      party: e.candidateLink?.partyName ?? null, prefVotes: e.candidateLink?.prefVotes ?? null, elected: e.candidateLink?.isElected ?? null,
      listPos: e.candidateLink?.listPos ?? null, cycle: e.candidateLink?.cycle ?? null,
      decl: last ? sum(last) : null,
      history: sorted.map(sum),
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
  if (!resolutions) resolutions = ownResolutions(code, officials);
  const name = o?.registryName ?? null;
  writeFileSync(`data/local/${code}.json`, JSON.stringify({ code, name, generatedAt: o?.generatedAt ?? null, officials, resolutions }));
  for (const x of officials) people[x.slug] = [code, x.name, x.roleRaw];
  summary[code] = { name, officials: officials.length, stakes: officials.filter((x) => x.decl?.stakes?.length).length, resolutions: resolutions?.length ?? 0 };
});
writeFileSync("data/local/people.json", JSON.stringify(people));
writeFileSync("data/local/index.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "„Наясно“ (github.com/atanasster/electionsbg): декларации от регистъра на Сметната палата, протоколи на общинските съвети", tags: council?.tags ?? {}, munis: summary }));
console.log(`Местна власт: ${Object.keys(summary).length} общини, ${nOff} длъжностни лица, ${nDecl} с декларация`);
