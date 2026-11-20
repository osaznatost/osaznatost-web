import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "30", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
const urls = ["https://www.kyustendil.bg/index.php?option=com_content&view=article&id=354&Itemid=751&lang=bg", "http://www.obspazardzhik.com/", "https://obs.kyustendil.bg/"];
for (const u of urls) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,90}?)<\/a>/g)].map(([, a, t]) => dec(a) + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|\.pdf|\.doc|protokol|протокол/i.test(l)))];
  console.log("PROBE", u, h.length, /nksoftware|NK Software/i.test(h) ? "NK" : "");
  for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 150));
}
