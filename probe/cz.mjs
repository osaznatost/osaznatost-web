import { billaCzSearch } from "../scripts/lib/billa-at.mjs";
for (const t of ["barilla spaghetti","barilla penne","barilla fusilli","monini","mutti","bonduelle fazole","lavazza","elmex","colgate max white","milka","kinder","lindt lindor"]) {
  const r = await billaCzSearch(t).catch((e) => String(e));
  console.log("##", t); if (Array.isArray(r)) for (const p of r.slice(0, 12)) console.log("  ", p.sku, "|", p.name, "|", p.amount, p.unit, "|", p.price, p.promo ? "promo" : ""); else console.log(r);
  await new Promise((s) => setTimeout(s, 1500));
}
