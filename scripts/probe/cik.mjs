import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
execFileSync("node", ["scripts/import-council-sites.mjs"], { env: { ...process.env, ONLY: "JAM26", MINUTES: "4" }, stdio: "inherit" });
const d = JSON.parse(readFileSync("data/council/JAM26.json", "utf8"));
console.log("## files", Object.keys(d.files).length, "decisions", d.decisions.length);
const by = {}; for (const x of d.decisions) by[x.session] = (by[x.session] || 0) + 1; console.log("## by session", JSON.stringify(by));
for (const x of [d.decisions[0], d.decisions[4], d.decisions.at(-1), d.decisions.find(x => /имената/.test(x.title))]) console.log("## S", JSON.stringify(x).slice(0, 700));
console.log("## short", d.decisions.filter(x => x.title.length < 15).length, "dates", [...new Set(d.decisions.map(x => x.date))].join(","));
