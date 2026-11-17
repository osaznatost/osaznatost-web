// Европейски средства (ИСУН 2020), обработени от проекта „Наясно“ (github.com/atanasster/electionsbg, MIT).
// Свиваме ги до data/funds.json за страницата /ikonomika/evrosredstva.
import { writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/funds";
const get = async (p) => { const r = await fetch(`${B}/${p}`); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const [index, muni, abs, sankey, pol] = await Promise.all([
  get("index.json"), get("projects/muni-map.json"), get("derived/absorption.json"), get("derived/sankey.json"), get("derived/political_links.json"),
]);
const r0 = (v) => Math.round(v);
const out = {
  updated: index.generatedAt?.slice(0, 10),
  source: { title: "ИСУН 2020 (2020.eufunds.bg), обработено от „Наясно“ (MIT)", url: index.source?.url ?? "https://2020.eufunds.bg/", repo: "https://github.com/atanasster/electionsbg" },
  totals: index.totals,
  byOrgType: index.byOrgType.map((x) => ({ key: x.key, n: x.beneficiaries, contracts: x.contractCount, contracted: r0(x.contractedEur), paid: r0(x.paidEur) })),
  top: index.topByContracted.slice(0, 40).map((x) => ({ eik: x.eik, name: x.name, type: x.orgType, contracts: x.contractCount, contracted: r0(x.contractedEur), paid: r0(x.paidEur), mpTied: x.mpTied })),
  byPeriod: abs.byPeriod,
  byProgramme: abs.byProgramme.filter((p) => p.contractedEur > 0).map((p) => ({ code: p.programCode, name: p.programName, period: p.period, fund: p.fundType, contracted: r0(p.contractedEur), paid: r0(p.paidEur), pct: p.absorptionPct, contracts: p.contractCount })),
  sankey: { nodes: sankey.nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label, total: r0(n.totalEur) })), links: sankey.links.map((l) => ({ ...l, value: r0(l.value) })) },
  munis: Object.fromEntries(muni.munis.map((m) => [m.muni, { contracts: m.contractCount, total: r0(m.totalEur), paid: r0(m.paidEur), perCapita: m.perCapitaEur, pop: m.population }])),
  political: {
    totals: pol.totals,
    top: pol.top.slice(0, 40).map((t) => ({
      eik: t.eik, name: t.name, type: t.orgType, contracted: r0(t.contractedEur), paid: r0(t.paidEur),
      mps: (t.mps ?? []).map((m) => ({ id: m.mpId, name: m.mpName, rel: [...new Set((m.relations ?? []).map((r) => r.kind))], current: (m.relations ?? []).some((r) => r.isCurrent) })),
      officials: (t.officials ?? []).slice(0, 4).map((o) => ({ name: o.name, institution: o.institution, role: o.role })),
    })),
  },
};
writeFileSync("data/funds.json", JSON.stringify(out));
console.log(`Евросредства: ${out.totals.contractCount} договора, ${(out.totals.contractedEur / 1e9).toFixed(1)} млрд. €, ${Object.keys(out.munis).length} общини`);
