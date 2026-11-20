import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const B = "https://iisda.government.bg";
const m = get(B + "/ras/adm_structures/ministry_organigram/90");
for (const x of m.matchAll(/(url\s*[:=]\s*['"][^'"]+['"]|\$\.(?:get|post|ajax|getJSON)\([^)]{0,200}|fetch\([^)]{0,200}|src="[^"]+\.js[^"]*"|data-[a-z-]+="[^"]{0,120}")/gi)) console.log("PROBE", x[0].slice(0, 250));
const i = m.indexOf("Към дата"); console.log("PROBECTX", m.slice(i - 1500, i + 2500).replace(/\s+/g, " "));
