const u = "https://yambol.bg/mandat-2023-2027";
const r = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } });
const t = await r.text();
console.log("## ", r.status, t.length);
const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()]);
const doc = links.filter(([h, x]) => /uploads|\.pdf|\.doc|reshen|protokol|zasedan/i.test(h) || /решени|протокол/i.test(x));
console.log("## docs", doc.length);
for (const l of doc.slice(0, 40)) console.log("  ", l[1].slice(0, 90), "=>", l[0].slice(0, 120));
for (const l of doc.slice(-10)) console.log("  END", l[1].slice(0, 90), "=>", l[0].slice(0, 120));
const first = doc.find(([h]) => /uploads/.test(h));
if (first) {
  const f = await fetch(new URL(first[0], u), { headers: { "user-agent": "Mozilla/5.0 osaznatost" } });
  console.log("## first", f.status, f.headers.get("content-type"), f.headers.get("content-disposition"), (await f.arrayBuffer()).byteLength);
}
