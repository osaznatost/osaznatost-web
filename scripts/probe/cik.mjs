const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" } }); return [r.status, await r.text(), r.url]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), "", u]; } };
for (const u of ["https://www.kyustendil.bg", "https://obs.kyustendil.bg", "https://kyustendil.bg/obshtinski-savet/", "https://www.plovdiv.bg", "https://www.obs-plovdiv.bg", "https://plovdiv.bg/obshtinski-savet/", "https://www.vratza.bg", "https://vratza.bg", "https://www.blagoevgrad.bg"]) {
  const [s, t, fu] = await get(u);
  const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]).filter(([h, x]) => /решени|протокол|заседан|общински съвет/i.test(x + " " + h));
  console.log("##", u, s, fu, t.length);
  for (const [h, x] of links.slice(0, 15)) console.log("    ", x.slice(0, 60), "=>", h.slice(0, 150));
}
