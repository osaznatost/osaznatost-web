import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const u of ["https://yambol.bg/obs-reshenia-i-protokoli", "https://www.vratsa.bg/obshtinski-savet", "https://obs.vratsa.bg/", "https://kustendil.bg/", "https://obs.kustendil.bg/", "https://smolyan.bg/", "https://obs.smolyan.bg/"]) {
  const h = get(u);
  const all = [...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,100}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  console.log("PROBE", u, h.length);
  for (const l of all.filter((l) => /реш|reshen|decision|uploads|протокол|protokol|съвет|savet/i.test(l)).slice(0, 14)) console.log("PROBE  ", l.slice(0, 170));
}
