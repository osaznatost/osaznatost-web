import { execFileSync } from "node:child_process";
const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } }); return [r.status, await r.text()]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), ""]; } };
for (const u of ["https://www.dksbt.bg", "https://dksbt.bg", "https://www.dksbt.bg/bg/", "https://www.dksbt.bg/bg/bjuletin"]) {
  const [s, t] = await get(u); console.log("## DKSBT", u, s, t.length);
  for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].filter(m => /бюлетин|бюлетен|цени|pdf|xls|bulletin/i.test(m[1] + m[2])).slice(0, 25)) console.log("   ", m[2].replace(/<[^>]+>/g, "").trim().slice(0, 60), "=>", m[1]);
}
for (const u of ["https://shop.billa.at/api/products?pageSize=1&category=milch", "https://shop.billa.at/", "https://shop.billa.cz/", "https://www.lidl.de/", "https://www.kaufland.de/", "https://www.lidl.ro/", "https://www.kaufland.ro/", "https://www.billa.ro/", "https://www.lidl-hellas.gr/", "https://www.kaufland.bg/"]) {
  const [s, t] = await get(u); console.log("## SHOP", u, s, t.length, (t.match(/<title>([^<]*)/) || [])[1]);
}
// kolkostruva sample names
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("curl", ["-sSLf", "-m", "300", "-o", "/tmp/k.zip", `https://kolkostruva.bg/opendata_files/${d}.zip`]);
execFileSync("unzip", ["-o", "-q", "/tmp/k.zip", "-d", "/tmp/k"]);
const files = execFileSync("ls", ["/tmp/k"]).toString().split("\n").filter(Boolean);
console.log("## files", files.length, files.slice(0, 80).join(" | "));
for (const f of files.filter(f => /Лидл|Кауфланд|Kaufland|Билла|BILLA|Билла|Lidl|T Market|Фантастико|ФАНТАСТИКО/i.test(f)).slice(0, 6)) {
  const rows = execFileSync("bash", ["-c", `awk -F, 'NR>1 && ($5==6 || $5==12 || $5==38 || $5==42 || $5==31 || $5==35)' "/tmp/k/${f}" | cut -d, -f3-6 | sort -u | head -25`]).toString();
  console.log("## PROD", f, "\n" + rows);
}
