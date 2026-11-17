// Импорт на статистики от Евростат (JSON-stat API) в data/stats.json.
// Пуска се от GitHub Actions: оттам Евростат е достъпен.
// Всеки ред е серия: стойности по години (или месеци) за България и за сравнение.
import { writeFileSync } from "node:fs";

const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

/**
 * Серии за импорт. `filter` са параметрите на заявката към Евростат.
 * `by` е измерението, по което разделяме на линии (обикновено geo).
 */
const SERIES = [
  // Цени
  { id: "inflation", ds: "prc_hicp_aind", filter: { coicop: "CP00", unit: "RCH_A_AVG", geo: ["BG", "EU27_2020", "RO", "GR", "HR"] }, by: "geo" },
  { id: "inflation_food", ds: "prc_hicp_aind", filter: { coicop: "CP01", unit: "RCH_A_AVG", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "inflation_rent", ds: "prc_hicp_aind", filter: { coicop: "CP041", unit: "RCH_A_AVG", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "inflation_energy", ds: "prc_hicp_aind", filter: { coicop: "NRG", unit: "RCH_A_AVG", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "fuel_monthly_2026", ds: "prc_hicp_minr", filter: { coicop18: "CP0722", unit: "RCH_A", geo: ["BG", "EU27_2020", "RO", "GR", "DE", "HR"], sinceTimePeriod: "2025-01" }, by: "geo" },
  { id: "fuel_monthly", ds: "prc_hicp_manr", filter: { coicop: "CP0722", geo: ["BG", "EU27_2020", "RO", "GR", "DE", "HR"], sinceTimePeriod: "2024-01" }, by: "geo" },
  { id: "house_prices", ds: "prc_hpi_a", filter: { purchase: "TOTAL", unit: "RCH_A_AVG", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "house_price_index", ds: "prc_hpi_a", filter: { purchase: "TOTAL", unit: "I15_A_AVG", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Доходи и труд
  { id: "min_wage", ds: "earn_mw_cur", filter: { currency: "EUR", geo: ["BG", "RO", "GR", "HR", "PL"] }, by: "geo" },
  { id: "median_income", ds: "ilc_di03", filter: { age: "TOTAL", sex: "T", statinfo: "MED_EI", unit: "EUR", geo: ["BG", "RO", "GR", "HR", "EU27_2020"] }, by: "geo" },
  { id: "unemployment", ds: "une_rt_a", filter: { age: "Y15-74", sex: "T", unit: "PC_ACT", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "unemployment_regions", ds: "lfst_r_lfu3rt", filter: { age: "Y15-74", sex: "T", isced11: "TOTAL", unit: "PC", geo: ["BG31", "BG32", "BG33", "BG34", "BG41", "BG42"] }, by: "geo" },
  { id: "household_income_regions", ds: "nama_10r_2hhinc", filter: { direct: "BAL", na_item: "B6N", unit: "EUR_HAB", geo: ["BG31", "BG32", "BG33", "BG34", "BG41", "BG42"] }, by: "geo" },
  { id: "gdp_pc_oblasts", ds: "nama_10r_3gdp", filter: { unit: "EUR_HAB" }, by: "geo", geoPrefix: "BG", geoLevel: 5 },
  // Икономика и публични финанси
  { id: "gdp_growth", ds: "nama_10_gdp", filter: { na_item: "B1GQ", unit: "CLV_PCH_PRE", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "deficit", ds: "gov_10dd_edpt1", filter: { na_item: "B9", sector: "S13", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "debt", ds: "gov_10dd_edpt1", filter: { na_item: "GD", sector: "S13", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Хора
  { id: "life_expectancy", ds: "demo_mlexpec", filter: { age: "Y_LT1", unit: "YR", geo: "BG", sex: ["M", "F"] }, by: "sex" },
  { id: "life_expectancy_eu", ds: "demo_mlexpec", filter: { age: "Y_LT1", unit: "YR", sex: "T", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "population", ds: "demo_pjan", filter: { age: "TOTAL", sex: "T", unit: "NR", geo: "BG" }, by: "geo" },
  { id: "poverty_risk", ds: "ilc_peps01n", filter: { age: "TOTAL", sex: "T", unit: "PC", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "health_spending", ds: "hlth_sha11_hf", filter: { icha11_hf: "TOT_HF", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
];

function query(filter) {
  const p = new URLSearchParams({ format: "JSON", lang: "EN" });
  for (const [k, v] of Object.entries(filter)) for (const x of [v].flat()) p.append(k, x);
  return p.toString();
}

/** Разгъва JSON-stat в масив от записи { dim: code, ..., time, value }. */
function flatten(js) {
  const ids = js.id, size = js.size, out = [];
  const codes = ids.map((d) => {
    const idx = js.dimension[d].category.index;
    const arr = [];
    for (const [code, i] of Object.entries(idx)) arr[i] = code;
    return arr;
  });
  for (const [k, value] of Object.entries(js.value)) {
    let n = Number(k);
    const rec = { value };
    for (let i = ids.length - 1; i >= 0; i--) {
      rec[ids[i]] = codes[i][n % size[i]];
      n = Math.floor(n / size[i]);
    }
    out.push(rec);
  }
  return { records: out, labels: js.dimension.geo?.category?.label ?? {}, updated: js.updated };
}

const result = { updated: new Date().toISOString().slice(0, 10), source: "Евростат", series: {} };
for (const s of SERIES) {
  let url = `${API}/${s.ds}?${query(s.filter)}`;
  try {
    let res = await fetch(url);
    let local = null;
    if (res.status === 400) {
      // Резервен вариант: само по държава, филтрираме локално по наличните измерения.
      const geoOnly = { geo: s.filter.geo ?? "BG" };
      if (s.filter.sinceTimePeriod) geoOnly.sinceTimePeriod = s.filter.sinceTimePeriod;
      url = `${API}/${s.ds}?${query(geoOnly)}`;
      res = await fetch(url);
      local = s.filter;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const js = await res.json();
    if (local) console.log(`  ${s.id}: измерения ${js.id.map((d) => `${d}=[${Object.keys(js.dimension[d].category.index).slice(0, 8).join(",")}]`).join(" ")}`);
    let { records, labels, updated } = flatten(js);
    if (local) {
      for (const [k, v] of Object.entries(local)) {
        if (k === "geo" || k === "sinceTimePeriod" || !js.id.includes(k)) continue;
        const allowed = [v].flat();
        records = records.filter((r) => allowed.includes(r[k]));
      }
    }
    const lines = {};
    for (const r of records) {
      const key = r[s.by];
      if (s.geoPrefix && !(key.startsWith(s.geoPrefix) && key.length === s.geoLevel)) continue;
      (lines[key] ??= {})[r.time] = Math.round(r.value * 100) / 100;
    }
    result.series[s.id] = { dataset: s.ds, url, updated, labels: s.geoPrefix ? labels : undefined, lines };
    console.log(`✓ ${s.id}: ${Object.keys(lines).length} линии`);
  } catch (e) {
    console.error(`✗ ${s.id}: ${e.message}`);
  }
}
writeFileSync("data/stats.json", JSON.stringify(result));
