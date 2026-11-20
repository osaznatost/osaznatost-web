const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } }); return [r.status, await r.text(), r.headers.get("content-type")]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), ""]; } };
for (const p of [204, 244, 84]) {
  const u = "http://dksbt.bg/?a=" + encodeURIComponent("ЦЕНИ и АНАЛИЗИ") + "&p=" + p;
  const [s, t] = await get(u); console.log("## DKSBT p", p, s, t.length);
  const body = t.split(/Дневни и седмични справки<\/a>/).pop();
  for (const m of [...body.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/g)].filter(m => !/mailto|^#$|rss|gescom|admin|Instrukcia/.test(m[1])).slice(0, 40)) console.log("   ", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 80), "=>", m[1].slice(0, 160));
  console.log("   TEXT:", body.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 700));
}
