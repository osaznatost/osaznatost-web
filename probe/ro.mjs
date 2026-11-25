const UA = { "user-agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
const sl = (ms) => new Promise((s) => setTimeout(s, ms));
const C = ["barilla spaghetti","barilla penne","barilla fusilli","monini","mutti","bonduelle fasole","lavazza","elmex","colgate max white purple","milka","milka oreo","kinder chocolate","lindt lindor"];
for (const t of C) {
  const html = await (await fetch(`https://carrefour.ro/catalogsearch/result/?q=${encodeURIComponent(t)}`, { headers: UA })).text();
  const seen = new Set(); console.log("## C", t);
  for (const m of html.matchAll(/"id":"(\d+)","name":"([^"]+)","brand":"[^"]*","price":([\d.]+)/g)) { if (seen.has(m[1])) continue; seen.add(m[1]); if (seen.size <= 25) console.log("   ", m[1], "|", m[2], "|", m[3]); }
  await sl(2000);
}
const A = ["monini","mutti","milka","lindt lindor 100","kinder chocolate 100","elmex junior","elmex sensitive professional","barilla penne rigate 500","kinder schokolade"];
for (const t of A) {
  const j = await (await fetch(`https://www.auchan.ro/api/catalog_system/pub/products/search?ft=${encodeURIComponent(t)}&_from=0&_to=19`, { headers: UA })).json().catch(() => []);
  console.log("## A", t); for (const p of j) { const o = p.items[0].sellers[0].commertialOffer; console.log("   ", p.items[0].ean, "|", p.productName, "|", o.Price, o.ListPrice, o.AvailableQuantity); }
  await sl(1500);
}
