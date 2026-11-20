import { execFileSync } from "node:child_process";
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("curl", ["-sSLf", "-m", "300", "-o", "/tmp/k.zip", `https://kolkostruva.bg/opendata_files/${d}.zip`]);
execFileSync("unzip", ["-o", "-q", "/tmp/k.zip", "-d", "/tmp/k"]);
console.log(execFileSync("bash", ["-c", `cd /tmp/k; for f in *Лидл* *Билла*; do echo "## $f"; ls -la "$f"; file "$f"; head -c 600 "$f" | iconv -f utf-16 -t utf-8 2>/dev/null | head -5; echo; head -c 400 "$f" | od -c | head -5; done`]).toString());
for (const u of ["https://shop.billa.at/api/product-discovery/products?page=0&pageSize=3&storeId=00-10", "https://shop.billa.at/api/product-discovery/products?categorySlug=milchprodukte&page=0&pageSize=3&storeId=00-10", "https://shop.billa.cz/api/product-discovery/products?page=0&pageSize=3"]) {
  try { const x = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } }); console.log("## TRY", u, x.status, (await x.text()).slice(0, 900)); } catch (e) { console.log("## TRY", u, e.message); }
}
