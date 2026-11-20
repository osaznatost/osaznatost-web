import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 27 }).toString(); } catch (e) { return ""; } };
const t = get("https://register.cacbg.bg/2026/index.html");
console.log(t);
for (const f of [...t.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((x) => /\.(js|json|xml|html)$/.test(x)).slice(0, 5)) { const u = new URL(f, "https://register.cacbg.bg/2026/").href; const x = get(u); console.log("## FILE", u, x.length); console.log(x.slice(0, 2500)); }
