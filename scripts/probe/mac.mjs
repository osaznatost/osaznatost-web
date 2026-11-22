import { execFileSync } from "node:child_process"; import { mkdirSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
const curl = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "60", "-A", UA, u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u); return ""; } };
const k = curl("https://kyustendil.bg/index.php?option=com_jdownloads&view=download&id=5403&catid=9&lang=bg");
[...new Set([...k.matchAll(/href="([^"]*jdownloads[^"]*)"/g)].map((m) => m[1]))].slice(0, 20).forEach((x) => console.log("## JD", x));
const o = curl("https://obs.kyustendil.bg/zasedaniaobs");
console.log("## OBS", o.length); [...o.matchAll(/<script[^>]*src="([^"]+)"/g)].forEach((m) => console.log("## SRC", m[1]));
console.log("## OBSHEAD", o.replace(/\s+/g, " ").slice(0, 3000));
for (const m of o.matchAll(/<script[^>]*src="([^"]+)"/g)) { const u = new URL(m[1], "https://obs.kyustendil.bg/").href; if (!/obs\.kyustendil/.test(u)) continue; const js = curl(u); const hits = [...new Set([...js.matchAll(/["'`]((?:https?:)?\/\/[^"'`]{3,90}|\/api[^"'`]{0,90}|[a-z/]*(?:zasedan|reshen|session|document)[a-z/]*)["'`]/gi)].map((x) => x[1]))].slice(0, 40); console.log("## JS", u, js.length, hits.join(" , ")); }
