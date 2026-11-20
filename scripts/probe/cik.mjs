import { billaAtSearch } from "../lib/billa-at.mjs";
for (const s of ["dove seife", "palmolive seife", "pampers feuchttücher", "palmolive shampoo", "lavazza", "milka oreo", "lindt lindor", "kinder", "bertolli"]) {
  const r = await billaAtSearch(s); await new Promise((x) => setTimeout(x, 1500));
  console.log("## AT", s, r ? r.length : "null"); for (const p of (r || []).slice(0, 10)) console.log("   ", p.name, "|", p.amount, p.unit, "|", p.price, p.promo ? "PROMO" : "", "|", p.sku);
}
for (const u of ["https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind?format=JSON&na_item=PLI_EU27_2020&ppp_cat=A010101&time=2025", "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind?format=JSON&na_item=VI_PPS_EU27_2020_HAB&ppp_cat=A01&time=2025"]) {
  const r = await fetch(u); const j = await r.json(); console.log("## ES", r.status, JSON.stringify(j.dimension?.geo?.category?.label).slice(0, 300), JSON.stringify(j.value).slice(0, 400), j.label);
}
