const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
for (const u of ["https://blagoevgrad.bg/sitemap"]) {
  const t = await (await fetch(u, { headers: UA })).text();
  for (const re of [/admin\.blagoevgrad\.bg[^"'\s\\]{0,120}/g, /\/api\/[^"'\s\\]{0,100}/g, /"(?:slug|url|link|path)":"[^"]{0,140}"/g, /[^"\\]{0,60}(?:resheni|savet|suvet|reshen)[^"\\]{0,80}/gi]) {
    const s = [...new Set([...t.matchAll(re)].map((m) => m[0]))]; console.log("## RE", re, s.length); s.slice(0, 120).forEach((x) => console.log("##   ", x)); }
}
