import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync } from "node:fs";
execFileSync("node", ["scripts/import-macro.mjs"], { stdio: "inherit" });
console.log("## bnb", readFileSync("data/macro/bnb-rates.json","utf8").replace(/\s+/g," "));
const b=Buffer.from(await (await fetch("https://bnb.bg/bnbweb/groups/public/documents/bnb_download/202608_s_irs_press_a1_bg.pdf")).arrayBuffer()); writeFileSync("/tmp/a.pdf",b);
const t=execFileSync("pdftotext",["-layout","/tmp/a.pdf","-"]).toString().replace(/\s+/g," ");
for (const k of ["кредитите за потребление","договорен матуритет"]) { let i=-1; let n=0; while((i=t.indexOf(k,i+1))>=0 && n<4){ console.log("## AUG",k,JSON.stringify(t.slice(i-30,i+140))); n++; } }
