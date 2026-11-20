import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", "-w", "\nHTTP%{http_code}", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return "ERR"; } };
for (const u of ["https://iisda.government.bg/", "https://iisda.government.bg/adm_structures/central_state_administration", "https://www.gov.bg/bg/ministerski-savet/sastav-na-ministerskiya-savet", "https://www.gov.bg/bg/ministerstva"]) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,90}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /министер|ministr|structure|адм|open|данни|api|export/i.test(l)))];
  console.log("PROBE", u, h.length, h.slice(-8));
  for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 170));
}
