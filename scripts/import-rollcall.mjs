// Поименни гласувания директно от parliament.bg, за дните, които „Наясно“ още няма.
// Всяка стенограма (pl-sten/{id}) има прикачени CSV файлове:
//   „Поименно гласуване“: ред за всеки депутат и точка (NAME, textbox7 = id, textbox8 = група, ITEM, textbox2 = вот);
//   „Гласуване по парламентарни групи“: заглавието на всяка точка („Номер (N) ГЛАСУВАНЕ … по тема <заглавие>“).
// Сурово прочетеното се пази в data/rollcall/<дата>.json, а после се слива в data/parliament-ns52.json.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { needed } from "./majority.mjs";



const NS = process.env.NS ?? "52";
const API = "https://www.parliament.bg/api/v1";
const PUB = "https://www.parliament.bg";
const H = { "User-Agent": "Mozilla/5.0 (osaznatost.bg)", Accept: "application/json, text/plain, */*", "X-Requested-With": "XMLHttpRequest" };
const DIR = "data/rollcall";
const STATE = `${DIR}/state.json`;
const MAIN = `data/parliament-ns${NS}.json`;
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = JSON.parse(readFileSync(MAIN, "utf8"));
// Повторяемо: махаме добавеното при предишно пускане.
{
  const keep = main.mps.map((m, i) => (m.added ? -1 : i)).filter((i) => i >= 0);
  main.votes = main.votes.filter((v) => v.src !== "parliament.bg");
  for (const v of main.votes) v.v = keep.map((i) => v.v[i]).join("");
  main.mps = keep.map((i) => main.mps[i]);
}
const lastDate = main.votes.reduce((m, v) => (v.date > m ? v.date : m), "");

// Начална точка: стенограмата на последния ден при „Наясно“.
let state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
if (!state) {
  const r = await fetch(`https://raw.githubusercontent.com/atanasster/electionsbg/main/data/parliament/votes/sessions/${lastDate}.json`);
  state = { maxId: (await r.json()).stenogramId };
}

async function getJson(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: H });
      const t = await r.text();
      try { return JSON.parse(t); } catch { return null; }
    } catch { await sleep(800 * (a + 1)); }
  }
  return null;
}
const fileUrl = (f) => (f.startsWith("http") ? f : PUB + (f.startsWith("/") ? f : "/" + f));
async function getText(f) {
  const r = await fetch(fileUrl(f), { headers: { ...H, Accept: "text/csv, */*" } });
  if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
  return new TextDecoder("utf-8").decode(await r.arrayBuffer());
}
const lines = (t) => t.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
function firstField(line) {
  if (line[0] !== '"') return line.split(",")[0];
  let out = "";
  for (let i = 1; i < line.length; i++) {
    if (line[i] === '"') { if (line[i + 1] === '"') { out += '"'; i++; continue; } break; }
    out += line[i];
  }
  return out;
}
function parseRollcall(text) {
  const ls = lines(text);
  const h = ls[0].split(",").map((s) => s.trim());
  const ix = { name: h.indexOf("NAME"), id: h.indexOf("textbox7"), party: h.indexOf("textbox8"), item: h.indexOf("ITEM"), vote: h.indexOf("textbox2") };
  if (Object.values(ix).some((v) => v < 0)) throw new Error("непознати колони: " + h.join("|"));
  return ls.slice(1).map((l) => l.split(",").map((s) => s.trim())).filter((c) => c.length >= h.length)
    .map((c) => ({ id: +c[ix.id], name: c[ix.name], party: c[ix.party], item: +c[ix.item], vote: c[ix.vote] }))
    .filter((r) => Number.isFinite(r.id) && Number.isFinite(r.item));
}
const TITLE_RE = /Номер\s*\(\s*(\d+)\s*\)\s+ГЛАСУВАНЕ[\s\S]*?по\s+тема\s+(.+?)$/u;
function titlesFromCells(cells) {
  const out = {};
  for (const c of cells) {
    const m = TITLE_RE.exec(String(c ?? "").replace(/\s+/g, " ").trim());
    if (m && !out[m[1]]) out[m[1]] = m[2].replace(/[\s.,;:!?-]+$/u, "").trim();
  }
  return out;
}
const parseTitles = (text) => titlesFromCells(lines(text).slice(1).map(firstField));
async function titlesFromXlsx(f) {
  const XLSX = (await import("xlsx")).default;
  const r = await fetch(fileUrl(f), { headers: H });
  const wb = XLSX.read(new Uint8Array(await r.arrayBuffer()), { type: "array" });
  const cells = wb.SheetNames.flatMap((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }).flat());
  return titlesFromCells(cells);
}
// Заглавията: CSV на групите, а ако там няма (грешно качен файл), XLSX на групите.
async function findTitles(files) {
  const groups = files.filter((f) => /групи/i.test(f.Pl_StenDname));
  for (const f of groups.filter((f) => /\.csv$/i.test(f.Pl_StenDfile))) {
    const t = parseTitles(await getText(f.Pl_StenDfile));
    if (Object.keys(t).length) return t;
  }
  for (const f of groups.filter((f) => /\.xlsx$/i.test(f.Pl_StenDfile))) {
    try { const t = await titlesFromXlsx(f.Pl_StenDfile); if (Object.keys(t).length) return t; } catch (e) { console.log("  xlsx:", e.message); }
  }
  return {};
}

