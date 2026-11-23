// Проектобюджетът за следващата година, докато още не е приет: числата от чл. 1 на законопроекта в parliament.bg.
// Взимаме варианта на Министерския съвет („Становище на МС по чл. 1“), ако го има; иначе първия.
// Пише data/budget-draft.json; когато законът бъде обнародван (има ДВ), файлът се маха и страницата минава на приетия бюджет.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rtfToText } from "./lib/rtf.mjs";

const OUT = "data/budget-draft.json";
const budget = JSON.parse(readFileSync("data/budget.json", "utf8"));
const bills = JSON.parse(readFileSync("data/bills.json", "utf8")).bills;
const Y = budget.year + 1;
const bill = bills.find((b) => b.title === `Законопроект за държавния бюджет на Република България за ${Y} г.` && !b.withdrawn);
if (!bill || bill.dv) { if (existsSync(OUT)) rmSync(OUT); console.log("Няма висящ проектобюджет за", Y); process.exit(0); }

const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const j = await (await fetch(`https://www.parliament.bg/api/v1/bill/${bill.id}`, { headers: H, signal: AbortSignal.timeout(30000) })).json();
const f = j.file_list?.[0]?.FILENAME;
if (!f) { console.warn("Няма файл към законопроекта"); process.exit(0); }
const buf = Buffer.from(await (await fetch(`https://www.parliament.bg/bills/52/${f}`, { signal: AbortSignal.timeout(120000) })).arrayBuffer());
writeFileSync("/tmp/draft", buf);
let text;
if (/\.docx$/i.test(f)) text = execFileSync("unzip", ["-p", "/tmp/draft", "word/document.xml"], { maxBuffer: 256e6 }).toString().replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
else if (/\.rtf$/i.test(f)) text = rtfToText(buf.toString("latin1"));
else { console.warn("Непознат формат", f); process.exit(0); }
const L = text.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s && s !== "№");

// чл. 1 на МС, ако има отделно становище; иначе първият чл. 1
const starts = L.flatMap((s, i) => (/^Чл\. 1\. \(1\) Приема\s+държавния бюджет/.test(s) ? [i] : []));
if (!starts.length) { console.warn("Не намерих чл. 1"); process.exit(0); }
const st = L.findIndex((s) => /СТАНОВИЩЕ НА МИНИСТЕРСКИЯ СЪВЕТ ПО ЧЛ\. 1/.test(s));
const from = starts.find((i) => i > st && st >= 0) ?? starts[0];
const seg = L.slice(from, from + 260);
const end = seg.findIndex((s, i) => i > 0 && /^Чл\. 2\./.test(s));
const rows = end > 0 ? seg.slice(0, end) : seg;

const num = (s) => { const m = /^-?[\d ]+,\d$/.test(s) ? s : null; return m ? Math.round(Number(s.replace(/ /g, "").replace(",", ".")) * 1000) : null; };
// редовете: код, наименование, сума (хил. евро)
const items = [];
for (let i = 0; i < rows.length - 2; i++) {
  const code = rows[i], label = rows[i + 1], v = num(rows[i + 2]);
  if (/^([IVXІ]+\.|\d+(\.\d+)*\.)$/.test(code) && v !== null && !/^[\d ,-]+$/.test(label)) { items.push({ code: code.replace(/\.$/, "").replace(/І/g, "I"), label: label.replace(/\s+$/, ""), eur: v }); i += 2; }
}
const section = (roman) => {
  const i = items.findIndex((x) => x.code === roman);
  if (i < 0) return null;
  const next = items.findIndex((x, k) => k > i && /^[IVX]+$/.test(x.code));
  return { total: items[i].eur, lines: items.slice(i + 1, next < 0 ? undefined : next).map(({ code, label, eur }) => ({ code, label, eur })) };
};
const rev = section("I"), exp = section("II"), tr = section("III"), eu = section("IV"), bal = section("V");
if (!rev || !exp) { console.warn("Не разчетох приходите/разходите", items.slice(0, 5)); process.exit(0); }
const out = {
  year: Y, billId: bill.id, sign: bill.sign, url: bill.url, file: `https://www.parliament.bg/bills/52/${f}`, date: bill.date,
  variant: from > st && st >= 0 ? "Министерски съвет" : "законопроект",
  revenue: rev, expenditure: exp, transfers: tr, euContribution: eu?.total ?? null, balance: bal?.total ?? null,
  fetched: new Date().toISOString(),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log("Проектобюджет", Y, "приходи", rev.total, "разходи", exp.total, "трансфери", tr?.total, "ЕС", out.euContribution, "салдо", out.balance);
