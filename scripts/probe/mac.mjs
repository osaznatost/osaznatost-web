const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } }); return [r.status, await r.text()]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), ""]; } };
for (const u of ["https://www.dksbt.bg", "http://www.dksbt.bg", "https://dksbt.bg"]) {
  const [s, t] = await get(u); console.log("## DKSBT", u, s, t.length);
  for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].slice(0, 120)) console.log("   ", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60), "=>", m[1].slice(0, 120));
}
