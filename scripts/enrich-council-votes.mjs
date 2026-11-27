// Гласувания от протоколите на заседанията: за общини, които публикуват решенията без резултата,
// а гласуването (често поименно) е само в стенографския протокол на сесията.
// Четем протокола, намираме всяко „в резултат на … гласуване, с N гл. „за“ …“ + следващото „РЕШИ:“
// и го свързваме с решението от data/council/<код>.json по текста (началото на диспозитива).
// Без изкуствен интелект: само правила. Нужен е pdftotext (poppler-utils).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
const MINUTES = +(process.env.MINUTES ?? 40);
const T0 = Date.now();
const timeUp = () => Date.now() - T0 > MINUTES * 60e3;

const SRC = {
  BGS04: {
    // Списъкът „Видеоархив и протокол на заседание №N от дата …“ → страница → PDF на протокола.
    index: (p) => `https://www.burgascouncil.org/protokoli${p ? `?page=${p}` : ""}`,
    session: /href="(\/node\/\d+)"[^>]*>(?:\s|<[^>]+>)*ВИДЕОАРХИВ[^<]{0,40}?ЗАСЕДАНИЕ\s*(?:№|&#8470;|N)?\s*(\d+)\s*ОТ\s+ДАТА\s*([\d.]+)/gi,
    file: /href="([^"]*(?:protokol|%D0%BF%D1%80%D0%BE%D1%82)[^"]*\.pdf)"/i,
    base: "https://www.burgascouncil.org",
  },
  SLV20: {
    // Връзките в списъка са направо към протоколите (PDF без разширение).
    named: true,
    index: (p) => (p ? null : "https://obs.sliven.bg/protokoli-ot-zasedaniyata"),
    session: /href="(https:\/\/obs\.sliven\.bg\/uploads\/[A-F0-9]+)"[^>]*>\s*Протокол от[^<]*?заседание[^<]*?проведено на\s*([\d.]+)()/gi,
    direct: true,
    base: "https://obs.sliven.bg",
  },
  SZR12: {
    // „Протоколи от проведени заседания на ОбС“ → страница page-N.html → PDF; поименният списък е точно преди реда „№964“.
    named: true,
    bareNo: true,
    noLayout: true, // в режим „layout“ поименният списък излиза на две колони
    index: (p) => (p > 12 ? null : p ? `https://obs.kazanlak.bg/index.php?p=c&r=92&page=${p + 1}` : "https://obs.kazanlak.bg/cat-92.html"),
    session: /href="\/?(page-\d{4}\.html)"()()/gi,
    file: /href="([^"]*common\/docs\/[^"]*[Pp]rotokol[^"]*\.pdf)"/,
    strictFile: true,
    base: "https://obs.kazanlak.bg/",
  },
  VAR06: {
    // Отделен PDF „Електронно гласуване“ за всяко заседание: всяко гласуване с „Гласуване на Решение № N-…“ и поименния списък.
    evote: true,
    index: (p) => (p ? null : "https://varnacouncil.bg/zasedanija-na-obshtinski-savet-mandat-2023-2027/"),
    session: /href="(https:\/\/varnacouncil\.bg\/[^"]+)"[^>]*>(?:\s|<[^>]+>)*Заседание\s*№\s*(\d+)\s*от\s*([\d.]+)/gi,
    file: /href="([^"]*(?:Електронно-гласуване|%D0%95%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D0%BE-%D0%B3%D0%BB%D0%B0%D1%81)[^"]*\.pdf)"/i,
    base: "https://varnacouncil.bg",
  },
};

