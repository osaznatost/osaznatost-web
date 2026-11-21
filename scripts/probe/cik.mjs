import { execSync } from "node:child_process"; import { writeFileSync } from "node:fs";
const H={"user-agent":"Mozilla/5.0 (osaznatost.bg; open data)"};
const t=await (await fetch("https://www.nsi.bg/press-release/inflaciya-i-indeksi-na-potrebitelskite-ceni-oktomvri-2026-godina-9216",{headers:H})).text();
const i=t.indexOf("Общ ИПЦ"); console.log("## NSIROW", JSON.stringify(t.slice(i-300,i+900).replace(/\s+/g," ")));
console.log("## TABLES", (t.match(/<table/g)||[]).length);
const b=Buffer.from(await (await fetch("https://bnb.bg/bnbweb/groups/public/documents/bnb_download/202609_s_irs_press_a1_bg.pdf",{headers:H})).arrayBuffer());
writeFileSync("/tmp/a1.pdf",b);
try{ console.log("## which", execSync("which pdftotext").toString()); }catch{ execSync("sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1"); }
const txt=execSync("pdftotext -layout /tmp/a1.pdf -").toString();
console.log("## PDFLEN", txt.length);
for (const line of txt.split("\n").filter(l=>/жилищ|потребление|договорен матуритет|Домакинства/i.test(l)).slice(0,20)) console.log("## L", JSON.stringify(line));
