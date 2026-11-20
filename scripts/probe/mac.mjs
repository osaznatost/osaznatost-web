import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 27 }).toString(); } catch (e) { return ""; } };
const B = "https://register.cacbg.bg/2026/";
let t = get(B + "index.html");
console.log("## 2026 index", t.length);
const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]);
console.log("## links", links.length); for (const l of links.slice(0, 25)) console.log("   ", l[1].slice(0, 90), "=>", l[0]);
const sub = links.find(([h]) => !/^(\.\.|http|#|index)/.test(h));
if (sub) {
  const u2 = new URL(sub[0], B).href; const t2 = get(u2); console.log("## SUB", u2, t2.length);
  const l2 = [...t2.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,160}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]);
  for (const l of l2.slice(0, 25)) console.log("   ", l[1].slice(0, 90), "=>", l[0]);
  const s3 = l2.find(([h]) => !/^(\.\.|http|#|index)/.test(h));
  if (s3) { const u3 = new URL(s3[0], u2).href; const t3 = get(u3); console.log("## SUB3", u3, t3.length); console.log(t3.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").slice(0, 3000)); }
}
