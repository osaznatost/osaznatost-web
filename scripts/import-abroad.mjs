// Цени в чужбина за сравнение:
//  1) BILLA Австрия: същите артикули като в content/identical-products.json (по номер на артикула, sku), от публичните
//     страници за търсене на онлайн магазина. Пазим и дали цената е промоционална.
//  2) Евростат: индекс на ценовото равнище на храните и безалкохолните напитки (ЕС = 100) и индекс на реалното
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
  writeFileSync(f, JSON.stringify({ date: today, chain: "BILLA Австрия", source: "https://shop.billa.at", items: out, history }));
  console.log("BILLA AT:", Object.keys(out).length, "от", items.length);
} else console.log("BILLA AT: твърде малко намерени артикули, не записваме");

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
