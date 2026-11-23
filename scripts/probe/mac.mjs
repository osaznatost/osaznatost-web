import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
const curl = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", UA, u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u); return ""; } };
const base = "https://www.plovdiv.bg/%d0%be%d0%b1%d1%89%d0%b8%d0%bd%d1%81%d0%ba%d0%b8-%d1%81%d1%8a%d0%b2%d0%b5%d1%82/";
const p = curl(base);
const links = [...new Set([...p.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/g)].map((m) => [decodeURIComponent(m[1]), m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]).filter(([h]) => /общински-съвет/.test(h)).map((x) => x.join(" | ")))];
links.forEach((l) => console.log("## L", l));
for (const u of ["https://www.plovdiv.bg/общински-съвет/решения/", "https://www.plovdiv.bg/общински-съвет/дневен-ред/"]) { const h = curl(encodeURI(u)); console.log("## PAGE", u, h.length); [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/g)].map((m) => decodeURIComponent(m[1]) + " | " + m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))].filter((x) => /решени|протокол|\.pdf|\.doc|uploads|заседан/i.test(x)).slice(0, 40).forEach((x) => console.log("##  ", x)); }
