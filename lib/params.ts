// Параметри за калкулаторите. Всеки има стойност, дата и източник.
// Инфлацията, лихвите и дългът идват автоматично от data/macro (scripts/import-macro.mjs: НСИ, БНБ, Евростат).
import CPI from "../data/macro/cpi.json";
import BNB from "../data/macro/bnb-rates.json";
import DEBT from "../data/macro/debt.json";
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
const BNB_SRC = BNB.source;
const bnbEnd = `${BNB.period}-28`;
const BNB_MACRO = {
  title: "БНБ, изисквания към жилищните кредити (11.09.2024)",
  url: "https://www.bnb.bg/bnbweb/groups/public/documents/bnb_pressrelease/pr_20240911_1_bg.doc",
};
const NSI_SRC = CPI.source;
const lastCpi = CPI.monthly[CPI.monthly.length - 1];

export const P = {
  minWage: { value: 620.2, unit: "€/месец", validFrom: "2026-01-01", source: { title: "ПМС № 243 от 13.11.2025 г. (ДВ, бр. 98/2025), съобщение на НАП", url: "https://nra.bg/wps/portal/nra/actualno/vpisvane_v_registura_na_zaetostta_vuv_vruzka_s_opredelenata_mrz_ot_01.01.2026" } },
  maxInsurable: { value: 2300, unit: "€/месец", validFrom: "2026-08-01", source: KIK_OSIG },
  employeeRate: { value: 0.1378, unit: "", validFrom: "2026-08-01", source: KIK_OSIG, note: "пенсии 6,58 + ДЗПО 2,2 + ОЗМ 1,4 + безработица 0,4 + здравно 3,2" },
  employerRate: { value: 0.1892, unit: "", validFrom: "2026-08-01", source: KIK_OSIG, note: "пенсии 8,22 + ДЗПО 2,8 + ОЗМ 2,1 + безработица 0,6 + здравно 4,8 + ТЗПБ 0,4 (най-ниската ставка; до 1,1 според дейността)" },
  minPension: { value: 347.51, unit: "€/месец", validFrom: "2026-07-01", source: KIK_OSIG, note: "минимална пенсия за осигурителен стаж и възраст, чл. 68, ал. 1 КСО" },
  maxPension: { value: 1738.4, unit: "€/месец", validFrom: "2026-07-01", source: KIK_OSIG, note: "таван на една или повече пенсии, без добавките" },
  pensionPerYear: { value: 0.0135, unit: "", validFrom: "2021-01-01", source: { title: "Кодекс за социалното осигуряване, чл. 70", url: "https://www.nssi.bg/legislation/" }, note: "процент за всяка година осигурителен стаж" },
  childBenefit2: { value: 398.81, unit: "€/месец", validFrom: "2026-01-01", source: KIK_OSIG, note: "обезщетение за отглеждане на дете до 2 години" },
  maternityRate: { value: 0.9, unit: "", validFrom: "2015-01-01", source: { title: "КСО, чл. 49 (410 дни, 90% от среднодневния осигурителен доход за 24 месеца)", url: "https://www.nssi.bg/legislation/" } },
  sickNoiRate: { value: 0.8, unit: "", validFrom: "2015-01-01", source: { title: "КСО, чл. 41 (80% от среднодневния доход за 18 месеца, от 4-ия ден)", url: "https://www.nssi.bg/legislation/" } },
  sickEmployerRate: { value: 0.7, unit: "", validFrom: "2015-01-01", source: { title: "КСО, чл. 40, ал. 5 (първите 3 работни дни плаща работодателят, 70%)", url: "https://www.nssi.bg/legislation/" } },
  incomeTax: { value: 0.1, unit: "", validFrom: "2008-01-01", source: { title: "ЗДДФЛ, чл. 48", url: "https://nra.bg" } },
  vatStd: { value: 0.2, unit: "", validFrom: "2007-01-01", source: { title: "ЗДДС", url: "https://nra.bg" } },
  vatReduced: { value: 0.09, unit: "", validFrom: "2007-01-01", source: { title: "ЗДДС (хотели, бебешки храни, книги)", url: "https://nra.bg" } },
  excisePetrol: { value: 0.363, unit: "€/л", validFrom: "2026-01-01", source: { title: "Акцизи върху горивата в Европа 2026, prix-carburant.eu", url: "https://prix-carburant.eu/bg/statiya/sravnenie-na-danatsite-vurhu-gorivata-v-evropa" }, note: "За проверка в ЗАДС" },
  exciseDiesel: { value: 0.33, unit: "€/л", validFrom: "2026-01-01", source: { title: "Акцизи върху горивата в Европа 2026, prix-carburant.eu", url: "https://prix-carburant.eu/bg/statiya/sravnenie-na-danatsite-vurhu-gorivata-v-evropa" }, note: "За проверка в ЗАДС" },
  mortgageRate: { value: BNB.mortgage / 100, unit: "", validFrom: bnbEnd, source: BNB_SRC, note: "среден лихвен процент, нов бизнес, жилищни кредити" },
  consumerRate: { value: BNB.consumer / 100, unit: "", validFrom: bnbEnd, source: BNB_SRC, note: "среден лихвен процент, нов бизнес, кредити за потребление" },
  depositRate: { value: BNB.deposit / 100, unit: "", validFrom: bnbEnd, source: BNB_SRC, note: "депозити на домакинствата с договорен матуритет, нов бизнес" },
  maxDsti: { value: 0.5, unit: "", validFrom: "2024-10-01", source: BNB_MACRO },
  maxLtv: { value: 0.85, unit: "", validFrom: "2024-10-01", source: BNB_MACRO },
  maxTermYears: { value: 30, unit: "години", validFrom: "2024-10-01", source: BNB_MACRO },
  cpiYoY: { value: lastCpi.value / 100, unit: "", validFrom: `${lastCpi.period}-28`, source: NSI_SRC, note: `ИПЦ, ${lastCpi.period} спрямо същия месец на предходната година` },
} satisfies Record<string, Param>;

