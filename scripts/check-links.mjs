// Проверка за счупени вътрешни линкове след `next build`: чете готовите HTML страници в .next/server/app,
// събира всички вътрешни href и проверява, че за всеки има страница или маршрут.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = ".next/server/app";
const pages = new Set();
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) { files.push(p); pages.add("/" + path.relative(ROOT, p).replace(/\.html$/, "").replace(/(^|\/)index$/, "")); }
  }
})(ROOT);
pages.add("/");
// маршрути без готов HTML (динамични или служебни): приемаме ги по префикс
const dynamicOk = [/^\/mesta\/[a-z]+\/[a-z]+\d+\/\d{5}$/, /^\/porachki\/dogovor\//, /^\/porachki\/firma\//, /^\/porachki\/vazlozhitel\//, /^\/lica\//, /^\/rss\//, /^\/api\//, /^\/tarsene/, /^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/opengraph-image/, /^\/_next\//, /^\/favicon/];
const broken = new Map();
for (const f of files) {
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    let u = decodeURIComponent(m[1]).replace(/\/$/, "") || "/";
    if (pages.has(u) || dynamicOk.some((r) => r.test(u))) continue;
    if (existsSync(path.join("public", u))) continue;
    // динамичен маршрут, който се генерира при първо отваряне (до него стои шаблон [параметър].html)
    const dir = path.join(ROOT, path.dirname(u));
    if (existsSync(dir) && readdirSync(dir).some((x) => /^\[[^\]]+\]\.html$/.test(x)) && !/^\/parlament\/zakon\//.test(u)) continue;
    const from = "/" + path.relative(ROOT, f).replace(/\.html$/, "");
    if (!broken.has(u)) broken.set(u, new Set());
    broken.get(u).add(from);
  }
}
for (const [u, from] of [...broken].sort()) console.log(`${u}  ←  ${[...from].slice(0, 3).join(", ")}${from.size > 3 ? ` и още ${from.size - 3}` : ""}`);
console.log(`Страници: ${pages.size}; счупени вътрешни линкове: ${broken.size}`);
process.exit(broken.size ? 1 : 0);
