import { execFileSync } from "node:child_process";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)";
const urls = ["https://www.plovdiv.bg/", "https://www.smolyan.bg/", "https://www.vidin.bg/", "https://targovishte.bg/", "https://silistra.egov.bg/", "https://www.silistra.bg/", "https://www.kustendil.bg/", "https://obs.kustendil.bg/", "https://kyustendil.bg/", "https://www.kyustendil.bg/"];
for (const u of urls) {
  let b = ""; try { b = execFileSync("curl", ["-sSL", "-m", "40", "-A", UA, "-w", "\n##CODE %{http_code} %{url_effective}", u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u, String(e.message).slice(0, 80)); continue; }
  const code = b.match(/##CODE (.*)$/)?.[1]; console.log("##", u, code, b.length);
  const links = [...new Set([...b.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]).filter(([h, t]) => /решени|общински съвет|обс\b|obs|council|savet|suvet|reshen/i.test(h + " " + t)).map(([h, t]) => `${h} | ${t.slice(0, 60)}`))].slice(0, 25);
  links.forEach((l) => console.log("##   ", l));
}
