// Хората зад обществените поръчки на общините, които следим: от обявленията на ЦАИС ЕОП по стандарта OCDS.
// За всяка поръчка: лицето за контакт на възложителя (служителят, който води процедурата),
// представителят на всеки изпълнител, начинът на възлагане и броят на офертите.
// Обхожда дните напред (новите) и назад (историята) на порции, за да не изтече времето на задачата.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или ключ");
const TRACK = process.env.TRACK ? process.env.TRACK.split(",") : null; // кодове на общини; без него — всички общини
const FROM = process.env.FROM ?? "2023-11-01";                 // началото на мандата
const MAX_BACK = Number(process.env.MAX_BACK ?? 150);           // дни история на едно пускане
const DIR = "data/projects/people", STATE = "data/projects/state.json";

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

// Общинските възложители (общината, училищата, градините, дружествата) с кода на общината им.
const buyers = new Map();
for (let off = 0; ; off += 1000) {
  const q = TRACK ? `municipality_code=in.(${TRACK.join(",")})` : "level=eq.общински&municipality_code=not.is.null";
  const r = await fetch(`${URL_}/rest/v1/proc_buyers?${q}&select=eik,municipality_code&order=eik&limit=1000&offset=${off}`, { headers: { apikey: KEY } });
  const rows = await r.json();
  for (const b of rows) buyers.set(b.eik, b.municipality_code);
  if (rows.length < 1000) break;
}
console.log(`Общински възложители: ${buyers.size}`);

mkdirSync(DIR, { recursive: true });
const S = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { first: null, last: null };
const files = new Map(); // код → { tenders }
const load = (code) => { if (!files.has(code)) { const f = `${DIR}/${code}.json`; files.set(code, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { tenders: {} }); } return files.get(code); };
const yesterday = addDays(day(new Date()), -1);
const days = [];
if (!S.last) { S.last = yesterday; S.first = addDays(yesterday, 1); }
for (let d = addDays(S.last, 1); d <= yesterday; d = addDays(d, 1)) days.push(d);
let back = 0;
for (let d = addDays(S.first, -1); d >= FROM && back < MAX_BACK; d = addDays(d, -1), back++) days.push(d);

let hits = 0, seen = 0, failed = [];
for (let i = 0; i < days.length; i += 6) {
  const part = days.slice(i, i + 6);
  const got = await Promise.all(part.map(releases));
  got.forEach((rel, k) => {
    if (rel === null) { failed.push(part[k]); return; }
    for (const r of rel) {
      seen++;
      const buyer = r.parties?.find((p) => p.roles?.includes("buyer") && buyers.has(p.identifier?.id));
      if (!buyer) continue;
      const tid = r.tender?.id;
      if (!tid) continue;
      const T = load(buyers.get(buyer.identifier.id)).tenders;
      const t = (T[tid] ??= { title: r.tender.title?.slice(0, 300) ?? null, buyer: buyer.identifier.id, contacts: [], suppliers: {}, method: null, bids: null, amend: [] });
      const cp = buyer.contactPoint?.name;
      if (cp && !t.contacts.includes(cp)) t.contacts.push(cp);
      t.method = r.tender.procurementMethod ?? t.method;
      for (const p of r.parties ?? []) if (p.roles?.includes("supplier") && p.identifier?.id) t.suppliers[p.identifier.id] = { name: p.name, rep: p.contactPoint?.name ?? null, town: p.address?.locality ?? null };
      const b = r.bids?.statistics?.find((s) => s.measure === "bids");
      if (b) t.bids = b.value;
      for (const c of r.contracts ?? []) for (const a of c.amendments ?? []) {
        const txt = (a.rationale ?? a.description ?? "").slice(0, 600);
        if (txt && !t.amend.some((x) => x.text === txt)) t.amend.push({ date: a.date?.slice(0, 10) ?? null, text: txt });
      }
      hits++;
    }
  });
}
const ok = days.filter((d) => !failed.includes(d));
if (ok.length) {
  const fwd = ok.filter((d) => d > S.last).sort();
  const bwd = ok.filter((d) => d < S.first).sort();
  // напредваме само до първия неуспешен ден, за да не останат дупки
  const firstFailFwd = failed.filter((d) => d > S.last).sort()[0];
  if (fwd.length) S.last = firstFailFwd ? addDays(firstFailFwd, -1) : fwd.at(-1);
  const lastFailBwd = failed.filter((d) => d < S.first).sort().at(-1);
  if (bwd.length) S.first = lastFailBwd ? addDays(lastFailBwd, 1) : bwd[0];
}
for (const [code, x] of files) writeFileSync(`${DIR}/${code}.json`, JSON.stringify(x));
writeFileSync(STATE, JSON.stringify({ ...S, updated: new Date().toISOString().slice(0, 10) }));
console.log(`Дни: ${days.length} (неуспешни ${failed.length}); обявления: ${seen}; за следените възложители: ${hits}; общини с данни: ${files.size}; покрити: ${S.first} – ${S.last}`);
