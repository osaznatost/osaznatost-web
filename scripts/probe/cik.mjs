// Проба: формат на решенията на ОбС Шумен
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const get = (u, bin) => { try { const b = execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }); return bin ? b : b.toString("utf8"); } catch (e) { return null; } };
for (const y of ["2026-g", "2025-g", "2024-g", "2023-g"]) {
  const h = get(`https://shumen.bg/bg/resheniya/resheniya-na-os-${y}`) ?? "";
  const nums = [...h.matchAll(/РЕШЕНИЕ\s*№\s*(\d+)/g)].map((m) => +m[1]);
  const pdfs = new Set([...h.matchAll(/uploads\/posts\/\d{4}\/\d+\.pdf/g)].map((m) => m[0]));
  console.log("PROBE", y, h.length, "решения:", nums.length, "мин", Math.min(...nums), "макс", Math.max(...nums), "pdf:", pdfs.size, "страници:", [...h.matchAll(/resheniya-na-os-[^"]*page\/\d+/g)].map((m) => m[0]).slice(0, 5).join(" "));
}
const h = get("https://shumen.bg/bg/resheniya/resheniya-na-os-2025-g");
const i = h.indexOf("25641.pdf");
console.log("PROBEHTML", h.slice(i - 900, i + 400).replace(/\s+/g, " "));
for (const f of ["2025/25641.pdf", "2025/25630.pdf"]) {
  const b = get("https://shumen.bg/uploads/posts/" + f, true);
  writeFileSync("/tmp/s.pdf", b);
  console.log("PROBEPDF", f, execFileSync("pdftotext", ["-layout", "/tmp/s.pdf", "-"]).toString().slice(0, 2500));
}
