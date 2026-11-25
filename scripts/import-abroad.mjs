// Цени в чужбина за сравнение:
//  1) BILLA Австрия: същите артикули като в content/identical-products.json (по номер на артикула, sku), от публичните
//     страници за търсене на онлайн магазина. Пазим и дали цената е промоционална.
//  2) Румъния: Auchan и Carrefour (виж по-долу).
//  3) Евростат: индекс на ценовото равнище на храните и безалкохолните напитки (ЕС = 100) и индекс на реалното
//     потребление на човек (ЕС = 100) по държави, за да се види колко тежи храната спрямо доходите.
// Пише data/prices/abroad.json и data/prices/eu-levels.json. Щадящо: по една заявка на 2 секунди.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { billaAtSearch } from "./lib/billa-at.mjs";

const items = JSON.parse(readFileSync("content/identical-products.json", "utf8")).items;
const f = "data/prices/abroad.json";
const prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { history: {} };
const today = new Date().toISOString().slice(0, 10);
const found = {};
for (const term of [...new Set(items.map((i) => i.at.search))]) {
  const res = await billaAtSearch(term).catch(() => null);
  await new Promise((s) => setTimeout(s, 2000));
  if (!res) { console.log("BILLA AT: няма отговор за", term); continue; }
  for (const p of res) found[p.sku] = p;
}
const out = {};
for (const i of items) {
  const p = found[i.at.sku];
  if (!p) { console.log("Не е намерен в BILLA AT:", i.id, i.at.sku); continue; }
  out[i.id] = { name: p.name, amount: p.amount, unit: p.unit, price: p.price, promo: p.promo, url: `https://shop.billa.at/produkte/${p.slug}` };
}
if (Object.keys(out).length >= items.length / 2) {
  const history = prev.history ?? {};
  history[today] = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.price]));
  writeFileSync(f, JSON.stringify({ date: today, chain: "BILLA Австрия", source: "https://shop.billa.at", items: out, history, ro: prev.ro }));
  console.log("BILLA AT:", Object.keys(out).length, "от", items.length);
} else console.log("BILLA AT: твърде малко намерени артикули, не записваме");

// Румъния: Auchan (публичното API на платформата VTEX, по баркод) и Carrefour (страниците за търсене, по номер на артикула).
// Цените са в леи; превръщаме ги в евро по дневния курс на ЕЦБ. Пише в същия файл, под ключ "ro".
{
  const UA = { "user-agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
  const sl = (ms) => new Promise((r) => setTimeout(r, ms));
  const ecb = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml").then((r) => r.text()).catch(() => "");
  const ron = Number(ecb.match(/currency=['"]RON['"]\s+rate=['"]([\d.]+)/)?.[1]);
  const chains = { Auchan: {}, Carrefour: {} };
  if (ron) {
    for (const i of items) for (const x of i.ro ?? []) {
      if (x.chain !== "Auchan") continue;
      const j = await fetch(`https://www.auchan.ro/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${x.ean}`, { headers: UA }).then((r) => r.json()).catch(() => null);
      await sl(1200);
      const p = Array.isArray(j) ? j.find((p) => p.items?.some((it) => it.ean === x.ean)) : null;
      const it = p?.items.find((it) => it.ean === x.ean), o = it?.sellers?.[0]?.commertialOffer;
      if (!o?.Price || !o.AvailableQuantity) { console.log("Auchan RO: няма наличност/цена", i.id); continue; }
      chains.Auchan[i.id] = { name: p.productName, lei: o.Price, price: +(o.Price / ron).toFixed(2), promo: o.ListPrice > o.Price + 0.005, url: `https://www.auchan.ro${new URL(p.link).pathname}` };
    }
    const found = {};
    for (const term of [...new Set(items.flatMap((i) => (i.ro ?? []).filter((x) => x.chain === "Carrefour").map((x) => x.search)))]) {
      const html = await fetch(`https://carrefour.ro/catalogsearch/result/?q=${encodeURIComponent(term)}`, { headers: UA }).then((r) => r.text()).catch(() => "");
      await sl(2500);
      for (const m of html.matchAll(/"id":"(\d+)","name":"([^"]+)","brand":"[^"]*","price":([\d.]+)/g)) found[m[1]] ??= { name: m[2], lei: +m[3] };
      for (const m of html.matchAll(/href="(https:\/\/carrefour\.ro\/produse\/[^"]+-(\d+))"/g)) if (found[m[2]]) found[m[2]].url ??= m[1];
    }
    for (const i of items) for (const x of i.ro ?? []) {
      if (x.chain !== "Carrefour") continue;
      const p = found[x.id];
      if (!p) { console.log("Carrefour RO: не е намерен", i.id, x.id); continue; }
      chains.Carrefour[i.id] = { name: p.name, lei: p.lei, price: +(p.lei / ron).toFixed(2), promo: false, url: p.url ?? `https://carrefour.ro/catalogsearch/result/?q=${encodeURIComponent(x.search)}` };
    }
  } else console.log("Няма курс на леята от ЕЦБ — пропускам Румъния");
  const n = Object.values(chains).reduce((s, c) => s + Object.keys(c).length, 0);
  console.log("Румъния:", Object.entries(chains).map(([k, v]) => `${k} ${Object.keys(v).length}`).join(", "));
  if (n >= 10) {
    const cur = JSON.parse(readFileSync(f, "utf8"));
    cur.ro = { date: today, ron, source: "auchan.ro, carrefour.ro", chains };
    writeFileSync(f, JSON.stringify(cur));
  }
}

// Евростат (prc_ppp_ind): PLI_EU27_2020 = ценово равнище; VI_PPS_EU27_2020_HAB = обем на човек в стандарт на покупателна способност.
const ES = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind";
async function series(na, cat) {
  const r = await fetch(`${ES}?format=JSON&na_item=${na}&ppp_cat=${cat}&lastTimePeriod=1`).catch(() => null);
  if (!r?.ok) return null;
  const j = await r.json();
  const geo = j.dimension.geo.category, time = Object.keys(j.dimension.time.category.index)[0];
  const vals = {};
  for (const [code, idx] of Object.entries(geo.index)) {
    const v = j.value[String(idx)];
    if (v != null && /^[A-Z]{2}$/.test(code)) vals[code] = v;
  }
  return { time, vals, label: Object.fromEntries(Object.entries(geo.label).filter(([c]) => /^[A-Z]{2}$/.test(c))) };
}
let food = null;
for (const cat of ["A0101", "A010101", "A0100"]) { food = await series("PLI_EU27_2020", cat); if (food && Object.keys(food.vals).length > 20) { food.cat = cat; break; } console.log("Евростат", cat, food ? Object.keys(food.vals).length : "няма"); }
const aic = await series("VI_PPS_EU27_2020_HAB", "A01");
if (food && Object.keys(food.vals).length > 20) {
  writeFileSync("data/prices/eu-levels.json", JSON.stringify({ updated: today, year: food.time, cat: food.cat, source: "Евростат, prc_ppp_ind", food: food.vals, aic: aic?.vals ?? {}, aicYear: aic?.time ?? null, names: food.label }));
  console.log("Евростат:", Object.keys(food.vals).length, "държави, година", food.time, "AIC", aic ? Object.keys(aic.vals).length : 0);
} else console.log("Евростат: няма данни");
