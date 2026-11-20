import { execFileSync } from "node:child_process";
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("curl", ["-sSLf", "-m", "300", "-o", "/tmp/k.zip", `https://kolkostruva.bg/opendata_files/${d}.zip`]);
execFileSync("unzip", ["-o", "-q", "/tmp/k.zip", "-d", "/tmp/k"]);
const re = "Milka|Barilla|Nescaf|Jacobs|Lavazza|Coca|Nutella|President|Président|Lurpak|Uncle|Fairy|Colgate|Zewa|Head|Ariel|Kinder|Heineken|Monini|Bertolli|Lindt|Oreo|Tchibo|Dr\\. ?Oetker|Hipp|HiPP|Nestle|Nestlé|Aptamil|Pampers|Nivea|Dove|Palmolive|Elmex|Sensodyne|Persil|Lenor|Ritter";
for (const f of ["Билла (Билла България ЕООД)_130007884.csv", "Лидл България_131071587.csv", "Кауфланд България_131129282.csv"]) {
  console.log("## BG", f);
  console.log(execFileSync("python3", ["-c", `
import csv,re,collections
c=collections.Counter(); pr={}
for r in csv.reader(open("/tmp/k/${f}",encoding="utf-8-sig")):
  if len(r)>5 and re.search(r"${re}",r[2],re.I): c[(r[2].strip(),r[4])]+=1; pr[(r[2].strip(),r[4])]=r[5]
for (n,cat),k in sorted(c.items(), key=lambda x:(int(x[0][1]) if x[0][1].isdigit() else 0)): print(cat, n, pr[(n,cat)], k)
`]).toString().split("\n").slice(0, 70).join("\n"));
}
const q = async (s) => { const r = await fetch(`https://shop.billa.at/api/product-discovery/products?searchTerm=${encodeURIComponent(s)}&page=0&pageSize=6&storeId=00-10`, { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } }); const j = await r.json(); return (j.results || []).map((p) => `${p.name} | ${p.amount}${p.volumeLabelShort} | ${(p.price?.regular?.value / 100).toFixed(2)}€`); };
for (const s of ["Milka Alpenmilch 100g", "Barilla Spaghetti", "Nescafe Classic", "Jacobs Krönung", "Coca-Cola 2l", "Nutella", "Fairy", "Colgate", "Zewa", "Lavazza", "Uncle Bens", "Ariel"]) console.log("## AT", s, JSON.stringify(await q(s)));
