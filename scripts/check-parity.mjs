// Пазач: едно и също съдържание на телефон и компютър.
// Забранено е съдържание, което се крие на едното устройство („hidden sm:block“, „lg:hidden“ и подобни).
// Разрешено е само за менюто (Nav.tsx: две оформления на едни и същи връзки) и за чисто оформление,
// отбелязано с коментар „parity-ok“ на същия ред.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"], ALLOW = new Set(["components/Nav.tsx"]);
const BAD = /\b(hidden\s+(sm|md|lg|xl|2xl):(block|flex|grid|inline|inline-block|inline-flex|table|table-cell|table-row|contents)|(sm|md|lg|xl|2xl):hidden)\b/;
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx|ts|jsx)$/.test(f)) files.push(p); } };
ROOTS.forEach(walk);
const hits = [];
for (const f of files) {
  if (ALLOW.has(f)) continue;
  readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (BAD.test(l) && !l.includes("parity-ok")) hits.push(`${f}:${i + 1}: ${l.trim().slice(0, 140)}`); });
}
if (hits.length) {
  console.error("Съдържание, скрито на едно от устройствата (телефон/компютър). Покажи го навсякъде или отбележи чисто оформление с „parity-ok“:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`Еднакво съдържание на телефон и компютър: ${files.length} файла проверени.`);
