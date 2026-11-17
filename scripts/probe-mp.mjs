import { mkdirSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
const js = await (await fetch("https://www.parliament.bg/js/app.js?id=dd817c677b4b20596aae", { headers: H })).text();
const gets = [...new Set([...js.matchAll(/axios\.(?:get|post)\("([^"]+)"/g)].map((m) => m[1]))];
const ctx = [...js.matchAll(/mp-profile|MpProfile|mp_profile|mp-data/gi)].slice(0, 10).map((m) => js.slice(Math.max(0, m.index - 200), m.index + 200));
const out = { gets, ctx, tries: {} };
for (const u of ["mp-profile/bg/3606", "mp-data/bg/3606", "mp/bg/3606", "mp-title/bg/3606"]) {
  for (const method of ["GET", "POST"]) {
    try {
      const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { method, headers: { ...H, "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
      const t = await r.text(); out.tries[`${method} ${u}`] = { s: r.status, t: t.slice(0, 1500) };
    } catch (e) { out.tries[u] = String(e); }
  }
}
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/mp.json", JSON.stringify(out, null, 1));
