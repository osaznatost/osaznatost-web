// Проба 4: седмичната програма на Народното събрание.
import { mkdirSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/plenaryprogram", Accept: "application/json" };
const out = {};
for (const u of ["plenaryprogram/bg/0", "plenaryprogram/bg", "plenaryprogram-list/bg"]) {
  for (const method of ["GET", "POST"]) {
    try {
      const r = await fetch("https://www.parliament.bg/api/v1/" + u, { method, headers: { ...H, "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
      const t = await r.text();
      out[method + " " + u] = { status: r.status, len: t.length, body: t.slice(0, 6000) };
    } catch (e) { out[method + " " + u] = { error: String(e) }; }
  }
}
mkdirSync("data/_probe", { recursive: true });
writeFileSync("data/_probe/parliament.json", JSON.stringify(out, null, 1));
