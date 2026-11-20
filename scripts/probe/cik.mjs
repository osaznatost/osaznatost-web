// Проба: формат на решение на ВТОС
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const get = (u, bin) => { try { const b = execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }); return bin ? b : b.toString("utf8"); } catch (e) { return null; } };
for (const f of ["uploads/posts/2025/2025_12_30_874.pdf"]) {
  const b = get("https://savet.veliko-tarnovo.bg/" + f, true);
  writeFileSync("/tmp/s.pdf", b);
  console.log("PROBEPDF", f, execFileSync("pdftotext", ["-layout", "/tmp/s.pdf", "-"]).toString().slice(0, 3000));
}
const b = get("https://www.burgascouncil.org/sites/default/files/2025-09/za-sayta-28_0.pdf", true);
writeFileSync("/tmp/b.pdf", b);
const t = execFileSync("pdftotext", ["-layout", "/tmp/b.pdf", "-"]).toString();
console.log("PROBEBS", t.length, t.slice(0, 3500));
