// Стенограмите от пленарната зала на 52-рото Народно събрание (parliament.bg): изказвания с конкретни числа
// за икономиката и социалната сфера (инфлация, безработица, дълг, дефицит, растеж, минимална заплата, бедност).
// Пази само тези изречения (не целите стенограми) в data/steno-claims.json, за автоматична сверка с официалните данни.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/plenaryst", Accept: "application/json" };
const FILE = "data/steno-claims.json";
const START = Number(process.env.START ?? 11100);
const S = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { last: START - 1, seen: [], claims: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(u) {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return t.startsWith("<") || !t ? null : JSON.parse(t); }
    catch { await sleep(1500 * (a + 1)); }
  }
  return null;
}
const strip = (h) => String(h ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");

// Показатели: ключова дума, мерна единица (% или €) и пояснение. Числото трябва да е до ключовата дума.
const IND = [
  ["inflation", /инфлаци/i, "%"],
  ["unemployment", /безработица/i, "%"],
  ["debt", /(държавн(ия|ият)|публичн(ия|ият)) дълг/i, "%"],
  ["deficit", /дефицит/i, "%"],
  ["gdp_growth", /(икономически растеж|растеж(ът|а)? на (икономиката|БВП)|ръст(ът|а)? на БВП)/i, "%"],
  ["min_wage", /минималн(ата|а) (работна )?заплата/i, "€"],
];
const NUM = /(\d{1,3}(?:[  ]\d{3})*(?:[.,]\d+)?)\s*(%|на сто|процента|евро|€)/g;
const SKIP = /(еврозона|в ЕС|Европейския съюз средно|Румъния|Гърция|Германия|Хърватия|Унгария|Полша|прогноз|очаква|ще бъде|ще достигне|цел(та)? е|до 20\d\d|през 20[3-9]\d|бюджет(ът)? за 20\d\d предвижда|ако |би )/i;

function speeches(text) {
  const out = [];
  const re = /(?:^|\n)\s*([А-Я][А-Я\-]+(?: [А-Я][А-Я\-]+){1,3})(?: \(([^)\n]{2,40})\))?: ([\s\S]*?)(?=\n\s*[А-Я][А-Я\-]+(?: [А-Я][А-Я\-]+){1,3}(?: \([^)\n]{2,40}\))?: |$)/g;
  for (const m of text.matchAll(re)) if (!/^(ПРЕДСЕДАТЕЛ|ДОКЛАДЧИК)/.test(m[1])) out.push({ who: m[1].split(" ").filter((w) => !/^(МИНИСТЪР|ЗАМЕСТНИК-МИНИСТЪР)$/.test(w)).map((w) => w[0] + w.slice(1).toLowerCase()).join(" "), group: m[2] ?? null, text: m[3] });
  return out;
}

let miss = 0, n = 0;
for (let id = S.last + 1; miss < 25; id++) {
  const j = await api(`pl-sten/${id}`);
  if (!j?.Pl_Sten_body) { miss++; continue; }
  miss = 0; S.last = id;
  const date = String(j.Pl_Sten_date ?? Object.entries(j).find(([k, v]) => /date/i.test(k) && /^\d{4}-\d\d-\d\d/.test(String(v)))?.[1] ?? "").slice(0, 10);
  const url = `https://www.parliament.bg/bg/plenaryst/ns/52/ID/${id}`;
  for (const sp of speeches(strip(j.Pl_Sten_body))) {
    for (const sent of sp.text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[А-Я„])/)) {
      if (sent.length < 30 || sent.length > 400 || SKIP.test(sent)) continue;
      for (const [ind, kw, unit] of IND) {
        if (!kw.test(sent)) continue;
        const k = sent.search(kw);
        const nums = [...sent.matchAll(NUM)].filter((m) => (unit === "%" ? m[2] !== "евро" && m[2] !== "€" : m[2] === "евро" || m[2] === "€"));
        // числото трябва да е най-много на 60 знака след ключовата дума
        const near = nums.find((m) => m.index > k && m.index - k < 60);
        if (!near) continue;
        const value = Number(near[1].replace(/[  ]/g, "").replace(",", "."));
        if (!Number.isFinite(value)) continue;
        S.claims.push({ id: `${id}-${S.claims.length}`, ind, value, unit, date, who: sp.who, group: sp.group, text: sent, url });
        n++;
        break;
      }
    }
  }
}
// без повторения (едно и също изречение, казано от същия човек)
const seen = new Set();
S.claims = S.claims.filter((c) => { const k = c.who + c.text; return !seen.has(k) && seen.add(k); });
delete S.seen;
writeFileSync(FILE, JSON.stringify(S));
console.log(`Стенограми до № ${S.last}; нови твърдения с числа: ${n}; общо ${S.claims.length}`);
