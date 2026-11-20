const H = { "user-agent": "Mozilla/5.0 osaznatost" };
const html = await (await fetch("https://www.mega-image.ro/search?q=barilla", { headers: H })).text();
const nd = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
const s = JSON.stringify(nd); let i = s.search(/"name":"[^"]*Barilla/i); console.log("## MI barilla at", i, s.slice(Math.max(0, i - 300), i + 900));
console.log("## MI apollo keys", Object.keys(nd.props?.pageProps || {}).slice(0, 30), Object.keys(nd.props?.apolloState || nd.props?.pageProps?.apolloState || {}).slice(0, 10));
for (const u of ["https://shop.billa.at/suche/barilla", "https://shop.billa.at/search?q=barilla", "https://shop.billa.at/kategorie/vorratsschrank/nudeln-und-reis-15027"]) {
  const r = await fetch(u, { headers: H }); const t = await r.text();
  const j = t.indexOf("Barilla"); console.log("## AT", u, r.status, t.length, "barilla at", j, t.slice(Math.max(0, j - 200), j + 400).replace(/\s+/g, " "));
  console.log("## AT api urls", [...new Set([...t.matchAll(/\/api\/[a-zA-Z0-9\-\/]+/g)].map((m) => m[0]))].slice(0, 30));
}
