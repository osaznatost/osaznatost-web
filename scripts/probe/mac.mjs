import { execFileSync } from "node:child_process";
execFileSync("npm", ["i", "--no-save", "--silent", "pdfjs-dist@4"], { stdio: "inherit" });
const pdfjs = await import(process.cwd() + "/node_modules/pdfjs-dist/legacy/build/pdf.mjs");
const u = "http://dksbt.bg/?a=" + encodeURIComponent("ЦЕНИ и АНАЛИЗИ") + "&p=244";
const t = await (await fetch(u, { headers: { "user-agent": "Mozilla/5.0 osaznatost" } })).text();
const link = t.match(/href="(https:\/\/www\.dksbt\.bg\/doc\/[^"]+?\.pdf)"[^>]*>\s*Дневна справка цени към/)[1];
console.log("## link", decodeURI(link));
const buf = new Uint8Array(await (await fetch(link, { headers: { "user-agent": "Mozilla/5.0 osaznatost" } })).arrayBuffer());
const doc = await pdfjs.getDocument({ data: buf }).promise;
console.log("## pages", doc.numPages);
for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
  const c = await (await doc.getPage(p)).getTextContent();
  const rows = {}; for (const it of c.items) { const y = Math.round(it.transform[5]); (rows[y] ??= []).push([it.transform[4], it.str]); }
  for (const y of Object.keys(rows).sort((a, b) => b - a)) console.log(rows[y].sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(" | "));
}
