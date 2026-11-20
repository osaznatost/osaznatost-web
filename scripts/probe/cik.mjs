import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const get = (u, bin) => { try { const b = execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 28 }); return bin ? b : b.toString("utf8"); } catch { return null; } };
const h = get("http://os.lovech.bg/bg/resheniyabg-1bg-1") ?? "";
const i = h.indexOf("resheniyabg-1bg-1/"); console.log("PROBEL", h.slice(i - 3000, i + 300).replace(/\s+/g, " "));
const u = [...h.matchAll(/href="([^"]+\.(?:pdf|docx?))"/gi)].map((m) => m[1]); console.log("PROBEU", u.slice(0, 5).join(" "), u.length);
if (u[0]) { const b = get((u[0].startsWith("http") ? "" : "http://os.lovech.bg/") + u[0], true); writeFileSync("/tmp/l.pdf", b); try { console.log("PROBEPDF", execFileSync("pdftotext", ["-layout", "/tmp/l.pdf", "-"]).toString().slice(0, 1800)); } catch (e) { console.log("PROBEPDF fail", b?.slice(0, 8).toString()); } }
