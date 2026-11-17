// Проба 3: контекст около „prog“ и „api/v1“ в app.js на parliament.bg.
import { mkdirSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/" };
const js = await (await fetch("https://www.parliament.bg/js/app.js?id=dd817c677b4b20596aae", { headers: H })).text();
const ctx = (re) => [...js.matchAll(re)].slice(0, 60).map((m) => js.slice(Math.max(0, m.index - 120), m.index + 160));
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/parliament.json", JSON.stringify({ len: js.length, prog: ctx(/prog/gi), api: ctx(/api\/v1/g) }, null, 1));
console.log(js.length);