/** Сливен: в протокола поименният списък („12. ИМЕ ФАМИЛИЯ: За“) е точно преди „РЕШЕНИЕ № N“. */
export function parseNamedBefore(raw, bareNo = false) {
  const t = raw.replace(/\r/g, "").replace(/\f/g, "\n");
  // Казанлък: номерът е сам на ред („№964“), без думата „РЕШЕНИЕ“
  const parts = t.split(bareNo ? /\n\s*(?:РЕШЕНИЕ\s*\n?\s*)?№\s*(\d{2,5})\s*(?=\n)/ : /\n\s*РЕШЕНИЕ\s*\n?\s*№\s*(\d+)/);
  const out = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    const before = parts[i - 1].slice(-6000);
    let votes = [];
    for (const v of before.matchAll(/^\s*(\d+)\.\s+([А-ЯЁA-Z][А-ЯЁA-Z\- ]{4,70}?)\s*:\s*(За|Против|Въздържал(?:а)?\s+се|Не\s+гласувал(?:а)?)\s*$/gim)) {
      if (v[1] === "1") votes = [];
      const k = VOTE[v[3].toLowerCase().replace(/\s+/g, " ")];
      if (k) votes.push([v[2].trim().toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase()), k]);
    }
    // списъкът трябва да свършва точно преди решението (иначе е от друго гласуване)
    const tail = before.slice(before.lastIndexOf(":") + 1);
    if (votes.length < 5 || tail.replace(/\s|\d|\./g, "").length > 60) continue;
    const c = (k) => votes.filter((v) => v[1] === k).length;
    out.set(parts[i], { for: c("for"), against: c("against"), abstain: c("abstain"), method: "named", votes });
  }
  return out;
}

/** Гъвкаво разчитане на резултата: „Гласували: „За” – 21; „Против” – няма; „Въздържали се” – няма“,
 *  „за – 2 9, против – няма, въздържали се – няма“, „РЕЗУЛТАТИ ОТ ПРОВЕДЕНО ГЛАСУВАНЕ: ЗА – 21: имена; ПРОТИВ – 0 …“,
 *  таблицата на Пазарджик „Общо гласували За Против Въздържали се 41 32 32 0 0“. Връща първото пълно гласуване. */
