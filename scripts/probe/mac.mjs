import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "120", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 28 }).toString(); } catch (e) { return ""; } };
const x = get("https://register.cacbg.bg/2026/list.xml");
const files = [...x.matchAll(/<xmlFile>([^<]+)<\/xmlFile>/g)].map((m) => m[1]);
let shown = 0;
for (const f of files.slice(800, 3000)) {
  const d = get("https://register.cacbg.bg/2026/" + f);
  const t = d.match(/<Table Num="10" Description="([^"]*)" Declared="True">([\s\S]*?)<\/Table>/);
  if (!t) continue;
  console.log("## T10", f, t[1]);
  console.log(t[2].replace(/\s+/g, " ").slice(0, 2500));
  const t11 = d.match(/<Table Num="11" Description="([^"]*)"/); console.log("## T11", t11 && t11[1]);
  if (++shown >= 2) break;
}
for (const y of ["2023", "2024"]) { const l = get(`https://register.cacbg.bg/${y}/list.xml`); console.log("## year", y, l.length, (l.match(/<xmlFile>/g) || []).length); }
