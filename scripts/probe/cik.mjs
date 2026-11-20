import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const get = (u, bin) => { try { const b = execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 28 }); return bin ? b : b.toString("utf8"); } catch { return null; } };
writeFileSync("/tmp/m.pdf", get("https://www.montana.bg/os/R720-P36-29.10.26.pdf", true));
console.log("PROBEM", execFileSync("pdftotext", ["-layout", "/tmp/m.pdf", "-"]).toString().slice(0, 2200));
const h = get("http://os.lovech.bg/bg/resheniyabg-1bg-1") ?? "";
const i = h.indexOf("content-text"); console.log("PROBEL", h.slice(i, i + 2500).replace(/\s+/g, " "));
const m = get(encodeURI("https://www.montana.bg/общински-съвет/заседания/решения")) ?? "";
console.log("PROBEMC", [...m.matchAll(/os\/R(\d+)-P(\d+)-([\d.]+)\.pdf/g)].length, [...m.matchAll(/os\/R(\d+)-P(\d+)-([\d.]+)\.pdf/g)].slice(-3).map((x) => x[0]).join(" "));
