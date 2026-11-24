// „Какво се промени“: решенията на общинските съвети за разпореждане с общинско имущество
// (наем, аренда, концесия, продажба, право на строеж, безвъзмездно ползване, замяна) от последните 180 дни.
// Чете data/local/<код>.json, пише data/changes/council.json. Пуска се при изграждането на сайта.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "data/local", OUT = "data/changes";
if (!existsSync(DIR)) process.exit(0);
mkdirSync(OUT, { recursive: true });
const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);

const KINDS = [
  ["концесия", /концеси/i],
  ["право на строеж", /право на строеж|право на надстрояване|право на пристрояване/i],
  ["продажба", /продажба|продава|разпореждане чрез|търг за продажба|публичен търг|публично оповестен конкурс/i],
  ["наем или аренда", /отдаване под наем|под наем|аренда|наемател|наемно/i],
  ["безвъзмездно ползване", /безвъзмездно (ползване|управление|право)/i],
  ["замяна", /замяна на (имот|поземлен)/i],
];
const FIRM = /[„"“]?([А-ЯA-Z0-9][А-ЯA-Zа-яa-z0-9 .&\-]{1,60}?)[“"”]?\s+(ЕООД|ООД|ЕАД|АД|ЕТ|СД|КД)(?![А-Яа-яA-Za-z])/gu;

const out = [];
for (const f of readdirSync(DIR).filter((x) => /^[A-Z]{3}\d{2}\.json$/.test(x))) {
  const L = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  for (const r of L.resolutions ?? []) {
    if (!r.date || r.date < since) continue;
    const t = `${r.title ?? ""}\n${(r.text ?? "").slice(0, 4000)}`;
    const kinds = KINDS.filter(([, re]) => re.test(t)).map(([k]) => k);
    if (!kinds.length) continue;
    const firms = [...new Set([...t.matchAll(FIRM)].map((m) => `${m[1].trim()} ${m[2]}`).filter((x) => !/ОБЩИНА|ОБЩИНСК/i.test(x)))].slice(0, 5);
    out.push({ code: L.code, muni: L.name, id: r.id, date: r.date, number: r.number, title: (r.title ?? "").slice(0, 400), url: r.url ?? null,
      tally: r.tally ?? null, result: r.result ?? null, kinds, firms, by: r.rapporteur?.name ?? null });
  }
}
out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync(`${OUT}/council.json`, JSON.stringify(out));
console.log(`Решения за общинско имущество (от ${since}): ${out.length}`);
