import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
execFileSync("node", ["scripts/import-abroad.mjs"], { stdio: "inherit" });
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("python3", ["scripts/import-prices.py", d], { stdio: "inherit" });
const P = JSON.parse(readFileSync("data/prices/products.json", "utf8")), A = JSON.parse(readFileSync("data/prices/abroad.json", "utf8"));
for (const i of JSON.parse(readFileSync("content/identical-products.json", "utf8")).items) console.log("## CMP", i.id, P.items[i.id]?.med, P.items[i.id]?.stores, "| AT", A.items[i.id]?.price, A.items[i.id]?.promo ? "PROMO" : "");
const E = JSON.parse(readFileSync("data/prices/eu-levels.json", "utf8")); console.log("## EU", E.year, E.cat, JSON.stringify(E.food), "AIC", E.aicYear, JSON.stringify(E.aic));
