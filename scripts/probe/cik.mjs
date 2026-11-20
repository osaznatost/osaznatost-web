const H = { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
const t = await (await fetch("https://www.bulnao.government.bg/bg/", { headers: H })).text();
for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].filter((m) => /регист|деклар|register|ПУБЛИЧЕН/i.test(m[1] + m[2]))) console.log("##", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 80), "=>", m[1]);
