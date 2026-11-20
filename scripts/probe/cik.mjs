const H = { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
for (const u of ["https://register.bulnao.government.bg/", "https://register.bulnao.government.bg/Public/Declarations", "https://www.bulnao.government.bg/bg/registar/", "https://register.cacbg.bg/"]) {
  try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(25000), redirect: "follow" }); const t = await r.text();
    console.log("## ", u, r.status, r.url, t.length, (t.match(/<title>([^<]*)/) || [])[1]);
    for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].slice(0, 60)) console.log("    ", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 70), "=>", m[1].slice(0, 140));
    console.log("    FORMS", [...t.matchAll(/<form[^>]*>/g)].map((m) => m[0].slice(0, 200)).slice(0, 5));
  } catch (e) { console.log("## ", u, "ERR", e.cause?.code || e.message); }
}
