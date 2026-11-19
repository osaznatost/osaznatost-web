// Проверка за източници след `next build`: всяка страница със съдържание трябва да има поне един външен линк
// или ред „Източник“. Пренасочванията, входът и служебните страници не се броят.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = ".next/server/app";
const skip = [/_not-found/, /_global-error/, /\/vhod\.html$/, /\[/, /\/(proekti|vlast)\.html$/];
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html") && !skip.some((r) => r.test(p))) files.push(p);
  }
})(ROOT);
const bad = [];
for (const f of files) {
  const h = readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  if (/permanentRedirect|NEXT_REDIRECT/.test(h) && h.length < 15000) continue;
  const ext = (h.match(/href="https?:\/\/(?!osaznatost|github\.com\/osaznatost)/g) ?? []).length;
  const src = /Източни|източник|по данни на|Данни:/.test(h);
  if (!ext && !src) bad.push("/" + path.relative(ROOT, f).replace(/\.html$/, ""));
}
console.log(`Страници: ${files.length}. Без източник: ${bad.length}.`);
for (const b of bad.slice(0, 50)) console.log("  ", b);
process.exit(bad.length ? 1 : 0);
