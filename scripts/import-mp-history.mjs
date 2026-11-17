// В кои парламенти е бил всеки депутат (индексът на „Наясно“ от 1990 г. насам), по име.
import { writeFileSync } from "node:fs";
const r = await fetch("https://raw.githubusercontent.com/atanasster/electionsbg/main/data/parliament/index.json");
const ix = await r.json();
const out = {};
for (const m of ix.mps) {
  out[m.normalizedName] = { ns: m.nsFolders ?? [], born: m.birthDate ?? null, electedWith: m.electedWith ?? null, group: m.currentPartyGroupShort ?? null, naiasnoId: m.id };
}
writeFileSync("data/mp-history.json", JSON.stringify({ source: "https://github.com/atanasster/electionsbg (data/parliament/index.json)", byName: out }));
console.log("депутати в индекса:", Object.keys(out).length);
