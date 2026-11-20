const sites = {
  VRATSA: ["https://www.vratza.bg", "https://www.vratza.bg/obshtinski-savet"],
  SILISTRA: ["https://www.silistra.bg"],
  BLAG: ["https://www.blagoevgrad.bg"],
  YAMBOL: ["https://yambol.bg", "https://yambol.bg/obshtinski-savet"],
};
for (const [k, urls] of Object.entries(sites)) for (const u of urls) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } });
    const t = await r.text();
    const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, "").trim()]).filter(([h, x]) => /решени|заседан|протокол|общински съвет/i.test(x + " " + decodeURIComponent(h)));
    console.log("##", k, u, r.status, t.length);
    for (const l of links.slice(0, 25)) console.log("  ", l[1].slice(0, 60), "=>", l[0]);
  } catch (e) { console.log("##", k, u, "ERR", e.cause?.code || e.message); }
}
