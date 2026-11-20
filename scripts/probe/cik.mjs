import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const B = "https://iisda.government.bg";
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const h = get(B + "/ras/adm_structures/ministries");
const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))].filter((l) => /Министерство/i.test(l));
console.log("PROBE", h.length); for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 170));
const first = links[0]?.split(" | ")[0];
if (first) {
  const m = get(first.startsWith("http") ? first : B + first);
  console.log("PROBEM", first, m.length, txt(m).slice(0, 3500));
  const sub = [...new Set([...m.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,80}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))].filter((l) => /ras\/|tab|structure|staff|служ|ръковод/i.test(l));
  for (const l of sub.slice(0, 30)) console.log("PROBEMS ", l.slice(0, 170));
}
