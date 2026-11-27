// След качване: обхожда страниците от картата на сайта, за да напълни споделения кеш (KV) с отговорите от Supabase.
// Ползва бисквитката за вход, изчислена от SITE_PASSWORD (хешът, който сайтът очаква); паролата не се праща никъде.
import { createHash } from "node:crypto";

const BASE = process.env.SITE_URL ?? "https://osaznatost.pavlin140.workers.dev";
const pw = process.env.SITE_PASSWORD;
const cookie = pw ? `osz_auth=${createHash("sha256").update(pw).digest("hex")}` : "";
const H = { cookie, "user-agent": "osaznatost-warm/1.0" };
const deadline = Date.now() + Number(process.env.MINUTES ?? 20) * 60e3;

const sm = await (await fetch(`${BASE}/sitemap.xml`, { headers: H })).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
// първо най-посещаваните раздели, после останалите
const rank = (u) => (u === "/" ? 0 : /^\/(porachki|mesta|parlament|byudzhet)/.test(u) ? 1 : 2);
urls.sort((a, b) => rank(a) - rank(b));
const stats = { ok: 0, bad: [], slow: 0 };
async function worker() {
  while (urls.length && Date.now() < deadline) {
    const u = urls.shift(), t = Date.now();
    try {
      const r = await fetch(BASE + u, { headers: H, redirect: "manual", signal: AbortSignal.timeout(90000) });
      await r.arrayBuffer();
      if (r.status === 200) stats.ok++; else stats.bad.push(`${r.status} ${u}`);
      if (Date.now() - t > 10000) { stats.slow++; console.log("бавна", Date.now() - t, "ms", u); }
    } catch (e) { stats.bad.push(`ERR ${u} ${e.message}`); }
  }
}
await Promise.all(Array.from({ length: Number(process.env.WORKERS ?? 2) }, worker));
console.log(`Загряване: ${stats.ok} OK, ${stats.slow} бавни, ${stats.bad.length} грешки, неминати ${urls.length}`);
for (const b of stats.bad.slice(0, 40)) console.log(" ", b);
