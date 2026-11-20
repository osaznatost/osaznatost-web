import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const h = get("http://os.lovech.bg/bg/resheniyabg-1bg-1");
const hrefs = [...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => !/css|\.js|facebook|^#/.test(l));
for (const l of hrefs.slice(15, 60)) console.log("PROBE", l.slice(0, 200));
const y = get("https://yambol.bg/obs-reshenia-i-protokoli"); const i = y.search(/content|main/); 
console.log("PROBEY", [...y.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((a) => /pdf|doc|resh|proto|upload|files/i.test(a)).slice(0, 30).join("\n"));
