import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "30", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
for (const u of ["http://www.obspazardzhik.com/c/88", "http://www.obspazardzhik.com/p/2185"]) {
  const p = get(u);
  const i = p.search(/Решени|РЕШЕНИ/); 
  console.log("PROBE", u, p.length);
  const hp = [...p.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => !/\/p\/(1[2-9]|20|30|329|1412|1445|2186|2185|1383|301)\b|\/c\/(43|62|16|82|88)\b|css|js|#/.test(l));
  for (const l of hp.slice(0, 30)) console.log("PROBE  ", l.slice(0, 200));
}
const one = get("http://www.obspazardzhik.com/c/88");
const first = [...one.matchAll(/href="(\/p\/\d+[^"]*)"/g)].map((m) => m[1]).find((a) => /resh/i.test(a));
if (first) { const q = get("http://www.obspazardzhik.com" + first); const j = q.search(/РЕШЕНИЕ|Р Е Ш/); console.log("PROBEPP", first, q.length, q.slice(j - 200, j + 2500).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); console.log("PROBEPL", [...q.matchAll(/href="([^"]+\.(?:pdf|docx?))"/gi)].map((m) => m[1]).slice(0, 5).join(" ")); }
