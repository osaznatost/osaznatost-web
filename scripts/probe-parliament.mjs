// Проба: кои адреси на API-то на Народното събрание дават програмата и законопроектите.
import { mkdirSync, writeFileSync } from "node:fs";
const B = "https://www.parliament.bg/api/v1";
const names = ["pl-program/bg", "plenary-program/bg", "pl-prog/bg", "program/bg", "pl-week/bg", "week-program/bg", "pl-programs/bg", "plprogram/bg", "fn-bills", "pl-sten-list/bg", "pl-sten/bg"];
const out = {};
for (const n of names) for (const method of ["POST", "GET"]) {
  try {
    const r = await fetch(`${B}/${n}`, { method, headers: { "Content-Type": "application/json", Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/" }, body: method === "POST" ? "{}" : undefined });
    const t = await r.text();
    out[`${method} ${n}`] = { status: r.status, len: t.length, head: t.slice(0, 600) };
    console.log(method, n, r.status, t.length);
  } catch (e) { out[`${method} ${n}`] = { error: e.message }; }
}
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/parliament.json", JSON.stringify(out, null, 1));
