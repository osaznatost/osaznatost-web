import { nuxtDecode } from "../scripts/lib/billa-at.mjs";
const UA = { "user-agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
for (const u of ["https://shop.billa.cz/vyhledavani?q=barilla", "https://shop.billa.cz/vyhledavani/barilla"]) {
  const html = await (await fetch(u, { headers: UA })).text();
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  console.log("##", u, html.length, !!m);
  if (!m) continue;
  const root = nuxtDecode(JSON.parse(m[1]));
  let n = 0;
  const walk = (o, path, d = 0) => { if (!o || typeof o !== "object" || d > 40 || n > 4) return;
    if (!Array.isArray(o) && ("sku" in o || "price" in o)) { n++; console.log("   ", path, JSON.stringify(o).slice(0, 600)); return; }
    for (const [k, x] of Object.entries(o)) walk(x, path + "." + k, d + 1); };
  walk(root, "");
  console.log("   keys", Object.keys(root?.state ?? root ?? {}).slice(0, 30).join(","));
  console.log("   api", [...new Set(html.match(/https?:\/\/[a-z0-9.-]*billa\.cz\/[a-z0-9\/_-]*api[a-z0-9\/_-]*/gi) ?? [])].slice(0, 10).join(" "));
}
