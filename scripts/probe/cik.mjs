const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" } }); return [r.status, await r.text(), r.url]; } catch (e) { return ["ERR " + (e.cause?.code || e.message), "", u]; } };
for (const u of ["https://www.kyustendil.bg/index.php?option=com_content&view=article&id=354&Itemid=751&lang=bg", "https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/", "https://obs.kyustendil.bg/"]) {
  const [s, t] = await get(u);
  const body = t.replace(/<script[\s\S]*?<\/script>/g, "");
  const links = [...body.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]);
  const i = links.findIndex(([h, x]) => /решени|протокол|заседан|\.pdf|\.jpg|\.doc/i.test(x + " " + h));
  console.log("##", u, s, t.length, "links", links.length);
  for (const [h, x] of links.slice(Math.max(0, i - 2), i + 30)) console.log("    ", x.slice(0, 70), "=>", h.slice(0, 160));
  console.log("   IMGS", [...body.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((x) => /upload|images\/.*\d/.test(x)).slice(0, 8));
}
