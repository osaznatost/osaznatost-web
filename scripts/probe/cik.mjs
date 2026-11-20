const H = { "user-agent": "Mozilla/5.0 osaznatost", accept: "application/json" };
const tryj = async (u, opt = {}) => { try { const r = await fetch(u, { headers: H, ...opt, signal: AbortSignal.timeout(25000) }); const t = await r.text(); console.log("## TRY", u.slice(0, 150), r.status, r.headers.get("content-type"), t.slice(0, 700).replace(/\s+/g, " ")); return t; } catch (e) { console.log("## TRY", u.slice(0, 150), "ERR", e.cause?.code || e.message); } };
const t = await tryj("https://shop.billa.at/api/product-discovery/products?page=0&pageSize=500&storeId=00-10");
try { const j = JSON.parse(t); console.log("## AT total", j.total, "got", j.results.length, j.isTotalTruncated); } catch {}
await tryj("https://shop.billa.at/api/product-discovery/products?page=40&pageSize=500&storeId=00-10");
await tryj("https://shop.billa.at/api/product-discovery/search/products?searchTerm=barilla&page=0&pageSize=5&storeId=00-10");
await tryj("https://shop.billa.at/api/product-discovery/products?search=barilla&page=0&pageSize=5&storeId=00-10");
await tryj("https://shop.billa.at/api/product-discovery/products?q=barilla&page=0&pageSize=5&storeId=00-10");
await tryj("https://www.mega-image.ro/api/v1/?operationName=GetProductSearch&variables=" + encodeURIComponent(JSON.stringify({ searchQuery: "barilla", pageSize: 5, currentPage: 0, lang: "ro" })));
await tryj("https://www.mega-image.ro/search?q=barilla");
await tryj("https://www.ab.gr/api/v1/?operationName=GetProductSearch&variables=" + encodeURIComponent(JSON.stringify({ searchQuery: "barilla", pageSize: 5, currentPage: 0, lang: "gr" })));
await tryj("https://www.konzum.hr/web/search?q=barilla");
await tryj("https://www.carrefour.ro/catalogsearch/result/?q=barilla");
