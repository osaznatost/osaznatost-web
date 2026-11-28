// Длъжници към НАП (публичният списък по чл. 182, ал. 3, т. 2 от ДОПК): само юридически лица и търговци,
// с неплатени публични задължения над 2 556,46 €. Услугата на НАП е защитена с reCAPTCHA, затова не се тегли автоматично:
// списъкът по териториални дирекции се сваля на ръка от браузър и се подава тук.
//   node scripts/import-nap-debtors.mjs nap-dlazhnici-*.json
// Вход: { asOf, rows: [[име, правна форма, ЕИК, дата на включване, ТД, размер]] } (един или няколко файла)
// Изход: data/proc/nap-debtors/<2 цифри>.json — { ЕИК: [име, форма, сума €, включен (ГГГГ-ММ-ДД), ТД] }; index.json — към коя дата е.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) throw new Error("Подайте файловете");
const OUT = "data/proc/nap-debtors";
const iso = (d) => { const m = String(d).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const num = (s) => Number(String(s).replace(/[\s,]/g, "")) || 0; // „26,328.50“ — запетаята е за хиляди
const all = new Map();
let asOf = null;
for (const f of files) {
  const D = JSON.parse(readFileSync(f, "utf8"));
  if (D.asOf && (!asOf || iso(D.asOf) > asOf)) asOf = iso(D.asOf);
  for (const r of D.rows) {
    const eik = String(r[2] ?? "").replace(/\D/g, "");
    if (!/^\d{9}(\d{4})?$/.test(eik)) continue; // само ЕИК на фирми и търговци (9 или 13 цифри)
    all.set(eik, [r[0], r[1], num(r[5]), iso(r[3]), r[4]]);
  }
}
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
const shards = {};
for (const [eik, v] of all) (shards[eik.slice(0, 2)] ??= {})[eik] = v;
for (const [k, v] of Object.entries(shards)) writeFileSync(`${OUT}/${k}.json`, JSON.stringify(v));
const total = [...all.values()].reduce((s, v) => s + v[2], 0);
writeFileSync(`${OUT}/index.json`, JSON.stringify({ asOf, count: all.size, totalEur: Math.round(total), source: "НАП, Списък на длъжниците с неуредени публични задължения (чл. 182, ал. 3, т. 2 от ДОПК), portal.nra.bg" }));
console.log(`Длъжници към НАП: ${all.size} фирми, общо ${Math.round(total / 1e6)} млн. €, към ${asOf}`);
