import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const get = (u, bin) => { try { const b = execFileSync("curl", ["-sSL", "-m", "90", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 28 }); return bin ? b : b.toString("utf8"); } catch { return null; } };
const b = get("https://obs.pleven.bg/uploads/posts/protokol-50.docx", true);
writeFileSync("/tmp/p.docx", b);
const t = execFileSync("sh", ["-c", "unzip -p /tmp/p.docx word/document.xml | sed -e 's/<\\/w:p>/\\n/g; s/<[^>]*>//g'"], { maxBuffer: 1 << 28 }).toString();
console.log("PROBE", t.length);
const j = t.search(/гласува/i); console.log("PROBE1", t.slice(j - 2500, j + 1800)); console.log("PROBEN", [...t.matchAll(/Р\s?Е\s?Ш\s?Е\s?Н\s?И\s?Е/g)].length, [...t.matchAll(/Решение\s*№\s*(\d+)/g)].length);
const h = get("http://obs.pleven.bg/bg/protokoli-i-resheniya/page/48") ?? ""; console.log("PROBEPG", [...h.matchAll(/protokol-\d+-ot-\d+-g/g)].map((m) => m[0]).join(" "));
