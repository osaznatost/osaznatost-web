const H = { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
const t = await (await fetch("https://www.bulnao.government.bg/bg/", { headers: H })).text();
const all = [...new Set([...t.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))];
console.log("## n", all.length);
for (const u of all.filter((u) => !/kontrol-|oditna|novini\/|za-nas\/|documents|rss|\.(css|js|png|ico)/.test(u))) console.log("##", u);
for (const u of ["https://www.bulnao.government.bg/bg/publichen-registr/", "https://www.bulnao.government.bg/bg/publichen-registyr/", "https://www.bulnao.government.bg/bg/registyr/"]) { const r = await fetch(u, { headers: H }); console.log("## TRY", u, r.status); }
