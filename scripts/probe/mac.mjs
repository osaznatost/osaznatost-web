import { execFileSync } from "node:child_process";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)";
const urls = ["https://www.plovdiv.bg/%d0%be%d0%b1%d1%89%d0%b8%d0%bd%d1%81%d0%ba%d0%b8-%d1%81%d1%8a%d0%b2%d0%b5%d1%82/", "https://kyustendil.bg/index.php?option=com_content&view=article&id=354&Itemid=751&lang=bg", "https://obs.kyustendil.bg/"];
for (const u of urls) {
  let b = ""; try { b = execFileSync("curl", ["-sSL", "-m", "40", "-A", UA, "-w", "\n##CODE %{http_code} %{url_effective}", u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u, String(e.message).slice(0, 80)); continue; }
  console.log("##", u, b.match(/##CODE (.*)$/)?.[1], b.length);
  const links = [...new Set([...b.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]).filter(([h, t]) => /решени|протокол|заседани|\.pdf|\.docx?|reshen|sessi|zased/i.test(h + " " + t)).map(([h, t]) => `${h} | ${t.slice(0, 80)}`))];
  console.log("## nlinks", links.length); links.slice(0, 40).forEach((l) => console.log("##   ", l));
}
