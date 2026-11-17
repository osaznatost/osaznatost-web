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
  // Структура на икономиката
  { id: "gva_sectors", ds: "nama_10_a10", filter: { na_item: "B1G", unit: "CP_MEUR", geo: "BG", nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] }, by: "nace_r2" },
  { id: "gva_sectors_eu", ds: "nama_10_a10", filter: { na_item: "B1G", unit: "CP_MEUR", geo: "EU27_2020", nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] }, by: "nace_r2" },
  { id: "gva_sectors_real", ds: "nama_10_a10", filter: { na_item: "B1G", unit: "CLV_PCH_PRE", geo: "BG", nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] }, by: "nace_r2" },
  { id: "emp_sectors", ds: "nama_10_a10_e", filter: { na_item: "EMP_DC", unit: "THS_PER", geo: "BG", nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] }, by: "nace_r2" },
  { id: "comp_sectors", ds: "nama_10_a10", filter: { na_item: "D1", unit: "CP_MEUR", geo: "BG", nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] }, by: "nace_r2" },
  { id: "gdp_expenditure", ds: "nama_10_gdp", filter: { unit: "CP_MEUR", geo: "BG", na_item: ["B1GQ", "P31_S14", "P31_S15", "P3_S13", "P51G", "P52", "P6", "P7"] }, by: "na_item" },
  { id: "gdp_income", ds: "nama_10_gdp", filter: { unit: "CP_MEUR", geo: "BG", na_item: ["B1GQ", "D1", "B2A3G", "D2X3"] }, by: "na_item" },
  { id: "gva_oblasts", ds: "nama_10r_3gva", filter: { currency: "MIO_EUR", geo: ["BG311","BG312","BG313","BG314","BG315","BG321","BG322","BG323","BG324","BG325","BG331","BG332","BG333","BG334","BG341","BG342","BG343","BG344","BG411","BG412","BG413","BG414","BG415","BG421","BG422","BG423","BG424","BG425"], nace_r2: ["TOTAL", "A", "B-E", "C", "F", "G-J", "K-N", "O-U"] }, by: "geo", by2: "nace_r2", geoPrefix: "BG", geoLevel: 5 },
  // Хора
  { id: "life_expectancy", ds: "demo_mlexpec", filter: { age: "Y_LT1", unit: "YR", geo: "BG", sex: ["M", "F"] }, by: "sex" },
  { id: "life_expectancy_eu", ds: "demo_mlexpec", filter: { age: "Y_LT1", unit: "YR", sex: "T", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "population", ds: "demo_pjan", filter: { age: "TOTAL", sex: "T", unit: "NR", geo: "BG" }, by: "geo" },
  { id: "poverty_risk", ds: "ilc_peps01n", filter: { age: "TOTAL", sex: "T", unit: "PC", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "health_spending", ds: "hlth_sha11_hf", filter: { icha11_hf: "TOT_HF", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Икономика: допълнително
  { id: "gdp_pc_pps", ds: "tec00114", filter: { na_item: "VI_PPS_EU27_2020_HAB", geo: ["BG", "RO", "HR", "GR", "PL", "HU"] }, by: "geo" },
  { id: "gov_revenue", ds: "gov_10a_main", filter: { na_item: "TR", sector: "S13", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "gov_expenditure", ds: "gov_10a_main", filter: { na_item: "TE", sector: "S13", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "gov_interest", ds: "gov_10a_main", filter: { na_item: "D41PAY", sector: "S13", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "investment", ds: "nama_10_gdp", filter: { na_item: "P51G", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "exports", ds: "nama_10_gdp", filter: { na_item: "P6", unit: "PC_GDP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "consumption_growth", ds: "nama_10_gdp", filter: { na_item: "P31_S14", unit: "CLV_PCH_PRE", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "inflation_monthly", ds: "prc_hicp_manr", filter: { coicop: "CP00", geo: ["BG", "EU27_2020"], sinceTimePeriod: "2022-01" }, by: "geo" },
  { id: "inflation_monthly_2026", ds: "prc_hicp_minr", filter: { coicop18: "TOTAL", unit: "RCH_A", geo: ["BG", "EU27_2020"], sinceTimePeriod: "2025-01" }, by: "geo" },
  // Труд
  { id: "employment_rate", ds: "lfsi_emp_a", filter: { indic_em: "EMP_LFS", age: "Y20-64", sex: "T", unit: "PC_POP", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "youth_unemployment", ds: "une_rt_a", filter: { age: "Y15-24", sex: "T", unit: "PC_ACT", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Неравенство и социални
  { id: "gini", ds: "ilc_di12", filter: { age: "TOTAL", geo: ["BG", "EU27_2020", "RO"] }, by: "geo" },
  { id: "s80s20", ds: "ilc_di11", filter: { age: "TOTAL", sex: "T", geo: ["BG", "EU27_2020", "RO"] }, by: "geo" },
  { id: "overcrowding", ds: "ilc_lvho05a", filter: { age: "TOTAL", sex: "T", rskpovth: "TOTAL", unit: "PC", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Демография
  { id: "fertility", ds: "tps00199", filter: { geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "infant_mortality", ds: "tps00027", filter: { geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "birth_rate", ds: "demo_gind", filter: { indic_de: "GBIRTHRT", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "death_rate", ds: "demo_gind", filter: { indic_de: "GDEATHRT", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "net_migration", ds: "demo_gind", filter: { indic_de: "CNMIGRATRT", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Образование
  { id: "early_leavers", ds: "edat_lfse_14", filter: { sex: "T", wstatus: "POP", unit: "PC", age: "Y18-24", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "tertiary", ds: "edat_lfse_03", filter: { sex: "T", isced11: "ED5-8", unit: "PC", age: "Y25-34", geo: ["BG", "EU27_2020"] }, by: "geo" },
  // Здраве, безопасност, общество, околна среда
  { id: "doctors", ds: "tps00044", filter: { geo: ["BG", "EU27_2020", "RO", "GR"] }, by: "geo" },
  { id: "road_deaths", ds: "sdg_11_40", filter: { unit: "RT", tra_infr: "TOTAL", geo: ["BG", "EU27_2020", "RO"] }, by: "geo" },
  { id: "internet_use", ds: "isoc_ci_ifp_iu", filter: { indic_is: "I_ILT12", ind_type: "IND_TOTAL", unit: "PC_IND", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "renewables", ds: "nrg_ind_ren", filter: { nrg_bal: "REN", unit: "PC", geo: ["BG", "EU27_2020"] }, by: "geo" },
  { id: "emissions", ds: "sdg_13_10", filter: { unit: "I90", src_crf: "TOTXMEMO", geo: ["BG", "EU27_2020"] }, by: "geo" },
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
    let dup = 0;
    for (const r of records) {
      const key = s.by2 ? `${r[s.by]}|${r[s.by2]}` : r[s.by];
      const g = r.geo ?? key;
      if (s.geoPrefix && !(g.startsWith(s.geoPrefix) && g.length === s.geoLevel)) continue;
      if ((lines[key] ??= {})[r.time] !== undefined) dup++;
      lines[key][r.time] = Math.round(r.value * 100) / 100;
    }
    // Ако след филтрите остават няколко стойности за една година, серията е двусмислена: не я записваме.
    if (dup) {
      const multi = js.id.filter((d) => d !== "geo" && d !== "time" && d !== s.by && d !== s.by2 && Object.keys(js.dimension[d].category.index).length > 1);
      throw new Error(`двусмислена серия (${dup} повторения), уточни измеренията: ${multi.map((d) => `${d}=[${Object.keys(js.dimension[d].category.index).slice(0, 6).join(",")}]`).join(" ")}`);
    }
    if (!Object.keys(lines).length) {
      console.log(`  ${s.id}: празна серия; измерения ${js.id.map((d) => `${d}=[${Object.keys(js.dimension[d].category.index).slice(0, 10).join(",")}]`).join(" ")}`);
    }
    result.series[s.id] = { dataset: s.ds, url, updated, labels: s.geoPrefix ? labels : undefined, lines };
    console.log(`✓ ${s.id}: ${Object.keys(lines).length} линии`);
  } catch (e) {
    console.error(`✗ ${s.id}: ${e.message}`);
  }
}
writeFileSync("data/stats.json", JSON.stringify(result));
