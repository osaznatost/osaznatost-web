// Тегли всички CSV файлове от набора „Плащания от СЕБРА“ в data.egov.bg (набор 57f1e2e7-b235-45e8-94c4-4d69f0b1a690).
// data.egov.bg приема автоматизирани заявки само от български IP адреси (писмо от МЕУ, 20.11.2026),
// затова се пуска на self-hosted runner в България (Mac-ът на Павлин). Не ползва прокси и не заобикаля ограничения.
// Употреба: node scripts/fetch-sebra.mjs <папка>   → после: python3 scripts/import-sebra.py <папка>
import { mkdirSync, writeFileSync, existsSync, statSync, readdirSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
const DATASET = "57f1e2e7-b235-45e8-94c4-4d69f0b1a690";
const OUT = process.argv[2] ?? "/tmp/sebra";
mkdirSync(OUT, { recursive: true });
const api = async (method, body) => {
  const r = await fetch(`https://data.egov.bg/api/${method}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`);
  return r.json();
};
const d = await api("getDatasetDetails", { dataset_uri: DATASET });
let resources = d?.data?.resources ?? d?.resources ?? [];
if (!resources.length) {
  // Ресурсите са в отделен метод; страниците са по 100 записа.
  for (let page = 1; page < 20; page++) {
    const r = await api("listResources", { criteria: { dataset_uri: DATASET }, records_per_page: 100, page_number: page });
    const list = r?.resources ?? r?.data?.resources ?? r?.data ?? [];
    if (page === 1 && !Array.isArray(list)) console.log("listResources:", JSON.stringify(r).slice(0, 800));
    if (!Array.isArray(list) || !list.length) break;
    resources.push(...list);
    if (list.length < 100) break;
  }
}
if (!resources.length) { console.error("Наборът няма ресурси или форматът на отговора е друг:", JSON.stringify(d).slice(0, 500)); process.exit(1); }
let got = 0;
const ONLY_ZIP = process.env.ONLY_ZIP === "1"; // проба: само ZIP ресурсите, без обобщение
if (ONLY_ZIP) for (const res of resources.filter((x) => /zip/i.test(String(x.file_format ?? x.format ?? x.name)))) console.log("ZIP ресурс:", JSON.stringify(res).slice(0, 1500));
for (const res of resources) {
  const uri = res.uri ?? res.resource_uri, name = res.name ?? "";
  const dates = [...name.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
  const file = dates.length >= 2 ? `${dates[0][1]}${dates[0][2]}${dates[0][3]}-g-${dates[1][1]}${dates[1][2]}${dates[1][3]}.csv` : `${uri}.csv`;
  const path = `${OUT}/${file}`;
  if (ONLY_ZIP) continue;
  if (existsSync(path) && statSync(path).size > 1000) continue;
  const fmt = String(res.format ?? res.file_format ?? "csv").toLowerCase();
  let r = await fetch(`https://data.egov.bg/resource/download/${uri}/${fmt}`);
  if (r.ok && /text\/html/.test(r.headers.get("content-type") ?? "")) { console.log("HTML вместо файл за", name, "— опитвам като CSV"); r = await fetch(`https://data.egov.bg/resource/download/${uri}/csv`); }
  if (r.ok && /text\/html/.test(r.headers.get("content-type") ?? "")) { console.log("Пропускам", name, ": порталът връща страница, не файл. Полета:", JSON.stringify(Object.keys(res))); continue; }
  if (!r.ok) { console.log(`Пропускам ${name}: HTTP ${r.status}`); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  console.log("файл", file, buf.length, "байта, начало:", JSON.stringify(buf.slice(0, 60).toString("latin1")), r.headers.get("content-type"), JSON.stringify(res.format ?? res.file_format ?? ""));
  if (buf.slice(0, 2).toString() === "PK") {
    // По-старите периоди са качени като ZIP с CSV вътре: разархивираме и пазим CSV файловете с името на периода.
    const tmp = `${OUT}/_zip_${uri}`;
    mkdirSync(tmp, { recursive: true });
    writeFileSync(`${tmp}/a.zip`, buf);
    execFileSync("unzip", ["-o", "-q", `${tmp}/a.zip`, "-d", tmp]);
    const csvs = readdirSync(tmp, { recursive: true }).filter((f) => /\.csv$/i.test(String(f)));
    csvs.forEach((f, i) => renameSync(`${tmp}/${f}`, i === 0 ? path : path.replace(/\.csv$/, `-${i}.csv`)));
    console.log("ZIP:", csvs.length, "CSV файла");
  } else writeFileSync(path, buf);
  got++; console.log("изтеглен", file, name);
  await new Promise((s) => setTimeout(s, 1500));
}
console.log(`Ресурси: ${resources.length}, нови файлове: ${got}`);
