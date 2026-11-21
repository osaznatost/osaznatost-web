import { execFileSync } from "node:child_process"; import { readFileSync } from "node:fs";
execFileSync("node", ["scripts/import-council-sites.mjs"], { env: { ...process.env, ONLY: "VRC10", MINUTES: "12" }, stdio: "inherit" });
const d = JSON.parse(readFileSync("data/council/VRC10.json", "utf8"));
const n=d.decisions.map(x=>+x.number);
console.log("## decisions", d.decisions.length, "dates", d.decisions.map(x=>x.date).sort()[0], "..", d.decisions.map(x=>x.date).sort().at(-1), "min/max", Math.min(...n), Math.max(...n), "complete", d.complete);
for (const x of d.decisions.slice(-3)) console.log("## S", JSON.stringify(x).slice(0,300));