// Годишна инфлация по групи на ИПЦ (НСИ, последният публикуван месец), в %
export const CPI_GROUPS = [
  { id: "food", label: "Храна и безалкохолни напитки", rate: CPI.groups.rates.food },
  { id: "alc", label: "Алкохол и тютюн", rate: CPI.groups.rates.alc },
  { id: "clothing", label: "Облекло и обувки", rate: CPI.groups.rates.clothing },
  { id: "housing", label: "Жилище, вода, ток, отопление", rate: CPI.groups.rates.housing },
  { id: "furnishing", label: "Обзавеждане и домакинство", rate: CPI.groups.rates.furnishing },
  { id: "health", label: "Здраве и лекарства", rate: CPI.groups.rates.health },
  { id: "transport", label: "Транспорт и горива", rate: CPI.groups.rates.transport },
  { id: "communication", label: "Телефон и интернет", rate: CPI.groups.rates.communication },
  { id: "recreation", label: "Развлечения, спорт и култура", rate: CPI.groups.rates.recreation },
  { id: "education", label: "Образование", rate: CPI.groups.rates.education },
  { id: "restaurants", label: "Ресторанти и хотели", rate: CPI.groups.rates.restaurants },
  { id: "insurance", label: "Застраховки и банкови такси", rate: CPI.groups.rates.insurance },
  { id: "personal", label: "Лични грижи и други", rate: CPI.groups.rates.personal },
] as const;
export const CPI_GROUPS_SOURCE = NSI_SRC;
export const CPI_GROUPS_PERIOD = CPI.groups.period;

// Брутен дълг на сектор „Държавно управление“, % от БВП (Евростат, gov_10dd_edpt1)
export const DEBT_GDP: { year: number; value: number }[] = DEBT.series;
export const DEBT_GDP_SOURCE = {
  title: "Евростат, gov_10dd_edpt1 — брутен дълг на сектор „Държавно управление“, % от БВП",
  url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table",
};

// Годишна инфлация по ИПЦ, НСИ
export const CPI_MONTHLY: { period: string; value: number }[] = CPI.monthly;

const MONTHS_BG = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
/** „2026-10“ → „октомври 2026“ */
export const monthLabel = (period: string) => `${MONTHS_BG[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;
export const BNB_PERIOD = BNB.period;
