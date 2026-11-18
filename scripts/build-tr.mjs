// Събира прочетеното от Търговския регистър (scripts/tr-cache) в данни за сайта (data/tr):
// фирмите по първите две цифри на ЕИК и обратен указател „човек → фирми“ (по три имена).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
const SRC = "scripts/tr-cache", OUT = "data/tr";
if (!existsSync(SRC)) process.exit(0);
mkdirSync(OUT, { recursive: true });
const people = {};
let n = 0;
const ROLES = { managers: "управител", board: "член на съвет", partners: "съдружник", owner: "едноличен собственик", ubo: "действителен собственик", procurator: "прокурист" };
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".json"))) {
  const src = JSON.parse(readFileSync(`${SRC}/${f}`, "utf8"));
  const out = {};
  for (const [eik, c] of Object.entries(src)) {
    if (c.missing) continue;
    n++;
    out[eik] = { ...c, address: c.address ? c.address.replace(/\s*(Телефон|Факс|Адрес на електронна поща|Интернет страница).*/s, "") : null, activity: c.activity?.slice(0, 220) ?? null };
    for (const [k, role] of Object.entries(ROLES)) for (const p of c[k] ?? []) {
      if (p.eik || !p.name || p.name.split(/\s+/).length < 3) continue; // само физически лица с три имена
      const key = p.name.toUpperCase().replace(/\s+/g, " ").trim();
      (people[key] ??= []).push([eik, role]);
    }
  }
  writeFileSync(`${OUT}/${f}`, JSON.stringify(out));
}
writeFileSync(`${OUT}/people.json`, JSON.stringify(people));
console.log(`Търговски регистър: ${n} фирми, ${Object.keys(people).length} души`);
