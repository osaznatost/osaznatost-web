// След `opennextjs-cloudflare build`: копира файловете с данни в статичните файлове на Worker-а (/_data/...),
// откъдето lib/data.ts ги чете през ASSETS. Публично не се виждат: proxy.ts връща 404 за /_data.
import { cpSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const SRC = "data", DST = ".open-next/assets/_data";
let n = 0, bytes = 0;
const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else if (f.endsWith(".json")) { if (s.size > 25 * 1024 * 1024) throw new Error(`${p} е над 25 MB`); n++; bytes += s.size; } } };
walk(SRC);
cpSync(SRC, DST, { recursive: true, filter: (p) => statSync(p).isDirectory() || p.endsWith(".json") });
console.log(`Данни за Cloudflare: ${n} файла, ${(bytes / 1048576).toFixed(0)} MB`);
