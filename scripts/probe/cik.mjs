import { execFileSync } from "node:child_process";
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("curl", ["-sSLf", "-m", "300", "-o", "/tmp/k.zip", `https://kolkostruva.bg/opendata_files/${d}.zip`]);
execFileSync("unzip", ["-o", "-q", "/tmp/k.zip", "-d", "/tmp/k"]);
const files = execFileSync("ls", ["/tmp/k"]).toString().split("\n").filter(Boolean);
for (const f of files.filter(f => /Лидл|Кауфланд|Билла/i.test(f))) {
  console.log("## HEAD", f); console.log(execFileSync("bash", ["-c", `head -3 "/tmp/k/${f}"; wc -l < "/tmp/k/${f}"`]).toString());
  console.log("## SAMPLE"); console.log(execFileSync("bash", ["-c", `grep -iE 'мляко|масло|олио|захар|брашно|ориз|яйца|Milka|Coca|Nescaf|Barilla|Jacobs|Pilos|Clever|K-Classic' "/tmp/k/${f}" | cut -d, -f3- | sort -u -t, -k1,1 | head -60`]).toString());
}
const r = await fetch("https://shop.billa.at/", { headers: { "user-agent": "Mozilla/5.0 osaznatost" } }); const t = await r.text();
console.log("## BILLA AT api hints", [...new Set([...t.matchAll(/https?:\/\/[a-z0-9.-]*billa[a-z0-9.-]*\/api[^"'\s\\]*/g)].map(m => m[0]))].slice(0, 20));
console.log("## BILLA AT /api paths", [...new Set([...t.matchAll(/["'](\/api\/[^"'\s\\]{3,80})/g)].map(m => m[1]))].slice(0, 30));
for (const u of ["https://shop.billa.at/api/product-discovery/search?searchTerm=milch&page=0&pageSize=3", "https://shop.billa.at/api/products/search/milch?pageSize=3", "https://shop.billa.cz/api/product-discovery/search?searchTerm=mleko&page=0&pageSize=3"]) {
  try { const x = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } }); console.log("## TRY", u, x.status, (await x.text()).slice(0, 600)); } catch (e) { console.log("## TRY", u, e.message); }
}
