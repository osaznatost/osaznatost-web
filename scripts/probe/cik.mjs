const H = { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" };
const tryj = async (u, opt = {}) => { try { const r = await fetch(u, { ...opt, headers: { ...H, ...(opt.headers || {}) }, signal: AbortSignal.timeout(25000) }); const t = await r.text(); console.log("## TRY", u.slice(0, 140), r.status, t.slice(0, 900).replace(/\s+/g, " ")); return t; } catch (e) { console.log("## TRY", u.slice(0, 140), "ERR", e.cause?.code || e.message); } };
for (const slug of ["vorratsschrank-15012", "nudeln-und-reis-15027"]) {
  const t = await tryj(`https://shop.billa.at/api/product-discovery/products?categorySlug=${slug}&page=0&pageSize=500&storeId=00-10`);
  try { const j = JSON.parse(t); console.log("## AT", slug, "total", j.total, "got", j.results.length, j.results.slice(0, 5).map((p) => p.name + " " + p.amount + p.volumeLabelShort + " " + p.price.regular.value)); } catch {}
}
await tryj("https://shop.billa.at/api/categories?storeId=00-10");
await tryj("https://shop.billa.at/api/product-discovery/categories?storeId=00-10");
await tryj("https://www.mega-image.ro/api/v1/?operationName=GetProductSearch&variables=" + encodeURIComponent(JSON.stringify({ searchQuery: "barilla", pageSize: 5, currentPage: 0, lang: "ro" })), { headers: { "apollo-require-preflight": "true", "x-apollo-operation-name": "GetProductSearch" } });
const html = await (await fetch("https://www.mega-image.ro/search?q=barilla", { headers: H })).text();
const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); console.log("## MI next data", m ? m[1].length : 0, m ? m[1].slice(0, 300) : "");
console.log("## MI prices in html", [...html.matchAll(/"price":\{[^}]{0,200}\}/g)].slice(0, 3).map((x) => x[0]));
console.log("## MI hashes", [...new Set([...html.matchAll(/sha256Hash[^0-9a-f]{0,6}([0-9a-f]{64})/g)].map((x) => x[1]))].slice(0, 5));
