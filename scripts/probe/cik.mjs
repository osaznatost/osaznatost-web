import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const u of ["https://www.plovdiv.bg/%D0%BE%D0%B1%D1%89%D0%B8%D0%BD%D1%81%D0%BA%D0%B8-%D1%81%D1%8A%D0%B2%D0%B5%D1%82/", "https://www.blagoevgrad.bg/", "https://obs.blgmun.bg/", "https://www.pazardjik.bg/", "https://www.haskovo.bg/", "https://www.sliven.bg/"]) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|resolution|протокол|protokol|съвет|savet|council|obs\./i.test(l)))];
  console.log("PROBE", u, h.length);
  for (const l of links.slice(0, 20)) console.log("PROBE  ", l.slice(0, 180));
}
