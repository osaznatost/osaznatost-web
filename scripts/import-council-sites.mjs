// Решения на общински съвети, четени директно от сайтовете им (за общини, които „Наясно“ не покрива).
// Засега: Ботевград (годишни PDF-и с всички решения) и Столична община (по един PDF на решение, номериран). Всяко решение: номер, дата, кой докладва, по какъв въпрос, гласуване (за/против/въздържал се,
// дали е поименно) и текстът на решението. Нужен е pdftotext (poppler-utils).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (osaznatost.bg; отворени данни)" };
const SITES = {
  // Столичен общински съвет: https://council.sofia.bg/documents/d/guest/r-<номер>-<година>. Без докладчик и гласуване в текста.
  SOF46: { name: "Столична община", numbered: (n, y) => `https://council.sofia.bg/documents/d/guest/r-${n}-${y}`, from: "2024-01-01", parse: "sofia" },
  // Общински съвет Русе (WordPress): всяко решение е отделна публикация „РЕШЕНИЕ № N Прието с Протокол № P/ДД.ММ.ГГГГг.“.
  RSE27: { name: "Русе", wpList: (p) => `https://obs.ruse-bg.eu/category/%d1%80%d0%b5%d1%88%d0%b5%d0%bd%d0%b8%d1%8f/${p > 1 ? `page/${p}/` : ""}`, wpPost: /href="(https:\/\/obs\.ruse-bg\.eu\/%d1%80%d0%b5%d1%88%d0%b5%d0%bd%d0%b8%d0%b5-%e2%84%96-\d+[^"]*)"/gi, from: "2023-11-01", council: "Общински съвет – Русе" },
  // Общински съвет Варна: един PDF „РЕШЕНИЯ № <заседание> от <дата>“ на заседание; решенията са „<номер>-<точка>.“.
  VAR06: { name: "Варна", sessionPdfs: "https://varnacouncil.bg/reshenija-na-obshtinski-savet-varna-mandat-2023-2027/", pdfLink: /href="(https:\/\/varnacouncil\.bg\/wp-content\/uploads\/[^"]*?РЕШЕНИЯ[^"]*?\.pdf)"/g, from: "2023-11-01", parse: "varna" },
  // Общински съвет Стара Загора: страница на протокол със списък „Решение № N от ДД.ММ.ГГГГг. относно: …“ и PDF на всяко решение.
  SZR31: { name: "Стара Загора", listPages: (p) => `https://www.starazagora.bg/bg/resheniya-i-protokoli${p > 0 ? `/page/${p * 20}` : ""}`, protoLink: /href="(bg\/resheniya-i-protokoli\/resheniya-ot-protokol-[^"#]+)"/g, base: "https://www.starazagora.bg/", from: "2023-11-01" },
  SFO07: { name: "Ботевград", index: "https://botevgrad.bg/obs/reshenia", from: "2023-11-01", yearLink: /href="(https:\/\/botevgrad\.bg\/obs\/reshenie\/[^"]*?(\d{4})g-\d+)"/g },
};
// Сайтът на общината не подава пълната верига от сертификати и fetch() в Node отказва; curl се справя.
// Щадящо: пауза между заявките; ако сайтът покаже проверка срещу ботове, спираме и пазим прочетеното.
let blocked = false;
const T0 = Date.now(), BUDGET = Number(process.env.MINUTES ?? 20) * 60e3; // времеви лимит за едно пускане
const timeUp = () => Date.now() - T0 > BUDGET;
const get = async (u, bin = false, tries = 3) => {
  if (blocked) return null;
  for (let i = 0; i < tries; i++) {
    await new Promise((s) => setTimeout(s, 2500));
    try {
      const b = execFileSync("curl", ["-sSLf", "-m", "90", "-A", UA["User-Agent"], u], { maxBuffer: 1 << 28 });
      if (!bin && /request is being verified|One moment, please/i.test(b.toString("utf8").slice(0, 3000))) { blocked = true; console.log("Сайтът пусна проверка срещу ботове: спираме за днес"); return null; }
      return bin ? b : b.toString("utf8");
    } catch {}
  }
  return null;
};
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
    // „ПО ДОКЛАДВАНЕ НА <ИМЕ> – <ДЛЪЖНОСТ> на <документ> /вх.№…/ и становища…“
    let rapporteur = null, title = h.replace(/^[.\s]+/, "");
    const pm = title.match(/ПО ДОКЛАДВАНЕ НА\s+(.+)/);
    if (pm) {
      const r = pm[1];
      const cut = r.search(/\s+на\s+(?=(?:[Дд]окладн|[Ии]нформаци|[Оо]тчет|[Пп]редложени|[Зз]аповед|[Гг]одишн|[Пп]рограм|[Сс]тановищ|[Пп]исмо|[Пп]ротест|[Пп]роект|[Аа]нализ|[Пп]лан|[Сс]тратеги|[Мм]отив|[Ии]скане|[Жж]алб|[Сс]игнал|[А-Я][а-я]))/);
      const who = cut > 0 ? r.slice(0, cut) : r;
      title = cut > 0 ? r.slice(cut).replace(/^\s+на\s+/, "") : title;
      const [nm, ...rl] = who.split(/\s+[–—-]\s+/);
      const role = rl.join(" – ").toLowerCase().replace(/\s*\/.*$/, "").replace(/\s+/g, " ").trim();
      rapporteur = {
        name: nm.replace(/^(д-р|инж\.?|арх\.?|ИНЖ\.?|Д-Р)\s*/i, "").trim(),
        role: /председател/.test(role) ? "председател на общинския съвет" : /^(за\s+)?кмет на общ/.test(role) ? (role.startsWith("за ") ? "за кмет на общината" : "кмет на общината") : /зам/.test(role) ? "заместник-кмет" : /общински съветник/.test(role) ? "общински съветник" : role,
      };
    }
    title = title.split(/\s*\/\s*вх|\s+и становищ|,\s*Общински съвет|\s+Общински съвет\s*[–-]/)[0].replace(/\s*\/$/, "").trim()
      .replace(/^[Дд]окладна записка\s+(относно|за)\s+/, "").replace(/^./, (c) => c.toUpperCase());
    const t = h.match(/(\d+)\s*глас\S*\s*„?\s*за\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*против\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*въздърж/);
    let body = rest.split(/\n[^\n]{0,60}:\s*\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ|\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ НА ОБЩИНСКИ|\nИзготвил|\nПриложение\s*(?:№\s*)?\d/)[0];
    body = ws(body);
    out.push({
      number, date, url, title: title.slice(0, 400),
      rapporteur,
      tally: t ? { for: +t[1], against: +t[2], abstain: +t[3], method: /поименно/.test(h) ? "named" : "open" } : null,
      result: /^\s*(1\.\s*)?не\s+(приема|одобрява|дава)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
    });
  }
  return out;
}

