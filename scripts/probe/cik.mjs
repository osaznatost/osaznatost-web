import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const u of ["https://yambol.bg/obs-reshenia-i-protokoli", "http://os.lovech.bg/bg/resheniyabg-1bg-1", "https://www.montana.bg/общински-съвет/заседания/решения"]) {
  const h = get(encodeURI(u));
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,100}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|\.pdf|\.doc|protokol|протокол|page/i.test(l)))];
  console.log("PROBE", u, h.length);
  for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 180));
}
