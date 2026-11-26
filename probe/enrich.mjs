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
    session: /href="(\/node\/\d+)"[^>]*>\s*ВИДЕОАРХИВ И ПРОТОКОЛ (?:НА|ОТ) ЗАСЕДАНИЕ\s*№\s*(\d+)\s*ОТ ДАТА\s*([\d.]+)/gi,
    file: /href="([^"]*protokol[^"]*\.pdf)"/i,
    base: "https://www.burgascouncil.org",
  },
};

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
const pdfText = (buf) => { writeFileSync("/tmp/v.pdf", buf); try { return execFileSync("pdftotext", ["-layout", "/tmp/v.pdf", "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return ""; } };
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

const ONLY = process.env.ONLY?.split(/[\s,]+/).filter(Boolean);
for (const [code, S] of Object.entries(SRC)) {
  if (ONLY && !ONLY.includes(code)) continue;
  const f = `data/council/${code}.json`;
  if (!existsSync(f)) continue;
  const C = JSON.parse(readFileSync(f, "utf8"));
  C.votesFrom ??= {}; // протокол → брой свързани решения (вече прочетени)
  const sessions = [];
  for (let p = 0; p < 20; p++) {
    const h = await get(S.index(p));
    if (!h) break;
    const ss = [...h.matchAll(S.session)].map((m) => ({ url: S.base + m[1], n: m[2], date: m[3] }));
    const fresh = ss.filter((s) => !sessions.some((x) => x.url === s.url));
    if (!fresh.length) break;
    sessions.push(...fresh);
  }
  let added = 0;
  for (const s of sessions) {
    if (timeUp()) break;
    if (s.url in C.votesFrom) continue;
    const dec = C.decisions.filter((d) => d.session === s.n || d.number.startsWith(`${s.n}-`));
    if (!dec.length) continue;
    const page = await get(s.url);
    const fu = page?.match(S.file)?.[1];
    if (!fu) { C.votesFrom[s.url] = 0; continue; }
    const buf = await get(new URL(fu, S.base).href, true);
    if (!buf) continue;
    const blocks = parseProtocol(pdfText(buf));
    const k = attach(blocks, dec);
    C.votesFrom[s.url] = k;
    added += k;
    console.log(`  ${code} заседание ${s.n} (${s.date}): ${blocks.length} гласувания, свързани ${k} от ${dec.length} решения`);
    await sleep(1500);
  }
  writeFileSync(f, JSON.stringify(C));
  console.log(`${code} ${C.name}: +${added} гласувания; с гласуване ${C.decisions.filter((d) => d.tally).length} от ${C.decisions.length}`);
}