export function flexTally(raw) {
  const t = raw.replace(/\r/g, "").replace(/[“”„«»’`]/g, '"').replace(/([–-]\s*)(\d)\s(\d)(?!\d)/g, "$1$2$3");
  const nn = (x) => (/^\d+$/.test(x) ? +x : 0);
  const pz = t.match(/Общо\s+гласували\s+За\s+Против\s+Въздържали\s+се\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
  if (pz) return { tally: { for: +pz[3], against: +pz[4], abstain: +pz[5], method: "open" }, votes: [] };
  const V = "(\\d+|няма|без|нула)";
  for (const a of t.matchAll(/гласува\S*|резултат\S*\s+от\s+(?:проведено(?:то)?\s+)?гласуване|при\s+гласували/gi)) {
    const r = t.slice(a.index, a.index + 900);
    const f = r.match(new RegExp(`(?<![а-яА-Я])за"?\\s*[–:-]?\\s*${V}(?![\\d.,]\\d)`, "i"));
    if (!f) continue;
    const both = r.match(new RegExp(`против"?\\s+и\\s+"?въздържал\\S*(?:\\s+се)?"?\\s*[–:-]?\\s*${V}`, "i"));
    const ag = both ?? r.match(new RegExp(`против"?\\s*[–:-]?\\s*${V}`, "i"));
    const ab = both ?? r.match(new RegExp(`въздържал\\S*(?:\\s+се)?"?\\s*[–:-]?\\s*${V}`, "i"));
    if (!ag && !ab) continue;
    if (ag && ag.index < f.index) continue; // „против“ преди „за“ — не е резултат
    // Враца: „ЗА – 21: Адр.Тодоров, В.Врачовски, …; ПРОТИВ – 0“
    const votes = [];
    const grab = (re, k) => { const m = r.match(re); if (m) for (const n of m[1].split(/[,;]\s*/)) { const x = n.trim().replace(/\.$/, ""); if (/^[А-ЯЁ][А-Яа-яЁё.\- ]{2,40}$/.test(x)) votes.push([x, k]); } };
    grab(/(?<![а-яА-Я])за"?\s*[–-]\s*\d+\s*:\s*([^]*?)(?=против|въздърж|$)/i, "for");
    grab(/против"?\s*[–-]\s*\d+\s*:\s*([^]*?)(?=въздърж|$)/i, "against");
    grab(/въздърж\S*(?:\s+се)?"?\s*[–-]\s*\d+\s*:\s*([^]*?)(?=\n\s*\n|ПРЕДСЕДАТЕЛ|$)/i, "abstain");
    const tally = { for: nn(f[1]), against: ag ? nn(ag[1]) : 0, abstain: ab ? nn(ab[1]) : 0 };
    const ok = votes.length && Math.abs(votes.length - tally.for - tally.against - tally.abstain) <= 2;
    return { tally: { ...tally, method: ok || /поименно/i.test(r) ? "named" : "open" }, votes: ok ? votes : [] };
  }
  return null;
}

/** Гласуване от PDF на отделно решение (препис-извлечение или протокол за гласуване на точката). */
export function tallyAny(raw) {
  const t = raw.replace(/\r/g, "");
  const nn = (x) => (/^\d+$/.test(x) ? +x : 0); // „няма“, „без“ → 0
  // Русе: „ПРОТОКОЛ ЗА ГЛАСУВАНЕ … • ЗА: 43 • ПРОТИВ: 0 • ВЪЗДЪРЖАЛ СЕ: 2“ + таблица „Име  Група  Гласувал“
  const ru = t.match(/•\s*ЗА:\s*(\d+)[\s\S]{0,200}?•\s*ПРОТИВ:\s*(\d+)[\s\S]{0,200}?•\s*ВЪЗДЪРЖАЛ\s*СЕ:\s*(\d+)/);
  if (ru) {
    const votes = [];
    const tbl = t.split(/\n\s*Име\s{2,}Група\s{2,}Гласувал\s*\n/)[1] ?? "";
    for (const l of tbl.split("\n")) {
      if (/Общо:/.test(l)) break;
      const m = l.match(/^\s*([А-ЯЁ][А-ЯЁ\- ]+?)\s{2,}(.+?)(?:\s{2,}(ЗА|ПРОТИВ|ВЪЗДЪРЖАЛ СЕ))?\s*$/);
      if (!m) continue;
      const name = m[1].trim().toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
      votes.push([name, m[3] ? VOTE[m[3].toLowerCase()] : "absent"]);
    }
    return { tally: { for: +ru[1], against: +ru[2], abstain: +ru[3], method: votes.length ? "named" : "open" }, votes: votes.filter((v) => v[1] !== "absent") };
  }
  // Стара Загора: „Гласуване: за – 37, против – няма и въздържали се – 5“ / „за – 45, против и въздържали се – няма“
  const seg = t.match(/Гласуване\s*:\s*(за\s*[–-][\s\S]{0,160}?)(?:Приема се|Не се приема|Решението не|\n\s*\n)/i)?.[1];
  if (seg) {
    const V = "(\\d+|няма|без)";
    const f = seg.match(new RegExp(`за\\s*[–-]\\s*${V}`, "i"));
    const both = seg.match(new RegExp(`против\\s+и\\s+въздържали\\s+се\\s*[–-]\\s*${V}`, "i"));
    const a = both ?? seg.match(new RegExp(`против\\s*[–-]\\s*${V}`, "i"));
    const ab = both ?? seg.match(new RegExp(`въздържал\\S*\\s+се\\s*[–-]\\s*${V}`, "i"));
    if (f) return { tally: { for: nn(f[1]), against: a ? nn(a[1]) : 0, abstain: ab ? nn(ab[1]) : 0, method: /поименно/i.test(t) ? "named" : "open" }, votes: [] };
  }
  const b = parseProtocol(raw)[0];
  return b ? { tally: { for: b.for, against: b.against, abstain: b.abstain, method: b.method }, votes: b.votes } : flexTally(raw);
}

/** Варна: PDF с електронните гласувания — блок за всяко гласуване. Връща решение № → гласуване (последното за номера). */
export function parseEvote(raw) {
  const t = raw.replace(/\r/g, "").replace(/\f/g, "\n");
  const out = new Map();
  for (const b of t.split(/\n\s*Гласуване\s*№\s*\d+/).slice(1)) {
    const n = b.match(/Гласуване на Решение\s*№\s*(\d+)/)?.[1];
    if (!n) continue; // процедурно гласуване
    const c = (k) => +(b.match(new RegExp(`\\n\\s*${k}:\\s*(\\d+)`))?.[1] ?? NaN);
    const f = c("За"), a = c("Против"), ab = c("Въздържали се");
    if ([f, a, ab].some(Number.isNaN)) continue;
    const votes = [];
    for (const v of b.matchAll(/^\s*([А-ЯЁ][А-Яа-яЁё\- ]{4,70}?)\s*:\s*(За|Против|Въздържал(?:а)?\s+се|Не\s+гласувал(?:а)?)\s*$/gm)) {
      const k = VOTE[v[2].toLowerCase().replace(/\s+/g, " ")];
      if (k) votes.push([v[1].trim().replace(/\s+/g, " "), k]);
    }
    out.set(n, { for: f, against: a, abstain: ab, method: votes.length ? "named" : "open", votes });
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u, bin = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60e3) });
      if (r.status === 404) return null;
      if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch { /* опит пак */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}
const pdfText = (buf, layout = true) => { writeFileSync("/tmp/v.pdf", buf); try { return execFileSync("pdftotext", [...(layout ? ["-layout"] : []), "/tmp/v.pdf", "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return ""; } };
/** Текст от PDF, DOC, DOCX или HTML (по първите байтове). */
function docText(buf) {
  const k = buf.slice(0, 5).toString();
  if (k === "%PDF-") return pdfText(buf);
  writeFileSync("/tmp/v.bin", buf);
  try {
    if (k.startsWith("PK")) return execFileSync("sh", ["-c", "unzip -p /tmp/v.bin word/document.xml | sed -e 's/<\\/w:p>/\\n/g' -e 's/<[^>]*>//g'"], { maxBuffer: 1 << 28 }).toString();
    if (buf[0] === 0xd0 && buf[1] === 0xcf) return execFileSync("antiword", ["-w", "0", "/tmp/v.bin"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch { return ""; }
  return buf.toString("utf8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ");
}
const norm = (s) => s.toLowerCase().replace(/ⅰ/g, "i").replace(/[^а-яa-z0-9]/g, "");
const VOTE = { "за": "for", "против": "against", "въздържал се": "abstain", "въздържала се": "abstain", "не гласувал": "absent", "не гласувала": "absent" };

/** Блокове „гласуване → РЕШИ:“ от текста на протокола. */
export function parseProtocol(raw) {
  // махаме колонтитулите („Протокол 42 / 21.09.2026 г.“, номер на страница), които разкъсват текста
  const t = raw.replace(/\r/g, "").replace(/\f/g, "\n").split("\n")
    .filter((l) => !/^\s*\d{1,3}\s*$/.test(l) && !/^\s*Протокол\s+\d+\s*\/\s*[\d.]+\s*г\.?\s*$/.test(l))
    .join("\n").replace(/[ \t]+/g, " ");
  const Q = `[„"“”']?`;
  const re = new RegExp(`в\\s+резултат\\s+на\\s+(явно|поименно)\\s+гласуване,?\\s*с\\s*(\\d+)\\s*гл(?:\\.|аса)?\\s*${Q}\\s*за\\s*${Q},?\\s*(\\d+)\\s*гл(?:\\.|аса)?\\s*${Q}\\s*против\\s*${Q},?\\s*(?:и\\s*)?(\\d+)\\s*гл(?:\\.|аса)?\\s*${Q}\\s*въздържал`, "gi");
  const ms = [...t.matchAll(re)];
  const out = [];
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i], end = m.index + m[0].length, next = ms[i + 1]?.index ?? t.length;
    const rs = t.slice(end, Math.min(next, end + 1500)).search(/Р\s*Е\s*Ш\s*И\s*:/);
    if (rs < 0) continue; // процедурно гласуване (дневен ред, предложение), не решение
    const bodyStart = end + rs + t.slice(end + rs).match(/Р\s*Е\s*Ш\s*И\s*:/)[0].length;
    const body = t.slice(bodyStart, Math.min(next, bodyStart + 600));
    const prevEnd = i ? ms[i - 1].index + ms[i - 1][0].length : 0;
    let votes = [];
    if (m[1].toLowerCase() === "поименно") {
      // поименният списък точно преди гласуването; номерацията започва от 1 при всеки нов списък
      const seg = t.slice(prevEnd, m.index);
      for (const v of seg.matchAll(/^\s*(\d+)\.\s+([А-ЯЁ][А-Яа-яЁё\- ]{4,70}?)\s*:\s*(За|Против|Въздържал(?:а)?\s+се|Не\s+гласувал(?:а)?)\s*$/gm)) {
        if (v[1] === "1") votes = [];
        const k = VOTE[v[3].toLowerCase().replace(/\s+/g, " ")];
        if (k) votes.push([v[2].trim().replace(/\s+/g, " "), k]);
      }
    }
    out.push({ method: m[1].toLowerCase() === "поименно" ? "named" : "open", for: +m[2], against: +m[3], abstain: +m[4], body, votes });
  }
  return out;
}

/** Свързва блоковете с решенията от същото заседание по началото на диспозитива. */
export function attach(blocks, decisions) {
  const used = new Set();
  let n = 0;
  for (const b of blocks) {
    const nb = norm(b.body).slice(0, 220);
    if (nb.length < 25) continue;
    let best = null;
    for (const d of decisions) {
      if (used.has(d) || !d.text) continue;
      const nd = norm(d.text).slice(0, 220);
      const k = Math.min(60, nd.length, nb.length);
      if (k >= 25 && (nb.includes(nd.slice(0, k)) || nd.includes(nb.slice(0, k)))) { best = d; break; }
    }
    if (!best) continue;
    used.add(best);
    best.tally = { for: b.for, against: b.against, abstain: b.abstain, method: b.method };
    if (b.votes.length) best.votes = b.votes;
    n++;
  }
  return n;
}

// Общини, при които гласуването е в PDF-а на всяко решение (а importer-ът чете само HTML страницата).
// Общини, при които решенията са прочетени от протокола на заседанието (url на решението = протоколът),
// а поименният списък стои точно преди „РЕШЕНИЕ № N“.
const PER_PROTOCOL = { KNL29: "Кюстендил" };
const PER_DECISION = { SZR31: "Стара Загора", RSE27: "Русе", PAZ19: "Пазарджик", VRC10: "Враца", VTR28: "Свищов" };

if (process.argv[1]?.endsWith("enrich-council-votes.mjs")) await main();
async function main() {
const ONLY = process.env.ONLY?.trim() ? process.env.ONLY.split(/[\s,]+/).filter(Boolean) : null;
for (const [code, S] of Object.entries(SRC)) {
  if (ONLY && !ONLY.includes(code)) continue;
  const f = `data/council/${code}.json`;
  if (!existsSync(f)) continue;
  const C = JSON.parse(readFileSync(f, "utf8"));
  C.votesFrom ??= {}; // протокол → брой свързани решения (вече прочетени)
  const sessions = [];
  for (let p = 0; p < 20; p++) {
    const iu = S.index(p);
    if (!iu) break;
    const h = await get(iu);
    if (process.env.DEBUG && !p) console.log("DBG index", h?.length, h?.replace(/\s+/g, " ").slice(0, 600));
    if (!h) break;
    const ss = [...h.matchAll(S.session)].map((m) => (S.direct ? { url: new URL(m[1], S.base).href, n: m[2], date: m[2] } : { url: new URL(m[1], S.base).href, n: m[2], date: m[3] }));
    const fresh = ss.filter((s) => !sessions.some((x) => x.url === s.url));
    if (!fresh.length) break;
    sessions.push(...fresh);
  }
  if (process.env.DEBUG) console.log("DBG sessions", sessions.length, JSON.stringify(sessions.slice(0, 2)));
  let added = 0;
  for (const s of sessions) {
    if (timeUp()) break;
    if (s.url in C.votesFrom) continue;
    const dec = S.named ? C.decisions : S.evote ? C.decisions.filter((d) => d.session === s.n || d.date === s.date.split(".").reverse().join("-")) : C.decisions.filter((d) => d.session === s.n || d.number.startsWith(`${s.n}-`));
    if (!dec.length) continue;
    const page = S.direct ? "" : await get(s.url);
    const fu = S.direct ? s.url : page?.match(S.file)?.[1] ?? (S.strictFile ? null : page?.match(/href="([^"]*\.pdf)"/i)?.[1]);
    if (process.env.DEBUG) console.log("DBG", s.n, dec.length, fu, page?.length);
    if (!fu) { C.votesFrom[s.url] = 0; continue; }
    const buf = await get(new URL(fu, S.base).href, true);
    if (!buf) continue;
    let k = 0, blocks = [];
    if (S.evote || S.named) {
      const ev = S.named ? parseNamedBefore(pdfText(buf, !S.noLayout), S.bareNo) : parseEvote(pdfText(buf));
      blocks = [...ev.values()];
      for (const d of dec) { const v = ev.get(String(d.number).match(/^\d+/)?.[0]); if (v) { d.tally = { for: v.for, against: v.against, abstain: v.abstain, method: v.method }; if (v.votes.length) d.votes = v.votes; k++; } }
    } else {
      blocks = parseProtocol(pdfText(buf));
      k = attach(blocks, dec);
    }
    C.votesFrom[s.url] = k;
    added += k;
    console.log(`  ${code} заседание ${s.n} (${s.date}): ${blocks.length} гласувания, свързани ${k} от ${dec.length} решения`);
    await sleep(1500);
  }
  writeFileSync(f, JSON.stringify(C));
  console.log(`${code} ${C.name}: +${added} гласувания; с гласуване ${C.decisions.filter((d) => d.tally).length} от ${C.decisions.length}`);
}

for (const code of Object.keys(PER_DECISION)) {
  if (ONLY && !ONLY.includes(code)) continue;
  const f = `data/council/${code}.json`;
  if (!existsSync(f)) continue;
  const C = JSON.parse(readFileSync(f, "utf8"));
  C.votesFrom ??= {};
  let n = 0, seen = 0;
  const until = Date.now() + Math.max(0, MINUTES * 60e3 - (Date.now() - T0)) / Object.keys(PER_DECISION).length;
  for (const d of C.decisions.sort((a, b) => b.date.localeCompare(a.date))) {
    if (timeUp() || Date.now() > until) break;
    if (d.tally || !d.url || d.url in C.votesFrom) continue;
    if (C.decisions.filter((x) => x.url === d.url).length > 1) { C.votesFrom[d.url] = 0; continue; } // файлът е общ за много решения
    const buf = await get(d.url, true);
    seen++;
    if (!buf) continue;
    const tx = docText(buf);
    const r = tallyAny(tx);
    if (process.env.DEBUG && !r && seen < 4) console.log("DBG", d.url, tx.length, JSON.stringify(tx.slice(Math.max(0, tx.search(/Гласув/i) - 100), tx.search(/Гласув/i) + 250)));
    C.votesFrom[d.url] = r ? 1 : 0;
    if (r) { d.tally = r.tally; if (r.votes.length) d.votes = r.votes; n++; }
    await sleep(800);
  }
  writeFileSync(f, JSON.stringify(C));
  console.log(`${code} ${C.name}: прочетени ${seen} решения, +${n} гласувания; с гласуване ${C.decisions.filter((d) => d.tally).length} от ${C.decisions.length}`);
}

for (const code of Object.keys(PER_PROTOCOL)) {
  if (ONLY && !ONLY.includes(code)) continue;
  const f = `data/council/${code}.json`;
  if (!existsSync(f)) continue;
  const C = JSON.parse(readFileSync(f, "utf8"));
  C.votesFrom ??= {};
  const urls = [...new Set(C.decisions.filter((d) => !d.votes?.length && d.url).map((d) => d.url))].filter((u) => !(u in C.votesFrom));
  let n = 0;
  for (const u of urls) {
    if (timeUp()) break;
    const buf = await get(u, true);
    if (!buf) continue;
    const ev = parseNamedBefore(docText(buf));
    let k = 0;
    for (const d of C.decisions.filter((x) => x.url === u)) { const v = ev.get(String(d.number)); if (v) { d.tally = { for: v.for, against: v.against, abstain: v.abstain, method: "named" }; d.votes = v.votes; k++; } }
    C.votesFrom[u] = k; n += k;
    console.log(`  ${code} ${u.split("/").pop()}: ${ev.size} поименни, свързани ${k}`);
    await sleep(1000);
  }
  writeFileSync(f, JSON.stringify(C));
  console.log(`${code} ${C.name}: +${n} поименни; с гласуване ${C.decisions.filter((d) => d.tally).length} от ${C.decisions.length}`);
}
}
