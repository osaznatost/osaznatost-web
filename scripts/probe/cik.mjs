import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
const curl = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", UA, u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u); return ""; } };
const dec = (s) => s.replace(/&#x([0-9A-F]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
for (const u of ["https://obs.kyustendil.bg/reshenia-obs", "https://obs.kyustendil.bg/protokoli-obs"]) {
  const o = curl(u); const t = dec(o.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " | ").replace(/(\s*\|\s*)+/g, " | ").replace(/\s+/g, " "));
  console.log("## PAGE", u, o.length); console.log("## TXT", t.slice(0, 3500));
  [...new Set([...o.matchAll(/(?:href|src)="([^"]{3,200})"/g)].map((m) => m[1]))].filter((x) => /\.pdf|\.doc|files|upload|document/i.test(x)).slice(0, 30).forEach((x) => console.log("## L", x));
}
execFileSync("curl", ["-sSL", "-m", "90", "-A", UA, "-o", "out/k14.pdf", "https://kyustendil.bg/index.php?option=com_jdownloads&task=download.send&id=5403&catid=9&m=0&lang=bg"]);
const t = execFileSync("pdftotext", ["-layout", "out/k14.pdf", "-"], { maxBuffer: 1 << 27 }).toString(); console.log("## K14 len", t.length);
t.slice(0, 5000).split("\n").forEach((l) => console.log("## |", l));
