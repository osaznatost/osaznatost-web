import { execFileSync } from "node:child_process";
const H = { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
const t = await (await fetch("https://www.bulnao.government.bg/sitemap", { headers: H })).text();
for (const m of [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].filter((m) => /регист|деклар|имущ|интерес|ЛВПД|публични длъжности/i.test(m[2]))) console.log("##", m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 90), "=>", m[1]);
console.log("## cacbg", execFileSync("bash", ["-c", "curl -sSL -m 30 -A 'Mozilla/5.0' https://register.cacbg.bg/ | head -c 1500"]).toString().replace(/\s+/g, " "));
