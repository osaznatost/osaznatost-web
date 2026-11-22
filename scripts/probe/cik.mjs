import { execFileSync } from "node:child_process"; import { writeFileSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)";
for (const [u,kind] of [["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/56755/R-426-30.10.2026_g..pdf","pdf"],["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/52841/R-350-29.08.2025_g..docx","docx"],["https://admin.blagoevgrad.bg/ckeditor_assets/attachments/51654/R_135_25.04.2025%D0%B3_30.04.2025.doc","doc"]]) {
  let b; try { b = execFileSync("curl", ["-sSLf", "-m", "120", "--retry", "3", "-A", UA, u], { maxBuffer: 1 << 28 }); } catch (e) { console.log("## ERR", u); continue; }
  writeFileSync("/tmp/x."+kind, b); let t = "";
  try { t = kind==="pdf" ? execFileSync("pdftotext", ["-layout", "/tmp/x.pdf", "-"]).toString() : kind==="docx" ? execFileSync("unzip", ["-p", "/tmp/x.docx", "word/document.xml"]).toString().replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "") : "(doc binary "+b.length+")"; } catch (e) { t = "parse err "+e.message; }
  console.log("##", u, b.length, t.length);
  t.slice(0, 5000).split("\n").forEach((l) => console.log("## |", l));
  const ms=[...t.matchAll(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е[^\n]{0,60}/g)].slice(0,8); ms.forEach(m=>console.log("## HDR",JSON.stringify(m[0])));
}
