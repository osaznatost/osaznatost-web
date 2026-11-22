import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
const curl = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", UA, u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u); return ""; } };
for (const u of ["https://obs.kyustendil.bg/zasedaniaobs", "https://obs.kyustendil.bg/resheniya", "https://obs.kyustendil.bg/reshenia"]) {
  const o = curl(u); const t = o.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " | ").replace(/(\s*\|\s*)+/g, " | ").replace(/\s+/g, " ");
  console.log("## PAGE", u, o.length); console.log("## TXT", t.slice(0, 4000));
  [...new Set([...o.matchAll(/(?:href|src|data-[a-z]+)="([^"]{3,200})"/g)].map((m) => m[1]))].filter((x) => !/\.(css|woff2?|png|svg|ico)/.test(x)).slice(0, 60).forEach((x) => console.log("## L", x));
}
