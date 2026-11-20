import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).replace(/\s+/g, " ");
const B = "https://reports.appk.government.bg";
const c = get(B + "/Public/Public/Companies");
const links = [...new Set([...c.matchAll(/href="([^"]*(?:Company|Details|Id=)[^"]*)"/gi)].map((m) => m[1]))];
console.log("PROBEC", c.length, links.length, links.slice(0, 8).join(" "));
console.log("PROBECT", txt(c).slice(1500, 3500));
if (links[0]) { const d = get(B + links[0].replace(/&amp;/g, "&")); console.log("PROBED", links[0], d.length, txt(d).slice(0, 4000)); }
