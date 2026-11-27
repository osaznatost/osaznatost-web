// Общински съвет – Силистра: решенията с поименното гласуване от протоколите на obs-silistra.com.
// Сайтът показва файловете само в обикновен браузър (страница „One moment, please“ за автоматични заявки),
// затова текстът на протоколите се сваля от браузъра на човек и се подава тук като JSON:
//   node scripts/import-silistra.mjs silistra-protokoli.json [silistra-resheniya.json]
// Вход: [{label, url, text}] (текст на .odt протоколите); по избор списъкът с решенията [{label, url, card, head}].
// Изход: data/council/SLS31.json (същият вид като другите общини). Пазят се и решенията от предишни пускания.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [protoFile, listFile] = process.argv.slice(2);
if (!protoFile) throw new Error("Подайте JSON с протоколите");
const protos = JSON.parse(readFileSync(protoFile, "utf8"));
const list = listFile && existsSync(listFile) ? JSON.parse(readFileSync(listFile, "utf8")) : [];
const OUT = "data/council/SLS31.json";
const SRC = "https://obs-silistra.com/mandat-2023-2027/zasedaniya/resheniya/";

const iso = (d) => { const m = d?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null; };
const clean = (s) => s.replace(/\s+/g, " ").replace(/\s*([,;])\s*/g, "$1 ").trim();
// „Бирол Мехмед, Борислав Борисов, … и Стоян Киров“ → имена
const names = (s) => clean(s.replace(/([а-я])([А-Я])/g, "$1 $2")).replace(/^[–—-]\s*/, "").replace(/[.;:]+$/, "").split(/,\s*|\s+и\s+(?=[А-ЯЁ])/).map((x) => x.replace(/\s*[–—-]\s*/g, "-").replace(/^-|-$/g, "").trim()).filter((x) => /^[А-Я][а-я]+(?:-[А-Я][а-я]+)?\s+[А-Я]/.test(x));

// Блокът „Резултат от гласуването: … N гласа „за” – имена, M гласа „против” …; K гласа „въздържал се” – имена; и L неприсъствали – имена.“
function parseVote(b) {
  const t = b.replace(/ /g, " ").replace(/(\d)(?=[^\d\s.,])/g, "$1 ").replace(/([а-я])(\d)/g, "$1 $2");
  const part = (re) => { const m = t.match(re); return m ? { n: Number(m[1]), who: m[2] ?? "" } : { n: 0, who: "" }; };
  const fr = part(/(\d+)\s*глас(?:а|)\s*[„"“”]\s*за\s*[”"“]\s*(?:[–—-]\s*([^]*?))?(?=[,;]?\s*\d+\s*глас(?:а|)\s*[„"“”]\s*против|$)/i);
  const ag = part(/(\d+)\s*глас(?:а|)\s*[„"“”]\s*против\s*[”"“]\s*(?:[–—-]\s*([^]*?))?(?=;?\s*\d+\s*глас(?:а|)\s*[„"“”]\s*въздърж|$)/i);
  const ab = part(/(\d+)\s*глас(?:а|)\s*[„"“”]\s*въздърж[а-я ]*[”"“]\s*(?:[–—-]\s*([^]*?))?(?=;?\s*и\s*\d+\s*не\s*присъств|;?\s*и\s*няма|\.?\s*Общински|$)/i);
  if (!/глас/.test(t) || (!fr.n && !ag.n && !ab.n)) return null;
  const votes = [...names(fr.who).map((n) => [n, "for"]), ...names(ag.who).map((n) => [n, "against"]), ...names(ab.who).map((n) => [n, "abstain"])];
  const diff = Math.abs(names(fr.who).length - fr.n) + Math.abs(names(ag.who).length - ag.n) + Math.abs(names(ab.who).length - ab.n);
  // до една разлика: в самите протоколи понякога има грешка при преброяването (име, записано и „за“, и „неприсъствал“)
  const named = diff <= 1;
  return { tally: { for: fr.n, against: ag.n, abstain: ab.n, method: named ? "named" : "show" }, votes: named ? votes : [] };
}

const byNum = new Map(list.map((x) => [x.label.match(/\d+/)?.[0], x]).filter(([n]) => n));
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const out = new Map((prev?.decisions ?? []).map((d) => [d.number, d]));
let found = 0, tallied = 0, named = 0;
for (const p of protos) {
  if (!p.text) continue;
  const T = p.text.replace(/\r/g, "");
  const date = iso(T.match(/проведено\s*на\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1] ?? p.url.match(/(\d{2}\.\d{2}\.\d{4})/)?.[1] ?? "");
  const session = p.label.replace(/\s+/g, " ").trim();
  const re = /Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n\s*№\s*(\d+)/g;
  let last = 0, m;
  while ((m = re.exec(T))) {
    const seg = T.slice(last, m.index);
    last = m.index + m[0].length;
    const num = m[1];
    found++;
    const vi = seg.toLowerCase().lastIndexOf("резултат от гласуването");
    const vote = vi >= 0 ? parseVote(seg.slice(vi, seg.indexOf("\n", vi) > 0 ? seg.indexOf("\n", vi) : undefined)) : null;
    const pt = [...seg.matchAll(/По точка[^\n]*?[–—-]\s*[„"]([^\n]+?)[“"]\s*$/gm)].pop()?.[1] ?? "";
    let title = pt.replace(/^ДЗ\s*с?\s*вх\.?\s*№\s*\d+\s*от\s*[\d.]+\s*г?\.?\s*:?\s*/i, "").trim();
    const L = byNum.get(num);
    if (!title && L?.card) title = L.card.replace(/^Решение\s*№\s*\d+\s*/, "").replace(/\s*\d{2}\.\d{2}\.\d{4}\s*$/, "").replace(/^ДЗ\s*с?\s*вх\.?\s*№\s*\d+\s*от\s*[\d.]+\s*г?\.?\s*:?\s*/i, "");
    // текстът на решението: до следващата точка
    const nx = T.slice(last).search(/\n\s*По точка|\n\s*Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n/);
    const text = T.slice(last, nx > 0 ? last + nx : last + 4000).trim().slice(0, 4000);
    if (vote) { tallied++; if (vote.votes.length) named++; }
    out.set(num, {
      number: num, date, url: L?.url ?? p.url, title: title || `Решение № ${num}`, session, rapporteur: null,
      tally: vote?.tally ?? null, result: vote ? (vote.tally.for * 2 > vote.tally.for + vote.tally.against + vote.tally.abstain ? "adopted" : "rejected") : "adopted",
      tags: [], text, ...(vote?.votes.length ? { votes: vote.votes } : {}),
    });
  }
}
const decisions = [...out.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || Number(b.number) - Number(a.number));
writeFileSync(OUT, JSON.stringify({ version: 2, code: "SLS31", name: "Силистра", source: SRC, updated: new Date().toISOString().slice(0, 10), files: {}, done: true, complete: true, decisions }, null, 0));
console.log(`Силистра: ${protos.length} протокола, ${found} решения, ${tallied} с резултат, ${named} поименно → ${decisions.length} общо`);
