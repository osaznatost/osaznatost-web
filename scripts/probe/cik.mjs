import { execFileSync } from "node:child_process";
import { billaAtSearch } from "../lib/billa-at.mjs";
const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
execFileSync("curl", ["-sSLf", "-m", "300", "-o", "/tmp/k.zip", `https://kolkostruva.bg/opendata_files/${d}.zip`]);
execFileSync("unzip", ["-o", "-q", "/tmp/k.zip", "-d", "/tmp/k"]);
const re = "Barilla|Jacobs|Nescaf|Tchibo|Lavazza|Uncle|Fairy|Colgate|Zewa|Elmex|Head|Pampers|Nutella|Hipp|Aptamil|Lindt|Milka|Kinder|Nivea|Dove|Palmolive|Persil|Ariel|Coca|Pepsi|Fanta|Heineken|Monini|Bertolli|Philadelphia|Danone|Activia|Ehrmann|Dr.? ?Oetker|Knorr|Maggi|Kellogg|Nestle|Nesquik|Ritter|Oreo|Pringles|Lay|Haribo|Bonduelle|Mutti|Heinz|Hellmann|Rama|Lurpak|President";
console.log(execFileSync("python3", ["-c", `
import csv,re,collections
c={}
for r in csv.reader(open("/tmp/k/Билла (Билла България ЕООД)_130007884.csv",encoding="utf-8-sig")):
  if len(r)>5 and re.search(r"${re}",r[2],re.I) and r[4].isdigit() and int(r[4])>=33: c[(int(r[4]),r[2].strip())]=r[5]
for (cat,n),p in sorted(c.items()):
  if cat not in (65,64,63,69,67): print(cat,n,p)
`]).toString());
for (const s of ["barilla penne rigate", "barilla fusilli", "lindt excellence", "lindt swiss", "hipp kombiotik", "aptamil pronutra", "jacobs monarch", "jacobs krönung", "nescafe classic", "tchibo", "uncle ben", "zewa toilettenpapier", "colgate max white", "elmex", "head shoulders", "pampers", "nutella", "philadelphia", "bonduelle", "mutti", "kellogg", "nesquik", "dr oetker"]) {
  const r = await billaAtSearch(s); await new Promise((x) => setTimeout(x, 1500));
  console.log("## AT", s, r ? r.length : "null"); for (const p of (r || []).slice(0, 7)) console.log("   ", p.name, "|", p.amount, p.unit, "|", p.price, p.promo ? "PROMO" : "", "|", p.sku);
}
