// Проба: решения на ОбС Бургас, Плевен, Велико Търново
import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
for (const u of ["https://www.burgascouncil.org/node/2513", "https://savet.veliko-tarnovo.bg/bg/resheniya-2025-godina/resheniya-saglasno-protokol-34-ot-30122025-g"]) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => !/css|\.js|facebook|twitter|#|mailto|tel:/.test(l)))];
  console.log("PROBE", u, h.length, links.length);
  for (const l of links.filter((l) => /files|upload|node|reshen/i.test(l)).slice(0, 40)) console.log("PROBE  ", l.slice(0, 200));
  const i = h.search(/Решение\s*№|РЕШЕНИЕ\s*№/);
  console.log("PROBETXT", i, h.slice(Math.max(0, i - 300), i + 700).replace(/\s+/g, " "));
}
