import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "120", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 28 }).toString(); } catch (e) { return ""; } };
const x = get("https://register.cacbg.bg/2026/list.xml");
console.log("## list.xml", x.length); console.log(x.slice(0, 3000));
const files = [...x.matchAll(/<(?:FileName|File|Link|Url)[^>]*>([^<]+)</g)].map((m) => m[1]);
console.log("## files", files.length, files.slice(0, 5));
const f = files[0]; if (f) { const u = new URL(f, "https://register.cacbg.bg/2026/").href; const d = get(u); console.log("## DECL", u, d.length); console.log(d.slice(0, 6000)); }
