// Решения на общински съвети, четени директно от сайтовете им (за общини, които „Наясно“ не покрива).
// Засега: Ботевград. Всяко решение: номер, дата, кой докладва, по какъв въпрос, гласуване (за/против/въздържал се,
// дали е поименно) и текстът на решението. Нужен е pdftotext (poppler-utils).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (osaznatost.bg; отворени данни)" };
const SITES = {
  SFO07: { name: "Ботевград", index: "https://botevgrad.bg/obs/reshenia", from: "2023-11-01", yearLink: /href="(https:\/\/botevgrad\.bg\/obs\/reshenie\/[^"]*?(\d{4})g-\d+)"/g },
};
const get = async (u, bin = false) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); } catch {} await new Promise((s) => setTimeout(s, 1500)); } return null; };
const ws = (s) => s.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const flat = (s) => s.replace(/\s+/g, " ").trim();

const TAGS = [
  ["procurement", /обществен[аи] поръчк/i],
  ["urban_planning", /\bПУП\b|подробен устройствен|УПИ|поземлен|имот|продажба|отдаване под наем|концеси|търг|застрояване|право на строеж|сервитут/i],
  ["personnel", /избира|освобождава|определя .*представител|управител|съвет на директорите|възнаграждени|назначава|кмет за .*отпуск/i],
  ["financial", /бюджет|кредит|заем|финансов|капиталов|субсиди|такс|цен[иа] на|данъ|дълг|авансов/i],
  ["social", /социал|здрав|болни|МБАЛ|образован|училищ|детск|градин|култур|читалищ|спорт/i],
];

function parse(text, url) {
  const out = [];
  const parts = text.split(/\n\s*Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n\s*№\s*(\d+)/);
  for (let i = 1; i < parts.length; i += 2) {
    const number = parts[i], chunk = parts[i + 1] ?? "";
    const dm = chunk.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*г/);
    if (!dm) continue;
    const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    const [head, rest = ""] = chunk.split(/Р\s*Е\s*Ш\s*И\s*:/);
    const h = flat(head.slice(head.indexOf(dm[0]) + dm[0].length));
    const rep = h.match(/ПО ДОКЛАДВАНЕ НА\s+(.+?)\s+[–—-]\s+([A-ZА-Я0-9 .,„“"'()\-–—/]+?)\s+на\s+(.+)/);
    let title = rep ? rep[3] : h;
    title = title.split(/\s*\/\s*вх|\s+и становищ|,\s*Общински съвет|\s+Общински съвет\s*[–-]/)[0].replace(/\s*\/$/, "").trim();
    const t = h.match(/(\d+)\s*глас\S*\s*„?\s*за\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*против\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*въздърж/);
    let body = rest.split(/\n[^\n]{0,60}:\s*\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ|\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ НА ОБЩИНСКИ|\nИзготвил|\nПриложение\s*(?:№\s*)?\d/)[0];
    body = ws(body);
    out.push({
      number, date, url, title: title.slice(0, 400),
      rapporteur: rep ? { name: rep[1].trim(), role: rep[2].trim().toLowerCase() } : null,
      tally: t ? { for: +t[1], against: +t[2], abstain: +t[3], method: /поименно/.test(h) ? "named" : "open" } : null,
      result: /^\s*(1\.\s*)?не\s+(приема|одобрява|дава)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
    });
  }
  return out;
}

mkdirSync("data/council", { recursive: true });
for (const [code, S] of Object.entries(SITES)) {
  const f = `data/council/${code}.json`;
  const prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { files: {}, decisions: [] };
  const idx = await get(S.index);
  if (!idx) { console.log(`${S.name}: сайтът не отговаря, пазим старите данни`); continue; }
  const years = [...idx.matchAll(S.yearLink)].map((m) => ({ url: m[1], year: +m[2] })).filter((y) => y.year >= +S.from.slice(0, 4));
  const files = [];
  for (const y of years) {
    const page = await get(y.url);
    if (!page) continue;
    for (const m of page.matchAll(/href="(https:\/\/botevgrad\.bg\/data\/[a-z]+\/files\/\d+\.pdf)[^"]*"[^>]*>\s*<\/a>|href="(https:\/\/botevgrad\.bg\/data\/[a-z]+\/files\/\d+\.pdf)/g)) {
      const u = m[1] ?? m[2];
      if (!files.includes(u)) files.push(u);
    }
  }
  let added = 0;
  for (const u of files) {
    if (prev.files[u]) continue;
    const buf = await get(u, true);
    if (!buf) continue;
    writeFileSync("/tmp/c.pdf", buf);
    let text = "";
    try { text = execFileSync("pdftotext", ["-layout", "/tmp/c.pdf", "-"], { maxBuffer: 1 << 28 }).toString(); } catch { continue; }
    const ds = parse(text, u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length;
    prev.decisions.push(...ds);
    added += ds.length;
  }
  const seen = new Map();
  for (const d of prev.decisions) seen.set(`${d.date.slice(0, 4)}-${d.number}`, d);
  const decisions = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date) || +b.number - +a.number);
  writeFileSync(f, JSON.stringify({ code, name: S.name, source: S.index, updated: new Date().toISOString().slice(0, 10), files: prev.files, decisions }));
  console.log(`${S.name}: ${files.length} файла, ${added} нови решения, общо ${decisions.length}; с гласуване ${decisions.filter((d) => d.tally).length}`);
}
