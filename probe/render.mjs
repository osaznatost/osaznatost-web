import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" });
for (const u of process.argv.slice(2)) {
  const p = await ctx.newPage();
  try { await p.goto(u, { waitUntil: "networkidle", timeout: 45000 }); } catch (e) { console.log("ERR", u, String(e).slice(0, 100)); }
  const links = await p.$$eval("a", (as) => as.map((a) => [a.href, a.textContent.trim().replace(/\s+/g, " ").slice(0, 90)]));
  const f = links.filter(([h, t]) => /\.pdf|\.docx?|reshen|решени|resheni|протокол|protokol|202[3-6]|download/i.test(h + " " + t) && !/facebook|twitter|razreshen|разрешени/i.test(h + t));
  console.log("##", u, links.length, f.length);
  for (const [h, t] of f.slice(0, 22)) console.log("   L", h.slice(0, 170), "|", t);
  await p.close();
}
await b.close();
