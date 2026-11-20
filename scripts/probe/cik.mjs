import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const sites = { Кърджали: "https://kardjali.bg/?pid=4,obs_6", Ямбол: "https://yambol.bg/obshtinski-savet", Ловеч: "http://os.lovech.bg", Монтана: "https://www.montana.bg/общински-съвет/решения" };
for (const [n, u] of Object.entries(sites)) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,100}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|\.pdf|\.doc|protokol|протокол/i.test(l)))];
  console.log("PROBE", n, u, h.length, /nksoftware/i.test(h) ? "NK" : "");
  for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 160));
}
