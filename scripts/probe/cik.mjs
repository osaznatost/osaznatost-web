import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const a = get("https://appk.government.bg/bg/162");
console.log("PROBE162", a.length, [...a.matchAll(/href="([^"]+\.(?:xlsx?|csv|pdf|docx?))"/gi)].map((m) => m[1]).slice(0, 10).join(" "));
const i = a.search(/ЕИК|Министерство/); console.log("PROBE162T", txt(a.slice(Math.max(0, i - 500), i + 2500)).slice(0, 1500));
const r = get("https://reports.appk.government.bg/");
console.log("PROBER", r.length, txt(r).slice(0, 1200));
console.log("PROBERL", [...new Set([...r.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))].slice(0, 30).join(" "));
