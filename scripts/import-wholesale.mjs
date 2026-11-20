// Цени на едро от Държавната комисия по стоковите борси и тържищата (ДКСБТ): страницата „Бюлетини“ показва
// средните цени на едро за последната седмица („Захар - 0.98 € / 1.92лв. за кг.“). Сайтът отговаря само на
// български IP адреси, затова задачата върви на self-hosted runner в България.
// Пише data/prices/wholesale.json: последните цени и история по седмици.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const URL_ = "http://dksbt.bg/?a=" + encodeURIComponent("ЦЕНИ и АНАЛИЗИ") + "&p=204";
const r = await fetch(URL_, { headers: { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" } });
if (!r.ok) { console.log("ДКСБТ не отговаря", r.status); process.exit(1); }
const html = await r.text();
const txt = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const MON = { януари: 1, февруари: 2, март: 3, април: 4, май: 5, юни: 6, юли: 7, август: 8, септември: 9, октомври: 10, ноември: 11, декември: 12 };
const w = txt.match(/Седмичен бюлетин\s+(\d{1,2})\s*-\s*(\d{1,2})\s+([а-я]+)\s+(\d{4})/i);
const week = w ? `${w[4]}-${String(MON[w[3].toLowerCase()] ?? 0).padStart(2, "0")}-${w[2].padStart(2, "0")}` : new Date().toISOString().slice(0, 10);
const items = {};
for (const m of txt.matchAll(/([А-Я][^€]{1,70}?)\s+-\s+(\d+(?:\.\d+)?)\s*€\s*\/\s*[\d.]+\s*лв\.\s*за\s+(кг|бр)\./g)) {
  const name = m[1].replace(/^.*\bза (?:кг|бр)\.\s*/, "").replace(/^.*справки\s+/, "").trim(), eur = +m[2];
  if (eur > 0) items[name] = { eur, unit: m[3] };
}
if (Object.keys(items).length < 10) { console.log("Разчетени са само", Object.keys(items).length, "цени, не записваме"); process.exit(1); }
const f = "data/prices/wholesale.json";
const prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { history: {} };
const history = prev.history ?? {};
history[week] = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.eur]));
writeFileSync(f, JSON.stringify({ week, source: "ДКСБТ, седмичен бюлетин на цените на едро", url: URL_, items, history }));
console.log("ДКСБТ: седмица до", week, "—", Object.keys(items).length, "цени");
console.log(Object.entries(items).map(([k, v]) => `${k}=${v.eur}/${v.unit}`).join("; "));
