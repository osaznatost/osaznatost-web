// Декларации за интереси на лицата, заемащи публични длъжности (register.cacbg.bg; до 1.11.2026 — Сметната палата,
// от 2.11.2026 — Комисията за противодействие на корупцията). Регистърът отговаря само на български IP адреси,
// затова задачата върви на self-hosted runner в България.
// За всяка година: list.xml (категория → институция → лице → длъжност → декларации) и по един XML на декларация.
// Взимаме САМО таблиците за участие в дружества, управление и едноличен търговец (15–20). Не пазим ЕГН, адреси,
// имоти, сметки и имената на свързани лица. Файловете на декларациите не се променят, затова всеки се чете веднъж.
// Пише data/declarations/<година>.json и data/declarations/seen-<година>.json.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const YEARS = (process.env.YEARS ?? "2026,2025").split(",");
const MINUTES = Number(process.env.MINUTES ?? 150);
const T0 = Date.now();
const UA = "Mozilla/5.0 (osaznatost.bg; open data)";
const get = (u) => { try { return execFileSync("curl", ["-sSLf", "-m", "90", "-A", UA, u], { maxBuffer: 1 << 28 }).toString("utf8"); } catch { return null; } };
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").trim();
const KIND = { 15: "дял", 16: "управление", 17: "ЕТ", 18: "дял (12 м. преди)", 19: "управление (12 м. преди)", 20: "ЕТ (12 м. преди)" };
mkdirSync("data/declarations", { recursive: true });

for (const year of YEARS) {
  const base = `https://register.cacbg.bg/${year}/`;
  const list = get(base + "list.xml");
  if (!list) { console.log(year, "няма list.xml"); continue; }
  const fOut = `data/declarations/${year}.json`, fSeen = `data/declarations/seen-${year}.json`;
  const out = existsSync(fOut) ? JSON.parse(readFileSync(fOut, "utf8")) : { year, people: [] };
  const seen = new Set(existsSync(fSeen) ? JSON.parse(readFileSync(fSeen, "utf8")) : []);
  // Обхождаме структурата по ред: категория → институция → лице → длъжност → декларация.
  const jobs = [];
  for (const c of list.matchAll(/<Category Name="([^"]*)">([\s\S]*?)<\/Category>/g)) {
    for (const i of c[2].matchAll(/<Institution Name="([^"]*)"[^>]*>([\s\S]*?)<\/Institution>/g)) {
      for (const p of i[2].matchAll(/<Person>\s*<Name>([^<]*)<\/Name>([\s\S]*?)<\/Person>/g)) {
        for (const pos of p[2].matchAll(/<Position>\s*<Name>([^<]*)<\/Name>([\s\S]*?)<\/Position>/g)) {
          for (const f of pos[2].matchAll(/<xmlFile>([^<]+)<\/xmlFile>/g)) jobs.push({ cat: unesc(c[1]), inst: unesc(i[1]), name: unesc(p[1]), pos: unesc(pos[1]), file: f[1] });
        }
      }
    }
  }
  // Списък на всички лица (без да четем декларациите): нужен за проверката „връзка само по Търговския регистър“.
  const ppl = new Map();
  for (const j of jobs) ppl.set(`${j.name}|${j.inst}|${j.pos}`, { name: j.name, pos: j.pos, inst: j.inst, cat: j.cat });
  writeFileSync(`data/declarations/people-${year}.json`, JSON.stringify([...ppl.values()]));
  const todo = jobs.filter((j) => !seen.has(j.file));
  console.log(year, "декларации:", jobs.length, "нови:", todo.length);
  let n = 0, withCo = 0;
  for (const j of todo) {
    if (Date.now() - T0 > MINUTES * 60e3) { console.log("Времето изтече; продължаваме при следващото пускане"); break; }
    const x = get(base + j.file);
    await sleep(250);
    if (!x) continue;
    seen.add(j.file); n++;
    const items = [];
    for (const t of x.matchAll(/<Table Num="(1[5-9]|20)"[^>]*Declared="True">([\s\S]*?)<\/Table>/g)) {
      for (const r of t[2].matchAll(/<Row Num="\d+">([\s\S]*?)<\/Row>/g)) {
        const cells = Object.fromEntries([...r[1].matchAll(/<Cell Num="(\d+)"[^>]*>([^<]*)<\/Cell>/g)].map((c) => [c[1], unesc(c[2])]));
        if (cells["2"]) items.push({ kind: KIND[t[1]], co: cells["2"], extra: cells["3"] || null });
      }
    }
    const date = (x.match(/<DeclarationDate>([^<]+)</) || [])[1] ?? null;
    if (items.length) {
      withCo++;
      out.people.push({ name: j.name, pos: j.pos, inst: j.inst, cat: j.cat, date, file: base + j.file, items });
    }
    if (n % 500 === 0) { console.log(year, n, "прочетени,", withCo, "с дружества"); writeFileSync(fOut, JSON.stringify(out)); writeFileSync(fSeen, JSON.stringify([...seen])); }
  }
  out.updated = new Date().toISOString().slice(0, 10);
  out.total = jobs.length;
  writeFileSync(fOut, JSON.stringify(out));
  writeFileSync(fSeen, JSON.stringify([...seen]));
  console.log(year, "готово:", n, "прочетени сега,", out.people.length, "декларации с дружества общо");
}
