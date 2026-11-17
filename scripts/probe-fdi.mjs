import { mkdirSync, writeFileSync } from "node:fs";
const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const out = {};
for (const q of ["bop_fdi6_pos?geo=BG&currency=MIO_EUR&fdi_item=DI__D__F&partner=WRL_REST&time=2024",
                 "bop_fdi6_flow?geo=BG&currency=MIO_EUR&fdi_item=DI__D__F&partner=WRL_REST&time=2024",
                 "bop_fdi6_geo?geo=BG&fdi_item=DI__D__F&indic_bp=STOCKS&partner=WRL_REST"]) {
  try {
    const r = await fetch(`${API}/${q}&format=JSON&lang=EN`);
    const j = await r.json();
    out[q] = r.ok ? { dims: Object.fromEntries(j.id.map((d) => [d, Object.entries(j.dimension[d].category.label).slice(0, 80)])), n: Object.keys(j.value).length } : { status: r.status, body: JSON.stringify(j).slice(0, 300) };
  } catch (e) { out[q] = String(e); }
}
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/fdi.json", JSON.stringify(out, null, 1));
