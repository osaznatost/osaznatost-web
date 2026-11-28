// Докладите от финансови инспекции на АДФИ (възложени след 9.2.2024), с връзка към общината.
// Източник: https://www.adfi.minfin.bg/bg/34 — таблица: доклад (PDF), обект, основание, дата на публикуване.
// Изход: data/adfi.json
import { readFileSync, writeFileSync } from "node:fs";

const UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)";
const URL = "https://www.adfi.minfin.bg/bg/34";
const html = await (await fetch(URL, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(90000) })).text();
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const places = JSON.parse(readFileSync("data/places.json", "utf8")).oblasts;
const MUNI = [];
for (const o of places) for (const m of o.municipalities) MUNI.push({ code: m.code, name: m.name.replace(/^Община\s+/, ""), oblast: o.name, center: (m.settlements.find((s) => s[2] === 0) ?? [])[1] ?? m.name });
const SETT = new Map();
for (const o of places) for (const m of o.municipalities) SETT.set(m.code, new Set(m.settlements.map((x) => x[1].toLowerCase())));
const norm = (s) => s.toLowerCase().replace(/[„“"]/g, "").replace(/\s+/g, " ").trim();
const one = (arr) => (arr.length === 1 ? arr[0].code : null);

function place(obj) {
  // „Община Х“ — проверката е на самата община
  const m = obj.match(/^(?:Община|Общинска администрация)\s+([А-Я][а-яё-]+(?:[ -][А-Я][а-яё-]+)?)/);
  if (/^Столична община/i.test(obj)) return { code: "SOF46", self: true };
  if (m) { const n = norm(m[1]); const obl = obj.match(/област\s+([А-Я][а-я]+)/)?.[1]; let h = MUNI.filter((x) => norm(x.name) === n); if (h.length > 1 && obl) h = h.filter((x) => x.oblast.startsWith(obl)); const c = one(h); if (c) return { code: c, self: true }; }
  // „…, община Y“ някъде в името
  const om = obj.match(/[Оо]бщина\s+([А-Я][а-яё-]+(?:[ -][А-Я][а-яё-]+)?)/)?.[1];
  if (om) { const c = one(MUNI.filter((x) => norm(x.name) === norm(om))); if (c) return { code: c, self: false }; }
  if (/(?:гр\.\s*|,\s*|^)София\b|София[- ]град/.test(obj)) return { code: "SOF46", self: false };
  // „с. Х“ — селото, ако името му е еднозначно в страната
  const sm = obj.match(/(?:с\.|село)\s*([А-Я][а-яё-]+(?:[ -][А-Я][а-яё-]+)?)/)?.[1];
  if (sm) { const h = MUNI.filter((x) => SETT.get(x.code)?.has(norm(sm))); const c = one(h); if (c) return { code: c, self: false }; }
  // друг обект (училище, болница, ВиК, общинска фирма): по „гр. Х“ — градът е център на община
  const g = obj.match(/(?:гр\.|град)\s*([А-Я][а-яё-]+(?:[ -][А-Я][а-яё-]+)?)/)?.[1] ?? obj.match(/[-–]\s*([А-Я][а-яё-]+)\s*(?:ЕООД|ООД|АД)?\s*$/)?.[1];
  if (g) { const c = one(MUNI.filter((x) => norm(x.center) === norm(g))); if (c) return { code: c, self: false }; }
  return null;
}

const items = [];
for (const row of html.matchAll(/<tr><td[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>\s*<\/td><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><\/tr>/gs)) {
  const [, url, file, objRaw, basis, date] = row;
  const obj = strip(objRaw);
  const d = strip(date).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const p = place(obj);
  items.push({ url: url.startsWith("http") ? url : `https://www.adfi.minfin.bg${url}`, no: strip(file).replace(/(\s*\(\d\))?\.pdf$/i, "").replace(/-\[\d\]$/, ""), object: obj.replace(/\s*\(актуализиран[^)]*\)/, ""), updated: /актуализиран/.test(obj), basis: strip(basis), date: d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : null, muni: p?.code ?? null, self: p?.self ?? false });
}
items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
writeFileSync("data/adfi.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: URL, items }));
console.log(`АДФИ доклади: ${items.length}; с община: ${items.filter((x) => x.muni).length} (на самата община: ${items.filter((x) => x.self).length})`);
