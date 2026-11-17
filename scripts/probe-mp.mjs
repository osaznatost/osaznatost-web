import { mkdirSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/json" };
const out = {};
for (const [m, u, b] of [["POST", "fn-mps", "{}"], ["GET", "coll-list-mp/bg/0", null], ["GET", "coll-list/bg/1", null], ["GET", "coll-list-ns/bg", null]]) {
  try {
    const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { method: m, headers: H, body: b ?? undefined });
    const t = await r.text(); out[`${m} ${u}`] = { s: r.status, n: t.length, t: t.slice(0, 2500) };
  } catch (e) { out[u] = String(e); }
}
const prof = await (await fetch("https://www.parliament.bg/api/v1/mp-profile/bg/3606", { headers: H })).json();
out.profileKeys = Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 200) : Array.isArray(v) ? `[${v.length}] ${JSON.stringify(v[0] ?? null).slice(0, 300)}` : v]));
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/mp.json", JSON.stringify(out, null, 1));
