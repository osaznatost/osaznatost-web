const x = await fetch("https://shop.billa.at/api/product-discovery/products?categorySlug=milchprodukte&page=0&pageSize=2&storeId=00-10", { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } });
const j = await x.json();
console.log("## keys", Object.keys(j), "total", j.total ?? j.count);
console.log("## product", JSON.stringify(j.results?.[0] ?? j.products?.[0] ?? j.items?.[0]).slice(0, 2500));
const s = await fetch("https://shop.billa.at/api/product-discovery/products?searchTerm=milka&page=0&pageSize=5&storeId=00-10", { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } });
const k = await s.json(); console.log("## search milka", s.status, (k.results || []).map(p => [p.name, p.price?.regular?.value ?? JSON.stringify(p.price).slice(0, 120), p.packageLabel]).slice(0, 5));
for (const u of ["https://shop.billa.cz/api/product-discovery/products?searchTerm=milka&page=0&pageSize=3&storeId=00-10", "https://shop.billa.sk/api/product-discovery/products?searchTerm=milka&page=0&pageSize=3"]) {
  try { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" } }); console.log("## TRY", u, r.status, r.headers.get("content-type"), (await r.text()).slice(0, 300)); } catch (e) { console.log("## TRY", u, e.message); }
}
