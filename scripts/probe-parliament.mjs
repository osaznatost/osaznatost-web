// Проба 2: всички адреси на API-то в JavaScript на parliament.bg и полетата на законопроектите.
import { mkdirSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/" };
const html = await (await fetch("https://www.parliament.bg/bg/plenaryprogram", { headers: H })).text();
const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => new URL(m[1], "https://www.parliament.bg").href);
const endpoints = new Set();
for (const s of scripts) {
  const js = await (await fetch(s, { headers: H })).text();
  for (const m of js.matchAll(/["'`]((?:\/api\/v1\/|api\/v1\/)[^"'`]{2,80})["'`]/g)) endpoints.add(m[1]);
  for (const m of js.matchAll(/["'`](pl-[a-z-]{2,40}|fn-[a-z-]{2,40}|coll-[a-z-]{2,40}|mp-[a-z-]{2,40})["'`]/g)) endpoints.add(m[1]);
}
const bills = await (await fetch("https://www.parliament.bg/api/v1/fn-bills", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "{}" })).json();
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/parliament.json", JSON.stringify({ scripts, endpoints: [...endpoints].sort(), billsCount: bills.length, billsSample: bills.slice(0, 3) }, null, 1));
console.log(scripts.length, "скрипта,", endpoints.size, "адреса,", bills.length, "законопроекта");
