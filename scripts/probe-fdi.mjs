import { mkdirSync, writeFileSync } from "node:fs";
const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const out = {};
for (const ds of ["bop_fdi6_geo", "bop_fdi6_ind", "bop_fdi6_pos", "bop_fdi6_flow", "tec00046", "tec00047"]) {
  try {
    const r = await fetch(`${API}/${ds}?format=JSON&lang=EN&geo=BG&sinceTimePeriod=2022`);
    const j = await r.json();
    out[ds] = r.ok ? Object.fromEntries(j.id.map((d) => [d, Object.entries(j.dimension[d].category.label).slice(0, 60)])) : { status: r.status, body: JSON.stringify(j).slice(0, 300) };
  } catch (e) { out[ds] = String(e); }
}
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/fdi.json", JSON.stringify(out, null, 1));
