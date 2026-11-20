import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const y of ["2024-g", "2023-g", "2025-g"]) {
  const h = get(`https://shumen.bg/bg/resheniya/resheniya-na-os-${y}`);
  const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((a) => !/\.css|\.js|^#|facebook|mailto|^bg\/[a-z-]+$/.test(a));
  const kinds = {}; for (const a of hrefs) { const k = a.replace(/\d+/g, "N").slice(0, 60); kinds[k] = (kinds[k] ?? 0) + 1; }
  console.log("PROBE", y, JSON.stringify(Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 12)));
  const i = h.search(/РЕШЕНИЕ\s*№\s*\d+/); console.log("PROBEH", h.slice(i - 500, i + 200).replace(/\s+/g, " "));
}
