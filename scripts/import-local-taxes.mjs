// Местни данъци по общини (2021–2025) по данните на ИПИ (localtaxes.bg), обработени от „Наясно“ (MIT).
import { readFileSync, writeFileSync } from "node:fs";
const B = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/local_taxes";
const places = JSON.parse(readFileSync("data/places.json", "utf8"));
const codes = [...new Set(places.oblasts.flatMap((o) => o.municipalities.map((m) => m.code)))];
const out = {};
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < codes.length) {
    const c = codes[i++];
    const remote = c === "SOF46" ? "SOF46" : c;
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`${B}/${remote}.json`);
        if (r.status === 404) break;
        if (r.ok) { const d = await r.json(); out[c] = Object.fromEntries(Object.entries(d.ipi ?? {}).map(([k, v]) => [k, { values: v.values, rank: v.nationalRank ?? null }])); break; }
      } catch {}
    }
  }
}));
writeFileSync("data/local-taxes.json", JSON.stringify({ source: "Институт за пазарна икономика (ИПИ), „Местни данъци“; обработено от „Наясно“ (github.com/atanasster/electionsbg, MIT)", url: "https://www.localtaxes.bg/", updated: new Date().toISOString().slice(0, 10), byCode: out }));
console.log("общини с данни:", Object.keys(out).length, "от", codes.length);
