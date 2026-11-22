import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
for (const [u, f] of [["https://obs.kyustendil.bg/uploads/mandat2023-2027/protokoli/40_Prototkol_40_29.10.2026 .pdf".replace(/ /g, "%20"), "p40.pdf"], ["https://obs.kyustendil.bg/Documents/protokoli/Protokol15_26.09.2024.pdf", "p15.pdf"]]) {
  try { execFileSync("curl", ["-sSLf", "-m", "120", "-A", UA, "-o", "out/" + f, u]); } catch { console.log("## ERR", u); continue; }
  const t = execFileSync("pdftotext", ["-layout", "out/" + f, "-"], { maxBuffer: 1 << 28 }).toString();
  console.log("## FILE", f, t.length, "решения:", (t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n?\s*№\s*\d+/g) ?? []).length, "гласували:", (t.match(/гласувал/gi) ?? []).length);
  const i = t.search(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n?\s*№\s*\d+/); t.slice(Math.max(0, i - 2500), i + 1500).split("\n").forEach((l) => console.log("## |", l));
}
