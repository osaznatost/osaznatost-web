import { execFileSync } from "node:child_process"; import { readFileSync } from "node:fs";
execFileSync("node", ["scripts/import-macro.mjs"], { stdio: "inherit" });
const c=JSON.parse(readFileSync("data/macro/cpi.json","utf8")); console.log("## cpi", JSON.stringify(c.monthly.slice(-4)), JSON.stringify(c.groups), c.source.url);
console.log("## bnb", readFileSync("data/macro/bnb-rates.json","utf8").replace(/\s+/g," "));
const d=JSON.parse(readFileSync("data/macro/debt.json","utf8")); console.log("## debt", JSON.stringify(d.series.slice(-3)));
