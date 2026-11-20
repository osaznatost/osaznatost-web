import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "30", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
const urls = ["https://blagoevgrad.bg/", "https://obs.blagoevgrad.bg/", "https://www.vratsa.bg/", "https://obs.vratsa.bg/", "https://www.smolyan.bg/", "https://os.smolyan.bg/", "https://www.silistra.bg/", "https://obs.silistra.bg/", "https://www.targovishte.bg/", "https://obs.targovishte.bg/", "https://www.vidin.bg/", "https://obs.vidin.bg/", "https://www.kyustendil.bg/", "https://obs.kyustendil.bg/", "https://www.pazardzhik.bg/", "https://obs.pazardzhik.bg/", "https://www.yambol.bg/bg/obshtinski-savet/resheniya"];
for (const u of urls) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,90}?)<\/a>/g)].map(([, a, t]) => dec(a) + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|obs|savet|съвет|council/i.test(l)))];
  console.log("PROBE", u, h.length, /nksoftware|NK Software/i.test(h) ? "NK" : "");
  for (const l of links.slice(0, 6)) console.log("PROBE  ", l.slice(0, 150));
}