// 1. Обхождане на нови стенограми.
let gap = 0, id = state.maxId, scanned = 0;
while (gap < 30 && scanned < 200) {
  id++; scanned++;
  const s = await getJson(`${API}/pl-sten/${id}`);
  await sleep(150);
  if (!s?.Pl_Sten_id || !s.Pl_Sten_date) { gap++; continue; }
  gap = 0;
  state.maxId = id;
  const date = s.Pl_Sten_date.slice(0, 10);
  const files = s.files ?? [];
  const roll = files.find((f) => /Поименно/i.test(f.Pl_StenDname) && /\.csv$/i.test(f.Pl_StenDfile));
  const pdf = files.find((f) => /\.pdf$/i.test(f.Pl_StenDfile));
  if (!roll) { console.log(`  ${date} (id ${id}): няма CSV с поименно гласуване`); continue; }
  const failed = files.some((f) => /provaleno/i.test(f.Pl_StenDfile));
  const rows = parseRollcall(await getText(roll.Pl_StenDfile));
  const titles = failed ? {} : await findTitles(files);
  writeFileSync(`${DIR}/${date}.json`, JSON.stringify({ date, stenogramId: id, failed, pdf: pdf ? fileUrl(pdf.Pl_StenDfile) : null, titles, rows }));
  console.log(`+ ${date} (id ${id}): ${rows.length} реда, ${Object.keys(titles).length} заглавия`);
}
writeFileSync(STATE, JSON.stringify(state));

// Дни без заглавия: опит отново (групите понякога се качват по-късно или в друг формат).
for (const f of readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
  const day = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  if (Object.keys(day.titles).length || day.failed === true) continue;
  const s = await getJson(`${API}/pl-sten/${day.stenogramId}`);
  const files = s?.files ?? [];
  day.failed = files.some((x) => /provaleno/i.test(x.Pl_StenDfile));
  if (!day.failed) day.titles = await findTitles(files);
  writeFileSync(`${DIR}/${f}`, JSON.stringify(day));
  console.log(`  ${day.date}: ${day.failed ? "провалено заседание (без кворум)" : Object.keys(day.titles).length + " заглавия"}`);
}

// 2. Сливане в основния файл: само дни след последния ден при „Наясно“.
const VOTE = { "+": "y", "-": "n", "=": "a" };
const norm = (p) => p.replace(/\s+/g, "").toUpperCase();
const nameKey = (n) => n.toUpperCase().replace(/[^А-ЯЁA-Z]+/g, " ").trim();
const byName = new Map(main.mps.map((m) => [nameKey(m.name), m.id]));
const ourId = (r) => byName.get(nameKey(r.name)) ?? 900000 + r.id; // нов депутат: отделно пространство за номерата
const knownParty = new Map(main.mps.map((m) => [m.id, m.party]));
const labelMap = new Map(); // CSV етикет → нашия етикет, научен от познатите депутати
const cached = readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
for (const f of cached) for (const r of JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")).rows) {
  const oid = ourId(r);
  if (knownParty.has(oid) && !labelMap.has(norm(r.party))) labelMap.set(norm(r.party), knownParty.get(oid));
}
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
const topicOf = (t) => /бюджет/i.test(t) ? "budget" : /ратифик/i.test(t) ? "ratification" : /данък|ДДС|акциз/i.test(t) ? "tax"
  : /ЗИД|закон/i.test(t) ? "zid" : /избор|освобожд|министър|председател|член/i.test(t) ? "personnel" : "other";

let added = 0;
for (const f of cached) {
  const day = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  if (day.date <= lastDate) continue;
  if (day.failed) { (main.failedSittings ??= []).push(day.date); continue; }
  for (const r of day.rows) r.id = ourId(r);
  for (const r of day.rows) {
    if (!main.mps.some((m) => m.id === r.id)) {
      main.mps.push({ id: r.id, name: titleCase(r.name), party: labelMap.get(norm(r.party)) ?? r.party, presentPct: null, added: true });
      console.log(`  нов депутат: ${r.name} (${r.party})`);
      main.votes.forEach((v) => (v.v += "-"));
    }
  }
  const pos = new Map(main.mps.map((m, i) => [m.id, i]));
  const items = [...new Set(day.rows.map((r) => r.item))].sort((a, b) => a - b);
  for (const item of items) {
    if (item === 1 && !day.titles[item]) continue; // точка 1 е регистрацията
    const title = day.titles[item] ?? `Гласуване ${item} от ${day.date} (заглавието не е публикувано в източника)`;
    const arr = new Array(main.mps.length).fill("-");
    const tally = { yes: 0, no: 0, abstain: 0, absent: 0 };
    for (const r of day.rows.filter((x) => x.item === item)) {
      const c = VOTE[r.vote] ?? "x";
      arr[pos.get(r.id)] = c;
      tally[{ y: "yes", n: "no", a: "abstain", x: "absent" }[c]]++;
    }
    const voting = tally.yes + tally.no + tally.abstain;
    const passed = tally.yes >= needed(title, voting);
    main.votes.push({
      id: `${day.date}-${item}`, date: day.date, item, title, topic: topicOf(title),
      outcome: passed ? (tally.no === 0 && tally.abstain === 0 ? "passed_unanimous" : "passed") : "rejected",
      tally, contest: voting ? +(1 - Math.abs(tally.yes - tally.no - tally.abstain) / voting).toFixed(3) : null,
      v: arr.join(""), pdf: day.pdf, src: "parliament.bg",
    });
    added++;
  }
}
main.votes.sort((a, b) => (a.date === b.date ? b.item - a.item : a.date < b.date ? 1 : -1));
main.updatedAt = new Date().toISOString();
writeFileSync(MAIN, JSON.stringify(main));
console.log(`Добавени ${added} гласувания след ${lastDate}. Депутати: ${main.mps.length}.`);
