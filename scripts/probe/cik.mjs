import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "30", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const k = get("https://www.kyustendil.bg/index.php?option=com_content&view=article&id=354&Itemid=751&lang=bg");
const hk = [...k.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((a) => /pdf|doc|images|files/i.test(a));
console.log("PROBEK", hk.length, hk.slice(0, 6).join("\n"), "\n...", hk.slice(-4).join("\n"));
const i = k.indexOf(hk[0] ?? "zzz"); console.log("PROBEKCTX", k.slice(i - 400, i + 300).replace(/\s+/g, " "));
const p = get("http://www.obspazardzhik.com/c/82/resheniya-mandat-2025-2027");
const hp = [...p.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /\/p\/|page|pdf|doc/i.test(l));
console.log("PROBEP", p.length); for (const l of hp.slice(0, 20)) console.log("PROBEP  ", l.slice(0, 200));
const first = hp.find((l) => /\/p\/\d+\/resh/i.test(l))?.split(" | ")[0];
if (first) { const q = get("http://www.obspazardzhik.com" + first); const j = q.search(/РЕШЕНИЕ|Решение/); console.log("PROBEPP", first, q.slice(j - 300, j + 1500).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); console.log("PROBEPL", [...q.matchAll(/href="([^"]+\.(?:pdf|docx?))"/gi)].map((m) => m[1]).slice(0, 5).join(" ")); }
