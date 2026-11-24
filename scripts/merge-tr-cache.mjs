// Слива прочетеното в това пускане (папка A) с най-новото в хранилището (папка B), за да не се губят фирми,
// когато две пускания на Търговския регистър са записали едновременно. При една и съща фирма печели по-новото четене.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
const [A, B] = process.argv.slice(2);
let n = 0;
for (const f of readdirSync(A).filter((x) => x.endsWith(".json"))) {
  const a = JSON.parse(readFileSync(`${A}/${f}`, "utf8"));
  const b = existsSync(`${B}/${f}`) ? JSON.parse(readFileSync(`${B}/${f}`, "utf8")) : {};
  for (const [k, v] of Object.entries(a)) if (!b[k] || (v.fetched ?? "") >= (b[k].fetched ?? "")) { b[k] = v; n++; }
  writeFileSync(`${B}/${f}`, JSON.stringify(b));
}
console.log("слети записи:", n);
