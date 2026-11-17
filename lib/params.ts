// Параметри за калкулаторите. Всеки има стойност, дата и източник.
// По-късно се местят в таблица `params` в Supabase, за да се обновяват без деплой.

export type Param = {
  value: number;
  unit: string;
  validFrom: string; // ISO дата
  source: { title: string; url: string };
  note?: string;
};

const KIK_OSIG = {
  title: "Осигуровки, МОД, ТЗПБ от 01.08.2026 (ДВ бр. 68/2026), kik-info.com",
  url: "https://kik-info.com/novini/novini-i-akcenti/Ot-01082026-Osigurovki-MOD-TZPB-bolnichni.208156.php",
};
const BNB_JUNE = {
  title: "БНБ, лихвена статистика, юни 2026",
  url: "https://bnb.bg/bnbweb/groups/public/documents/bnb_download/202606_s_irs_press_a1_bg.pdf",
};
const BNB_MACRO = {
  title: "БНБ, изисквания към жилищните кредити (11.09.2024)",
  url: "https://www.bnb.bg/bnbweb/groups/public/documents/bnb_pressrelease/pr_20240911_1_bg.doc",
};
const NSI_JULY = {
  title: "НСИ, Инфлация и индекси на потребителските цени, юли 2026",
  url: "https://www.nsi.bg/file/37341/inflaciya_i_indeksi_na_potrebitelskite_ceni.pdf",
};

export const P = {
  minWage: { value: 620.2, unit: "€/месец", validFrom: "2026-01-01", source: { title: "Минимална работна заплата 2026", url: "https://www.innovires.com/blog/minimalna-rabotna-zaplata-2026.html" } },
  maxInsurable: { value: 2300, unit: "€/месец", validFrom: "2026-08-01", source: KIK_OSIG },
  employeeRate: { value: 0.1378, unit: "", validFrom: "2026-08-01", source: KIK_OSIG, note: "пенсии 6,58 + ДЗПО 2,2 + ОЗМ 1,4 + безработица 0,4 + здравно 3,2" },
  employerRate: { value: 0.1892, unit: "", validFrom: "2026-08-01", source: KIK_OSIG, note: "пенсии 8,22 + ДЗПО 2,8 + ОЗМ 2,1 + безработица 0,6 + здравно 4,8 + ТЗПБ 0,4 (най-ниската ставка; до 1,1 според дейността)" },
  incomeTax: { value: 0.1, unit: "", validFrom: "2008-01-01", source: { title: "ЗДДФЛ, чл. 48", url: "https://nra.bg" } },
  vatStd: { value: 0.2, unit: "", validFrom: "2007-01-01", source: { title: "ЗДДС", url: "https://nra.bg" } },
  vatReduced: { value: 0.09, unit: "", validFrom: "2007-01-01", source: { title: "ЗДДС (хотели, бебешки храни, книги)", url: "https://nra.bg" } },
  excisePetrol: { value: 0.363, unit: "€/л", validFrom: "2026-01-01", source: { title: "Акцизи върху горивата в Европа 2026, prix-carburant.eu", url: "https://prix-carburant.eu/bg/statiya/sravnenie-na-danatsite-vurhu-gorivata-v-evropa" }, note: "За проверка в ЗАДС" },
  exciseDiesel: { value: 0.33, unit: "€/л", validFrom: "2026-01-01", source: { title: "Акцизи върху горивата в Европа 2026, prix-carburant.eu", url: "https://prix-carburant.eu/bg/statiya/sravnenie-na-danatsite-vurhu-gorivata-v-evropa" }, note: "За проверка в ЗАДС" },
  mortgageRate: { value: 0.0241, unit: "", validFrom: "2026-06-30", source: BNB_JUNE, note: "среден лихвен процент, нов бизнес, жилищни кредити" },
  consumerRate: { value: 0.0876, unit: "", validFrom: "2026-06-30", source: BNB_JUNE, note: "среден лихвен процент, нов бизнес, кредити за потребление" },
  depositRate: { value: 0.0157, unit: "", validFrom: "2026-06-30", source: BNB_JUNE, note: "срочни депозити, нов бизнес" },
  maxDsti: { value: 0.5, unit: "", validFrom: "2024-10-01", source: BNB_MACRO },
  maxLtv: { value: 0.85, unit: "", validFrom: "2024-10-01", source: BNB_MACRO },
  maxTermYears: { value: 30, unit: "години", validFrom: "2024-10-01", source: BNB_MACRO },
  cpiYoY: { value: 0.045, unit: "", validFrom: "2026-07-31", source: NSI_JULY, note: "ИПЦ, юли 2026 спрямо юли 2025" },
} satisfies Record<string, Param>;

// Годишна инфлация по групи на ИПЦ (НСИ, юли 2026 спрямо юли 2025), в %
export const CPI_GROUPS = [
  { id: "food", label: "Храна и безалкохолни напитки", rate: 1.2 },
  { id: "alc", label: "Алкохол и тютюн", rate: 5.7 },
  { id: "clothing", label: "Облекло и обувки", rate: -0.4 },
  { id: "housing", label: "Жилище, вода, ток, отопление", rate: 5.1 },
  { id: "furnishing", label: "Обзавеждане и домакинство", rate: 0.3 },
  { id: "health", label: "Здраве и лекарства", rate: 4.0 },
  { id: "transport", label: "Транспорт и горива", rate: 14.5 },
  { id: "communication", label: "Телефон и интернет", rate: 1.8 },
  { id: "recreation", label: "Развлечения, спорт и култура", rate: 7.5 },
  { id: "education", label: "Образование", rate: 9.2 },
  { id: "restaurants", label: "Ресторанти и хотели", rate: 9.3 },
  { id: "insurance", label: "Застраховки и банкови такси", rate: 1.1 },
  { id: "personal", label: "Лични грижи и други", rate: 5.3 },
] as const;
export const CPI_GROUPS_SOURCE = NSI_JULY;

// Брутен дълг на сектор „Държавно управление“, % от БВП (Евростат, gov_10dd_edpt1)
export const DEBT_GDP: { year: number; value: number }[] = [
  [1995, 76.8], [1996, 244.5], [1997, 96.7], [1998, 66.7], [1999, 75.8], [2000, 70.7], [2001, 64.5],
  [2002, 51.0], [2003, 43.4], [2004, 35.7], [2005, 26.6], [2006, 20.9], [2007, 16.3], [2008, 13.0],
  [2009, 13.7], [2010, 15.3], [2011, 15.2], [2012, 16.6], [2013, 17.0], [2014, 27.0], [2015, 25.9],
  [2016, 29.1], [2017, 25.1], [2018, 22.2], [2019, 20.1], [2020, 24.5], [2021, 23.8], [2022, 22.5],
  [2023, 22.9], [2024, 23.8], [2025, 29.9],
].map(([year, value]) => ({ year, value }));
export const DEBT_GDP_SOURCE = {
  title: "Евростат, gov_10dd_edpt1 — брутен дълг на сектор „Държавно управление“, % от БВП",
  url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table",
};

// Годишна инфлация по ИПЦ, НСИ
export const CPI_MONTHLY: { period: string; value: number }[] = [
  ["2025-09", 5.6], ["2025-10", 5.3], ["2025-11", 5.2], ["2025-12", 5.0], ["2026-01", 3.5],
  ["2026-02", 3.3], ["2026-03", 4.1], ["2026-04", 6.8], ["2026-05", 6.9], ["2026-06", 5.4], ["2026-07", 4.5],
].map(([period, value]) => ({ period: period as string, value: value as number }));
