import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const B = "https://iisda.government.bg";
const m = get(B + "/ras/adm_structures/ministry_organigram/88");
const s = m.indexOf("init(") + 5; let d = 0, e = s;
for (; e < m.length; e++) { if (m[e] === "{") d++; else if (m[e] === "}") { d--; if (!d) { e++; break; } } }
const tree = JSON.parse(m.slice(s, e));
const walk = (n, depth = 0, out = []) => { out.push("  ".repeat(depth) + n.id + " | " + n.name + " | " + JSON.stringify(n.data).slice(0, 150)); (n.children ?? []).forEach((c) => walk(c, depth + 1, out)); return out; };
const lines = walk(tree); console.log("PROBEN", lines.length); for (const l of lines.slice(0, 70)) console.log("PROBE", l.slice(0, 260));
for (const x of m.matchAll(/xajax_[a-zA-Z_]+/g)) console.log("PROBEX", x[0]);
const js = get(B + "/js/jit/organogram.js"); for (const x of js.matchAll(/(xajax_[a-zA-Z_]+\([^)]*\)|url[^;]{0,120})/g)) console.log("PROBEJS", x[0].slice(0, 200));
