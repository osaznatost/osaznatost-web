import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
for (const [u, n] of [["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/56755/R-426-30.10.2026_g..pdf", "a.pdf"], ["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/52841/R-350-29.08.2025_g..docx", "b.docx"], ["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/51654/R_135_25.04.2025%D0%B3_30.04.2025.doc", "c.doc"]]) {
  try { execFileSync("curl", ["-sSLf", "-m", "90", "-A", UA, "-o", "out/" + n, u]); console.log("ok", n); } catch { console.log("ERR", u); }
}
