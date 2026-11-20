const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } }); const b = Buffer.from(await r.arrayBuffer()); return [r.status, new TextDecoder(/1251/i.test(r.headers.get("content-type") || "") ? "windows-1251" : "utf-8").decode(b), r.headers.get("content-type")]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), ""]; } };
for (const u of ["http://dksbt.bg/?a=" + encodeURIComponent("ЦЕНИ и АНАЛИЗИ"), "http://dksbt.bg/?a=firstpage&p=66&m=wsmap"]) {
  const [s, t, ct] = await get(u); console.log("## DKSBT", u, s, ct, t.length);
  for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].filter(m => !/mailto|^#$|rss/.test(m[1])).slice(10, 90)) console.log("   ", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 70), "=>", m[1].slice(0, 140));
}
