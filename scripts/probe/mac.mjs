for (const u of ["https://yambol.bg/obs-reshenia-i-protokoli", "https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/"]) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "Mozilla/5.0 osaznatost" } });
    const t = await r.text();
    console.log("##", u, r.status, t.length);
    const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()]).filter(([h]) => !/facebook|#$|javascript/.test(h));
    const i = links.findIndex(([h, x]) => /решени|протокол|заседан|съвет/i.test(x));
    for (const l of links.slice(Math.max(0, i - 5), i + 60)) console.log("  ", l[1].slice(0, 70), "=>", l[0].slice(0, 140));
  } catch (e) { console.log("##", u, "ERR", e.cause?.code || e.message); }
}
