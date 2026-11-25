// dm drogerie markt: един и същ продукт (еднакъв dm номер и баркод) в България, Германия, Австрия, Румъния и Хърватия.
// Списъкът с продукти е от картата на сайта на dm България; цените — от публичния каталог на dm (по 30 продукта на заявка).
// Румънските цени (в леи) се превръщат в евро по курса на ЕЦБ за деня. Пише data/dm/prices.json.
import { mkdirSync, writeFileSync } from "node:fs";

const UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)";
const API = "https://shopping.services.dmtech.com/product/tiles";
const COUNTRIES = ["BG", "DE", "AT", "RO", "HR"];
const PACE = Number(process.env.PACE ?? 800);
const LIMIT = Number(process.env.LIMIT ?? 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, json = true) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: json ? "application/json" : "*/*" }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return json ? r.json() : r.text();
      if (r.status === 404) return null;
      await sleep(5000 * (a + 1));
    } catch { await sleep(5000 * (a + 1)); }
  }
  return null;
}

// Курс леи → евро (ЕЦБ).
const ecb = await get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", false);
const ron = Number(ecb?.match(/currency=['"]RON['"]\s+rate=['"]([\d.]+)/)?.[1]);
if (!ron) { console.log("Няма курс на леята от ЕЦБ — спирам."); process.exit(1); }

const sm = await get("https://www.dm-drogeriemarkt.bg/product-sitemap.xml", false);
let dans = [...new Set([...(sm ?? "").matchAll(/\/p\/d\/(\d+)\//g)].map((m) => m[1]))];
if (LIMIT) dans = dans.slice(0, LIMIT);
console.log(`Продукти в dm България: ${dans.length}; курс RON/EUR ${ron}`);

const PRICE = /(Цена|Preis|Preț|Cijena):\s*([\d.\s]+,\d{2}|[\d.]+)\s*(€|lei)/;
const num = (s) => Number(s.replace(/[\s.]/g, "").replace(",", "."));
const items = new Map();
for (let i = 0; i < dans.length; i += 30) {
  const batch = dans.slice(i, i + 30).join(",");
  for (const c of COUNTRIES) {
    const d = await get(`${API}/${c}/dans/${batch}`);
    await sleep(PACE);
    for (const p of Object.values(d?.products ?? {})) {
      const lab = p.a11yLabel ?? "";
      const m = lab.match(PRICE);
      if (!m) continue;
      let eur = num(m[2]);
      if (m[3] === "lei") eur = eur / ron;
      if (!(eur > 0)) continue;
      const it = items.get(String(p.dan)) ?? { dan: p.dan, gtin: String(p.gtin ?? ""), brand: p.brand?.name ?? "" };
      if (c === "BG") it.name = lab.split(";")[0].trim();
      it[c.toLowerCase()] = Math.round(eur * 100) / 100;
      items.set(String(p.dan), it);
    }
  }
  if ((i / 30) % 50 === 0) console.log(`… ${Math.min(i + 30, dans.length)} / ${dans.length}`);
}

const list = [...items.values()].filter((x) => x.bg && x.name);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const summary = {};
for (const c of ["de", "at", "ro", "hr"]) {
  const both = list.filter((x) => x[c]);
  const r = both.map((x) => x.bg / x[c]);
  summary[c] = {
    n: both.length,
    median: med(r) ? Math.round((med(r) - 1) * 1000) / 10 : null, // % колко е по-скъпо в България (медиана)
    dearer: both.length ? Math.round((r.filter((v) => v > 1.005).length / both.length) * 100) : null,
    cheaper: both.length ? Math.round((r.filter((v) => v < 0.995).length / both.length) * 100) : null,
    basketBg: Math.round(both.reduce((s, x) => s + x.bg, 0) * 100) / 100,
    basketOther: Math.round(both.reduce((s, x) => s + x[c], 0) * 100) / 100,
  };
}
mkdirSync("data/dm", { recursive: true });
writeFileSync("data/dm/prices.json", JSON.stringify({ date: new Date().toISOString().slice(0, 10), ron, summary, items: list }));
console.log(`Продукти с цена в България: ${list.length}`, JSON.stringify(summary));
