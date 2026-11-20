// Тегли всички CSV файлове от набора „Плащания от СЕБРА“ в data.egov.bg (набор 57f1e2e7-b235-45e8-94c4-4d69f0b1a690).
// data.egov.bg приема автоматизирани заявки само от български IP адреси (писмо от МЕУ, 20.11.2026),
// затова се пуска на self-hosted runner в България (Mac-ът на Павлин). Не ползва прокси и не заобикаля ограничения.
// Употреба: node scripts/fetch-sebra.mjs <папка>   → после: python3 scripts/import-sebra.py <папка>
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
const DATASET = "57f1e2e7-b235-45e8-94c4-4d69f0b1a690";
const OUT = process.argv[2] ?? "/tmp/sebra";
mkdirSync(OUT, { recursive: true });
const api = async (method, body) => {
  const r = await fetch(`https://data.egov.bg/api/${method}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`);
  return r.json();
};
const d = await api("getDatasetDetails", { dataset_uri: DATASET });
const resources = d?.data?.resources ?? d?.resources ?? [];
if (!resources.length) { console.error("Наборът няма ресурси или форматът на отговора е друг:", JSON.stringify(d).slice(0, 500)); process.exit(1); }
let got = 0;
for (const res of resources) {
  const uri = res.uri ?? res.resource_uri, name = res.name ?? "";
  const dates = [...name.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
  const file = dates.length >= 2 ? `${dates[0][1]}${dates[0][2]}${dates[0][3]}-g-${dates[1][1]}${dates[1][2]}${dates[1][3]}.csv` : `${uri}.csv`;
  const path = `${OUT}/${file}`;
  if (existsSync(path) && statSync(path).size > 1000) continue;
  const r = await fetch(`https://data.egov.bg/resource/download/${uri}/csv`);
  if (!r.ok) { console.log(`Пропускам ${name}: HTTP ${r.status}`); continue; }
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
  got++; console.log("изтеглен", file, name);
  await new Promise((s) => setTimeout(s, 1500));
}
console.log(`Ресурси: ${resources.length}, нови файлове: ${got}`);
