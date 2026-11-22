const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
for (const u of ["https://blagoevgrad.bg/", "https://blagoevgrad.bg/sitemap", "https://blagoevgrad.bg/sitemap.xml", "https://blagoevgrad.bg/robots.txt"]) {
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25000) }); const t = await r.text();
    console.log("##", r.status, u, t.length);
    if (u.endsWith("robots.txt")) console.log("##", t.slice(0, 600).replace(/\n/g, " ¦ "));
    const hs = [...new Set([...t.matchAll(/(?:href|loc)[=>]"?([^"<\s]+)/g)].map((m) => m[1]))];
    hs.filter((h) => !/\.(css|js|png|jpg|svg|ico|woff2?)(\?|$)/.test(h)).slice(0, 400).forEach((h) => console.log("##  ", h));
    const i = t.indexOf("Общински Съвет"); if (i > 0) console.log("## NAV", t.slice(i - 200, i + 3000).replace(/\s+/g, " "));
  } catch (e) { console.log("## ERR", u, e.message); } }
