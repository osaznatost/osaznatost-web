import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "30", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", "-w", "\n@@%{http_code} %{url_effective}", u], { maxBuffer: 1 << 26 }).toString(); } catch (e) { return "@@ERR " + (e.stderr?.toString() || "").slice(0, 120); } };
const C = {
  TGV: ["https://obs.targovishte.bg", "https://www.targovishte.bg/obshtinski-savet"],
  VID: ["https://obs.vidin.bg", "https://www.vidin.bg", "https://vidin.bg/obshtinski-savet"],
  SLS: ["https://www.silistra.bg", "https://obs.silistra.bg", "https://os.silistra.bg"],
  SML: ["https://obs.smolyan.bg", "https://www.smolyan.bg"],
  VRC: ["https://www.vratza.bg", "https://obs.vratza.bg"],
  BLG: ["https://www.blagoevgrad.bg", "https://obs.blagoevgrad.bg", "https://os-blagoevgrad.bg"],
};
for (const [k, urls] of Object.entries(C)) for (const u of urls) {
  const t = get(u); const st = (t.match(/@@(.*)$/) || [])[1];
  const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,150}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]).filter(([h, x]) => /решени|протокол|заседан|общински съвет/i.test(x + " " + decodeURIComponent(h).slice(0, 200)));
  console.log("##", k, u, st, t.length);
  for (const [h, x] of links.slice(0, 15)) console.log("    ", x.slice(0, 60), "=>", h.slice(0, 150));
}