// Столична община: един PDF = едно решение.
function parseSofia(text, url) {
  const t = text.replace(/\f/g, "\n");
  const nm = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*((?:\d\s*){1,4})/);
  const dm = t.match(/от\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*годин/);
  if (!nm || !dm) return [];
  const number = nm[1].replace(/\s/g, ""), date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const afterDate = t.slice(t.indexOf(dm[0]) + dm[0].length);
  const title = flat(afterDate.split(/\n\s*(?:На основание|Мотиви|С Т О Л И Ч Н И Я Т|СТОЛИЧНИЯТ ОБЩИНСКИ)/)[0]).replace(/^(?:[А-ЯA-Z]\s+)?За\s+/, "").replace(/^./, (c) => c.toUpperCase());
  const rest = afterDate.split(/Р\s*Е\s*Ш\s*И\s*:/)[1] ?? "";
  const body = ws(rest.split(/\n\s*(?:Настоящото решение е прието|Решението е прието|ПРЕДСЕДАТЕЛ НА СТОЛИЧНИЯ|Приложени[ея]:?\s*\n)/)[0]);
  const pm = t.match(/Протокол\s*№\s*(\d+)[^\n]{0,40}?(?:т\.|точка)\s*(\d+)/);
  const doc = t.match(/(СО[АС]\d{2}-[А-Я]{2,3}\d{2,3}-\d+(?:[-/]\d+)?)/);
  // Номерът на докладната показва кой е внесъл въпроса: СОА — кметът и администрацията, СОС — общински съветници.
  const by = doc ? (doc[1].startsWith("СОА") ? "кмет и администрация" : "общински съветници") : null;
  return [{
    number, date, url, title: title.slice(0, 400), session: pm ? pm[1] : "",
    rapporteur: null, proposedBy: by, doc: doc ? doc[1] : null,
    tally: null,
    result: "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
  }];
}
const pdfText = (buf) => { writeFileSync("/tmp/c.pdf", buf); try { return execFileSync("pdftotext", ["-layout", "/tmp/c.pdf", "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return ""; } };

// Варна: протокол-извлечение на цяло заседание.
function parseVarna(text, url) {
  const t = text.replace(/\f/g, "\n");
  const dm = t.match(/проведено на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const sm = t.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*\n\s*№\s*(\d+)/);
  if (!dm) return [];
  const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const out = [];
  // Всяка точка от дневния ред: „по точка … ОТНОСНО … Докл.: Име – длъжност … Р Е Ш Е Н И Я: <решения>“.
  for (const item of t.split(/Препис-извлечение!?/).slice(1)) {
    const dk = item.match(/Докл\.?:\s*([^\n–—-]+?)\s*[–—-]\s*([^\n]+)/);
    const rapporteur = dk ? { name: flat(dk[1]).replace(/^(д-р|инж\.?|арх\.?)\s*/i, ""), role: flat(dk[2]).toLowerCase().replace(/^председател на пк/, "председател на постоянна комисия").slice(0, 80) } : null;
    const parts = item.split(/\n\s*(\d{2,5})-(\d{1,3})\.\s+/);
    for (let i = 1; i + 2 < parts.length; i += 3) {
      const number = parts[i], chunk = parts[i + 2] ?? "";
      const body = ws(chunk.split(/\n\s*ПРЕДСЕДАТЕЛ|\n\s*Общински съвет – Варна прие/)[0]).replace(/\n\s*\d+\s*\n/g, "\n");
      const by = body.match(/по (?:предложение|докладна записка) (?:на|от)\s+(?:г-н|г-жа)?\s*([^,\n]{3,120}?)(?:\s+с рег|,)/);
      const op = flat(body).split(/Общински съвет\s*[–-]\s*Варна\s*/)[1] ?? flat(body);
      const title = (op.length > 240 ? op.slice(0, 240).replace(/\s+\S*$/, "") + " …" : op).replace(/^./, (c) => c.toUpperCase());
      out.push({
        number, date, url, title, session: sm ? sm[1] : "", rapporteur, proposedBy: by ? flat(by[1]).replace(/^Кмета на Община Варна$/i, "кмета на общината") : null, tally: null,
        result: /^\s*не\s+(приема|одобрява|дава)/i.test(op) ? "rejected" : "adopted",
        tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
        text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
      });
    }
  }
  return out;
}
async function sessionPdfs(code, S, prev) {
  const idx = await get(S.sessionPdfs);
  if (!idx) return 0;
  const files = [...new Set([...idx.matchAll(S.pdfLink)].map((m) => m[1]))];
  let added = 0;
  for (const u of files) {
    if (timeUp() || blocked) break;
    if (u in prev.files) continue;
    const buf = await get(encodeURI(decodeURI(u)), true);
    if (!buf) continue;
    const ds = parseVarna(pdfText(buf), u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
// Стара Загора: страници със списък на протоколите, на всяка — решенията със заглавие и PDF.
async function protocolPages(code, S, prev) {
  let added = 0;
  for (let p = 0; p < 30; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.listPages(p));
    if (!list) break;
    const links = [...new Set([...list.matchAll(S.protoLink)].map((m) => S.base + m[1]))];
    if (!links.length) break;
    let old = 0;
    for (const u of links) {
      if (timeUp() || blocked) break;
      if (u in prev.files && !(prev.files[u] === 0)) continue;
      const page = await get(u);
      if (!page) continue;
      const tx = htmlText(page);
      const pdfs = [...page.matchAll(/href="(uploads\/posts\/[^"]*?prepis_(\d+)[^"]*\.pdf)"/g)].map((m) => [m[2], S.base + m[1]]);
      const ds = [];
      for (const m of tx.matchAll(/Решение\s*№\s*(\d+)\s*от\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*г?\.?\s*относно\s*:?\s*([^\n]+)/g)) {
        const date = `${m[4]}-${m[3].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        if (date < S.from) { old++; continue; }
        const title = flat(m[5]).replace(/^./, (c) => c.toUpperCase());
        ds.push({ number: m[1], date, url: pdfs.find((x) => x[0] === m[1])?.[1] ?? u, page: u, title: title.slice(0, 400), session: (u.match(/protokol-(\d+)/) ?? [])[1] ?? "", rapporteur: null, tally: null, result: "adopted",
          tags: TAGS.filter(([, re]) => re.test(title)).map(([k]) => k).slice(0, 2) });
      }
      prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
    }
    if (old > 0) break;
  }
  return added;
}

// WordPress: списък с публикации по страници, всяка публикация е едно решение в HTML.
const htmlText = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&#8211;|&ndash;/g, "–").replace(/&#8220;|&#8222;|&bdquo;/g, "„").replace(/&#8221;|&ldquo;|&rdquo;/g, "“").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
function parseWpPost(html, url, S) {
  const t = htmlText(html);
  const h = t.match(/РЕШЕНИЕ\s*№\s*(\d+)\s*Прието с Протокол\s*№\s*(\d+)\s*\/\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!h) return [];
  const date = `${h[5]}-${h[4].padStart(2, "0")}-${h[3].padStart(2, "0")}`;
  // Текстът: след последното заглавие до „ПРЕДСЕДАТЕЛ“.
  // Заглавието се повтаря (меню, „последни публикации“); взимаме срещането, след което идва самият текст.
  let after = "";
  for (let i = t.indexOf(h[0]); i >= 0; i = t.indexOf(h[0], i + 1)) {
    const a = t.slice(i + h[0].length);
    if (/^[\s\S]{0,600}?(На основание|\sреши\s*:)/i.test(a)) { after = a; break; }
  }
  if (!after) return [];
  const main = after.slice(Math.max(0, after.search(/На основание|Общински съвет/))).split(/\n\s*ПРЕДСЕДАТЕЛ|This website uses cookies|\nСподели/)[0];
  const op = (main.split(/\sреши\s*:/i)[1] ?? main).trim();
  const body = ws(op);
  // Решенията в Русе нямат отделно заглавие: взимаме първата точка от решението (без да режем на „гр.“, „м.“ и т.н.).
  const first = flat(body.split(/\n(?=\d+\.\s)/)[0]).replace(/^\d+\.\s*/, "");
  const title = first.length > 240 ? first.slice(0, 240).replace(/\s+\S*$/, "") + " …" : first;
  const pdf = html.match(/href="([^"]+\.pdf)"/)?.[1] ?? null;
  return [{
    number: h[1], date, url: pdf ?? url, page: url, title, session: h[2], rapporteur: null, tally: null,
    result: /^\s*(1\.\s*)?не\s+(приема|одобрява|дава)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
  }];
}
async function wordpress(code, S, prev) {
  let added = 0;
  for (let p = 1; p < 400; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.wpList(p), false, 2);
    if (!list) break;
    const links = [...new Set([...list.matchAll(S.wpPost)].map((m) => m[1]))];
    if (!links.length) break;
    let fresh = 0, old = 0;
    for (const u of links) {
      if (timeUp() || blocked) break;
      if (u in prev.files) continue;
      fresh++;
      const page = await get(u);
      if (!page) continue;
      const ds = parseWpPost(page, u, S);
      prev.files[u] = ds.length;
      for (const d of ds) { if (d.date >= S.from) { prev.decisions.push(d); added++; } else old++; }
    }
    // Списъкът е от най-новите към най-старите: при пълно обхождане спираме, щом стигнем до решения отпреди мандата
    // или до страница без нищо ново (когато вече сме прочели всичко веднъж).
    if (old > 0 || (fresh === 0 && prev.complete)) break;
    if (p > 1 && fresh === 0 && !prev.complete) continue;
  }
  if (!timeUp() && !blocked) prev.complete = true;
  return added;
}

// Номерирани решения: обхождаме номерата по години; спираме след 40 поредни липсващи над най-големия известен.
async function numbered(code, S, prev) {
  let added = 0;
  const thisYear = new Date().getFullYear();
  for (let y = +S.from.slice(0, 4); y <= thisYear; y++) {
    const have = Object.entries(prev.files).filter(([u]) => u.endsWith(`-${y}`));
    const max = Math.max(0, ...have.filter(([, v]) => v > 0).map(([u]) => +u.match(/r-(\d+)-\d{4}$/)[1]));
    if (y < thisYear && prev.done?.[y]) continue;
    let miss = 0;
    for (let n = 1; miss < 40; n++) {
      if (timeUp() || blocked) return added;
      const u = S.numbered(n, y);
      if (u in prev.files && (prev.files[u] > 0 || y < thisYear || n < max)) { miss = prev.files[u] > 0 ? 0 : miss + (n > max ? 1 : 0); continue; }
      const buf = await get(u, true, 1);
      const ok = buf && buf.slice(0, 5).toString() === "%PDF-";
      const ds = ok ? parseSofia(pdfText(buf), u) : [];
      prev.files[u] = ds.length;
      if (ds.length) { prev.decisions.push(...ds); added += ds.length; miss = 0; } else if (n > max) miss++;
    }
    if (y < thisYear) (prev.done ??= {})[y] = true;
  }
  return added;
}

const VERSION = 2; // смяна на разчитането → всички файлове се четат наново
mkdirSync("data/council", { recursive: true });
for (const [code, S] of Object.entries(SITES)) {
  if (process.env.ONLY && process.env.ONLY !== code) continue;
  const f = `data/council/${code}.json`;
  let prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  if (!prev || prev.version !== VERSION) prev = { files: {}, decisions: [] };
  if (S.numbered || S.wpList || S.sessionPdfs || S.listPages) {
    const added = S.numbered ? await numbered(code, S, prev) : S.wpList ? await wordpress(code, S, prev) : S.sessionPdfs ? await sessionPdfs(code, S, prev) : await protocolPages(code, S, prev);
    const seen = new Map();
    for (const d of prev.decisions) { d.title = d.title.replace(/^[А-ЯA-Z]\s+За\s+(.)/, (_, c) => c.toUpperCase()); seen.set(`${d.date.slice(0, 4)}-${d.number}`, d); }
    const decisions = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date) || +b.number - +a.number);
    writeFileSync(f, JSON.stringify({ version: VERSION, code, name: S.name, source: S.numbered ? "https://council.sofia.bg" : new URL(S.wpList?.(1) ?? S.sessionPdfs ?? S.listPages(0)).origin, updated: new Date().toISOString().slice(0, 10), files: prev.files, done: prev.done ?? {}, complete: prev.complete ?? false, decisions }));
    console.log(`${S.name}: ${added} нови решения, общо ${decisions.length}`);
    continue;
  }
  if (timeUp()) continue;
  const idx = await get(S.index);
  if (!idx) { console.log(`${S.name}: сайтът не отговаря, пазим старите данни`); continue; }
  // Старите години вече са прочетени: обхождаме само текущата и предходната.
  const known = Object.keys(prev.files).length > 0;
  const thisYear = new Date().getFullYear();
  const years = [...idx.matchAll(S.yearLink)].map((m) => ({ url: m[1], year: +m[2] })).filter((y) => y.year >= +S.from.slice(0, 4) && (!known || y.year >= thisYear - 1));
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
  writeFileSync(f, JSON.stringify({ version: VERSION, code, name: S.name, source: S.index, updated: new Date().toISOString().slice(0, 10), files: prev.files, decisions }));
  console.log(`${S.name}: ${files.length} файла, ${added} нови решения, общо ${decisions.length}; с гласуване ${decisions.filter((d) => d.tally).length}`);
}
