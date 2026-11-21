import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
execFileSync("node", ["scripts/import-council-sites.mjs"], { env: { ...process.env, ONLY: "VRC10", MINUTES: "8" }, stdio: "inherit" });
const d = JSON.parse(readFileSync("data/council/VRC10.json", "utf8"));
console.log("## decisions", d.decisions.length, "dates", d.decisions.at(-1)?.date, "..", d.decisions[0]?.date);
for (const x of d.decisions.slice(0, 4).concat(d.decisions.slice(-3))) console.log("## S", JSON.stringify(x).slice(0, 300));
const nums = d.decisions.map((x) => +x.number); console.log("## min/max", Math.min(...nums), Math.max(...nums));
