// Проба: къде общинските съвети на Бургас, Пловдив и Плевен публикуват решенията си
import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return "ERR " + e.message.slice(0, 100); } };
const pages = ["https://www.burgascouncil.org/", "https://www.burgascouncil.org/resheniya", "https://www.plovdiv.bg/", "https://obs.plovdiv.bg/", "https://www.pleven.bg/bg/obshtinski-savet", "https://www.pleven.bg/", "https://www.veliko-tarnovo.bg/bg/obshtinski-savet/", "https://shumen.bg/"];
for (const u of pages) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([^<]{0,80})/g)].filter(([, a, t]) => /reshen|решени|obshtinski|съвет|savet|council|protokol/i.test(a + t)).map(([, a, t]) => a + " | " + t.trim()))].slice(0, 25);
  console.log("PROBE", u, h.length, h.slice(0, 80).replace(/\s+/g, " "));
  for (const l of links) console.log("PROBE  ", l);
}
