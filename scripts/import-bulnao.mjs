// Одитните доклади на Сметната палата (bulnao.government.bg): заглавие, категория, тип, година, PDF.
// Списъците се обхождат по година и страница (16 доклада на страница), по 1 заявка в секунда.
// Свързваме доклада с общината или институцията по името в заглавието („Община Правец“, „Министерството на …“).
// Пише data/audits.json. Пазим само метаданни и връзка към PDF-а на Сметната палата.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "data/audits.json";
const UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev; open data)";
const BASE = "https://www.bulnao.government.bg";
const SECTIONS = {
  dokladi: "одит",
  "dokladi-obshini": "одит",
  "finansovi-oditi-na-gfo": "финансов одит",
  "dokladi-sled-priklyuchili-nakazatelni-proizvodstva": "след наказателно производство",
  "kontrol-na-obshtestvenite-porychki": "обществени поръчки",
};
const Y0 = Number(process.env.FROM_YEAR ?? 2019), Y1 = new Date().getFullYear();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { items: [] };
const byId = new Map(prev.items.map((x) => [x.id, x]));
const full = process.env.FULL === "1" || prev.items.length === 0;

const places = JSON.parse(readFileSync("data/places.json", "utf8")).oblasts;
const MUNI = [];
for (const o of places) for (const m of o.municipalities) MUNI.push({ code: m.code, name: m.name.replace(/^Община\s+/, ""), oblast: o.name });
const norm = (s) => s.toLowerCase().replace(/[„“"]/g, "").replace(/\s+/g, " ").trim();
function munis(title) {
  const codes = new Set();
  const names = [];
  for (const m of title.matchAll(/Общин(?:а|ите)\s+((?:[А-Я][\wа-яё-]*(?:\s+[А-Я][\wа-яё-]*)?(?:,\s*|\s+и\s+)?)+)/g)) names.push(...m[1].split(/,\s*|\s+и\s+/));
  const obl = title.match(/[Оо]бласт\s+([А-Я][а-я]+(?:\s+[А-Я][а-я]+)?)/)?.[1];
  for (const n of names.map((x) => norm(x)).filter(Boolean)) {
    const hits = MUNI.filter((x) => norm(x.name) === n);
    const pick = hits.length > 1 && obl ? hits.filter((x) => x.oblast.includes(obl)) : hits;
    if (pick.length === 1) codes.add(pick[0].code);
  }
  if (/Столична община/i.test(title)) codes.add("SOF46");
  return [...codes];
}

async function page(section, year, n) {
  const url = `${BASE}/bg/oditna-dejnost/${section}/?year=${year}&page=${n}`;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
      if (r.status === 404) return [];
      if (!r.ok) throw new Error(String(r.status));
      const s = await r.text();
      return s.split('<a href="/bg/documents/').slice(1).map((chunk) => {
        const href = chunk.slice(0, chunk.indexOf('"'));
        const id = href.split("/")[0];
        const cat = chunk.match(/Категория:\s*([^<]+)</)?.[1].trim() ?? "";
        const type = chunk.match(/Тип:\s*([^<]+)</)?.[1].trim() ?? "";
        const title = (chunk.match(/file-heading">([\s\S]*?)<\/h6>/)?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        return { id, url: `${BASE}/bg/documents/${href}`, title, cat, type };
      }).filter((x) => x.title && /^\d+$/.test(x.id));
    } catch (e) { console.warn(url, e.message); await sleep(5000); }
  }
  return [];
}

let added = 0;
for (const [section, kind] of Object.entries(SECTIONS)) {
  for (let y = Y1; y >= Y0; y--) {
    if (!full && y < Y1 - 1) break; // нощно: само текущата и миналата година
    const seen = new Set();
    for (let n = 1; n < 80; n++) {
      const items = await page(section, y, n);
      await sleep(1000);
      const fresh = items.filter((x) => !seen.has(x.id));
      if (!fresh.length) break;
      for (const x of fresh) {
        seen.add(x.id);
        const old = byId.get(x.id);
        const rec = { ...x, year: old?.year ?? y, kind: old?.kind && old.kind !== "одит" ? old.kind : kind, munis: munis(x.title) };
        if (!old) added++;
        byId.set(x.id, rec);
      }
    }
    console.log(section, y, seen.size);
  }
}
const items = [...byId.values()].sort((a, b) => b.year - a.year || Number(b.id) - Number(a.id));
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: `${BASE}/bg/oditna-dejnost/`, items }));
console.log(`Одитни доклади: ${items.length} (нови ${added}); с община: ${items.filter((x) => x.munis.length).length}`);
