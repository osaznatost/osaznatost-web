// Профил на мястото: преброяване 2021 (демография), карта на населените места, местни данъци и
// проектите по Инвестиционната програма за общински проекти (държавно финансиране).
// Източник: „Наясно“ (github.com/atanasster/electionsbg, MIT), който обработва НСИ, МРРБ, МФ и общинските наредби.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data";
const get = async (p) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(`${B}/${p}`); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch {} await new Promise((s) => setTimeout(s, 800)); } return null; };
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k]); } })); }
const round = (c) => (Array.isArray(c) ? c.map(round) : Math.round(c * 1e4) / 1e4);

const places = JSON.parse(readFileSync("data/places.json", "utf8"));
mkdirSync("data/place", { recursive: true });
const country = { population: 0, age: {}, gender: {}, education: {}, employed: 0, active: 0 };
let n = 0;
await pool(places.oblasts.flatMap((o) => o.municipalities.map((m) => m.code)), 6, async (code) => {
  const [census, map, taxes, ipop] = await Promise.all([
    get(`census/municipalities/${code}.json`), get(`maps/municipalities/${code}.json`), get(`local_taxes/${code}.json`), get(`budget/ipop/municipalities/${code}.json`),
  ]);
  const out = {
    code,
    census: census ? { population: census.population, age: census.age, gender: census.gender, education: census.education, employment: census.employment, ethnic: census.ethnic, religion: census.religion, motherTongue: census.motherTongue } : null,
    map: map ? { type: "FeatureCollection", features: map.features.map((f) => ({ type: "Feature", properties: { ekatte: f.properties.ekatte }, geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) } })) } : null,
    taxes: taxes?.ipi ?? null,
    ipop: ipop ? { year: ipop.fiscalYear, rollup: ipop.rollup, projects: ipop.projects.map((p) => ({ id: p.id, description: p.description, agreement: Math.round(p.agreementEur), paid: Math.round(p.paidEur), state: Math.round(p.mrrbPaidEur ?? 0), muni: Math.round(p.bbrPaidEur ?? 0), pct: p.paidPct, stalled: p.stalled })) } : null,
  };
  writeFileSync(`data/place/${code}.json`, JSON.stringify(out));
  n++;
});
const oblasts = {};
await pool(places.oblasts.map((o) => o.code ?? o.municipalities[0].code.slice(0, 3)), 6, async (code) => {
  const c = await get(`census/oblasts/${code}.json`);
  if (c) oblasts[code] = { population: c.population, age: c.age, gender: c.gender, education: c.education, employment: c.employment };
});
for (const c of Object.values(oblasts)) {
  country.population += c.population;
  for (const k of ["age", "gender", "education"]) for (const [a, v] of Object.entries(c[k] ?? {})) country[k][a] = (country[k][a] ?? 0) + v;
}
writeFileSync("data/place/oblasts.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), country, oblasts }));
console.log(`Места: ${n} общини, ${Object.keys(oblasts).length} области`);
