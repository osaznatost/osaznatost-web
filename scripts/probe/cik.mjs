import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const sites = { Ямбол: "https://www.yambol.bg/", Видин: "https://www.vidin.bg/", Враца: "https://www.vratsa.bg/", Кърджали: "https://www.kardjali.bg/", Кюстендил: "https://www.kustendil.bg/", Ловеч: "https://www.lovech.bg/", Монтана: "https://www.montana.bg/", Силистра: "https://www.silistra.bg/", Смолян: "https://www.smolyan.bg/", Търговище: "https://www.targovishte.bg/", Благоевград: "https://www.blagoevgrad.bg/bg/obshtinski-savet", Пазарджик: "https://pazardjik.bg/" };
for (const [n, u] of Object.entries(sites)) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,100}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|obs\.|savet|council|съвет/i.test(l)))];
  console.log("PROBE", n, u, h.length, /nksoftware/i.test(h) ? "NK" : "");
  for (const l of links.slice(0, 8)) console.log("PROBE  ", l.slice(0, 160));
}
