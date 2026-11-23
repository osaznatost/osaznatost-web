import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
execFileSync("curl", ["-sSLf", "-m", "120", "-A", UA, "-o", "out/p40.pdf", "https://obs.kyustendil.bg/uploads/mandat2023-2027/protokoli/40_Prototkol_40_29.10.2026%20.pdf"]);
const t = execFileSync("pdftotext", ["-layout", "out/p40.pdf", "-"], { maxBuffer: 1 << 28 }).toString();
const i = t.indexOf("№ 1106"); const j = t.indexOf("РЕШЕНИЕ", i + 10);
console.log("## span", i, j); t.slice(Math.max(i, j - 4500), j).split("\n").forEach((l) => console.log("## |", l));
console.log("## RESHI forms", JSON.stringify([...new Set([...t.matchAll(/[^\n]{0,30}Р\s*Е\s*Ш\s*И[^\n]{0,10}|[^\n]{0,30}реши[^\n]{0,10}/gi)].map((m) => m[0]))].slice(0, 20)));
