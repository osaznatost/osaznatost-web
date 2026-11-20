import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const u of ["https://obs.sliven.bg/decisions", "https://www.plovdiv.bg/общински-съвет/дневен-ред/"]) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|decision|\.pdf|\.doc|протокол|page|year/i.test(l)))];
  console.log("PROBE", u, h.length); const i=h.search(/Решение\s*№|РЕШЕНИЕ/); console.log("PROBETXT", h.slice(Math.max(0,i-200), i+600).replace(/\s+/g," "));
  for (const l of links.slice(0, 40)) console.log("PROBE  ", l.slice(0, 180));
}
