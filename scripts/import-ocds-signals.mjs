// Сигнали от обявленията в ЦАИС ЕОП (OCDS), които ги няма в договорите:
//  • колко дни възложителят е дал за подаване на оферти (от обявяването до крайния срок);
//  • колко пъти е променял условията на процедурата (tenderAmendment, напр. по чл. 100 ЗОП);
//  • дали процедурата е по европейските директиви (над европейските прагове).
// Записва data/tender-signals/{NN}.json: { tender_id: [дни, [дати на промени], ЕС(0/1), метод] }.
// Обхожда дните напред (новите) и назад (историята) на порции, със състояние в data/tender-signals/state.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FROM = process.env.FROM ?? "2020-01-01";
const MAX_BACK = Number(process.env.MAX_BACK ?? 400);
const DIR = "data/tender-signals", STATE = `${DIR}/state.json`;
const day = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => day(new Date(Date.parse(s) + n * 864e5));
const key = (d) => { const [y, m, dd] = d.split("-"); return `Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП на ${dd}.${m}.${y} г., съгласно стандарт OCDS.json`; };
async function releases(d) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://storage.eop.bg/open-data-${d}/${encodeURIComponent(key(d))}`);
      if (r.status === 404) return [];
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return JSON.parse((await r.text()).replace(/^﻿/, "")).releases ?? [];
    } catch (e) { if (i === 3) { console.log(`${d}: ${e.message}`); return null; } await new Promise((s) => setTimeout(s, 1500 * (i + 1))); }
  }
}
mkdirSync(DIR, { recursive: true });
const S = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { first: null, last: null };
const shards = new Map();
const shard = (tid) => { const k = String(Number(tid) % 100).padStart(2, "0"); if (!shards.has(k)) { const f = `${DIR}/${k}.json`; shards.set(k, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}); } return shards.get(k); };

const yesterday = addDays(day(new Date()), -1);
const days = [];
if (!S.last) { S.last = addDays(yesterday, -1); S.first = yesterday; }
for (let d = addDays(S.last, 1); d <= yesterday; d = addDays(d, 1)) days.push(d);
let back = 0;
for (let d = addDays(S.first, -1); d >= FROM && back < MAX_BACK; d = addDays(d, -1), back++) days.push(d);

let n = 0; const failed = [];
for (let i = 0; i < days.length; i += 6) {
  const part = days.slice(i, i + 6);
  const got = await Promise.all(part.map(releases));
  got.forEach((rel, k) => {
    if (rel === null) { failed.push(part[k]); return; }
    for (const r of rel) {
      const t = r.tender, tid = t?.id;
      if (!tid || !/^\d+$/.test(tid)) continue;
      const tags = r.tag ?? [];
      const S2 = shard(tid);
      const cur = S2[tid] ?? [null, [], 0, null];
      if (tags.includes("tender")) {
        // Най-краткият срок сред обособените позиции, от обявяването (датата на обявлението).
        const pub = Date.parse(r.date);
        const ends = (t.lots ?? []).map((l) => Date.parse(l.tenderPeriod?.endDate)).filter((x) => !Number.isNaN(x));
        if (ends.length && !Number.isNaN(pub)) cur[0] = Math.max(0, Math.round((Math.min(...ends) - pub) / 864e5));
        cur[2] = t.legalBasis?.scheme === "CELEX" ? 1 : 0;
        cur[3] = t.procurementMethod ?? null;
      }
      if (tags.includes("tenderAmendment")) {
        // Промените се повтарят в следващите обявления; пазим датите им, за да не ги броим два пъти.
        for (const a of t.amendments?.length ? t.amendments : [{ date: r.date }]) { const dk = String(a.date ?? r.date).slice(0, 10); if (!cur[1].includes(dk)) cur[1].push(dk); }
      }
      S2[tid] = cur; n++;
    }
  });
}
const ok = days.filter((d) => !failed.includes(d));
const fwd = ok.filter((d) => d > S.last).sort(), bwd = ok.filter((d) => d < S.first).sort();
// Напред: продължаваме само ако няма пропуснат ден по средата.
for (const d of fwd) { if (d === addDays(S.last, 1)) S.last = d; }
for (const d of bwd.reverse()) { if (d === addDays(S.first, -1)) S.first = d; }
for (const [k, v] of shards) writeFileSync(`${DIR}/${k}.json`, JSON.stringify(v));
writeFileSync(STATE, JSON.stringify(S));
console.log(`Дни: ${ok.length} (неуспешни ${failed.length}); обявления: ${n}; обхват ${S.first} – ${S.last}`);
