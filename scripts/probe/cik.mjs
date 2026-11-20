import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const b = execFileSync("curl", ["-sSL", "-m", "90", "-A", "Mozilla/5.0 (osaznatost)", "https://obs.sliven.bg/uploads/D15EF28F5DD9A922F04AC1A4932E5160"], { maxBuffer: 1 << 28 });
writeFileSync("/tmp/s.bin", b);
console.log("PROBE head", b.slice(0, 8).toString("latin1"), b.length);
let t = "";
try { t = execFileSync("pdftotext", ["-layout", "/tmp/s.bin", "-"], { maxBuffer: 1 << 28 }).toString(); } catch { t = execFileSync("sh", ["-c", "unzip -p /tmp/s.bin word/document.xml | sed -e 's/<\\/w:p>/\\n/g; s/<[^>]*>//g'"], { maxBuffer: 1 << 28 }).toString(); }
console.log("PROBE", t.length, t.slice(0, 2500));
const i = t.indexOf("РЕШЕНИЕ", 3000); console.log("PROBE2", t.slice(i, i + 1500));
