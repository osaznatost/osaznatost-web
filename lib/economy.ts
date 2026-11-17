import { STATS } from "@/lib/stats";

export const SECTORS: { code: string; name: string; short: string; color: string; sub?: boolean }[] = [
  { code: "A", name: "Земеделие, горско и рибно стопанство", short: "Земеделие", color: "#7a9a3a" },
  { code: "B-E", name: "Промишленост и енергетика", short: "Промишленост", color: "#3d5a80" },
  { code: "C", name: "от тях: преработваща промишленост", short: "Преработваща", color: "#6c86a8", sub: true },
  { code: "F", name: "Строителство", short: "Строителство", color: "#b08436" },
  { code: "G-I", name: "Търговия, транспорт, хотели и ресторанти", short: "Търговия и транспорт", color: "#c46a4a" },
  { code: "J", name: "Информационни технологии и комуникации", short: "ИТ и комуникации", color: "#2a7f7a" },
  { code: "K", name: "Финанси и застраховане", short: "Финанси", color: "#8a5a8c" },
  { code: "L", name: "Недвижими имоти", short: "Имоти", color: "#9a7b4f" },
  { code: "M_N", name: "Професионални, научни и административни услуги", short: "Професионални услуги", color: "#4f6b8a" },
  { code: "O-Q", name: "Държавно управление, образование, здравеопазване", short: "Държава, образование, здраве", color: "#56605b" },
  { code: "R-U", name: "Култура, спорт и други услуги", short: "Други услуги", color: "#9aa39e" },
];
export const MAIN_SECTORS = SECTORS.filter((s) => !s.sub);

export const REGIONAL_SECTORS: { code: string; name: string }[] = [
  { code: "A", name: "Земеделие" }, { code: "B-E", name: "Промишленост" }, { code: "F", name: "Строителство" },
  { code: "G-I", name: "Търговия, транспорт, хотели" }, { code: "J", name: "ИТ и комуникации" },
  { code: "K-N", name: "Финанси, имоти, професионални услуги" }, { code: "O-U", name: "Държава, образование, здраве, други" },
];

export const EXPENDITURE: { code: string; name: string; color: string }[] = [
  { code: "P31_S14", name: "Потребление на домакинствата", color: "#c46a4a" },
  { code: "P3_S13", name: "Разходи на държавата за услуги", color: "#56605b" },
  { code: "P51G", name: "Инвестиции (сгради, машини, пътища)", color: "#3d5a80" },
  { code: "P6", name: "Износ", color: "#2a7f7a" },
  { code: "P7", name: "Внос (изважда се)", color: "#b08436" },
];
export const INCOME: { code: string; name: string; color: string }[] = [
  { code: "D1", name: "Заплати и осигуровки на наетите", color: "#2a7f7a" },
  { code: "B2A3G", name: "Печалби на фирмите и доходи на самонаетите", color: "#3d5a80" },
  { code: "D2X3", name: "Данъци върху производството минус субсидии", color: "#56605b" },
];

export const NUTS3_BY_PREFIX: Record<string, string> = {
  BLG: "BG413", BGS: "BG341", VAR: "BG331", VTR: "BG321", VID: "BG311", VRC: "BG313", GAB: "BG322", DOB: "BG332", KRZ: "BG425",
  KNL: "BG415", LOV: "BG315", MON: "BG312", PAZ: "BG423", PER: "BG414", PVN: "BG314", PDV: "BG421", RAZ: "BG324", RSE: "BG323",
  SLS: "BG325", SLV: "BG342", SML: "BG424", SFO: "BG412", S23: "BG411", S24: "BG411", S25: "BG411", SZR: "BG344", TGV: "BG334",
  HKV: "BG422", SHU: "BG333", JAM: "BG343",
};

const line = (id: string, key: string) => STATS.series[id]?.lines[key] ?? {};
export const val = (id: string, key: string, year: number) => line(id, key)[String(year)];
export const years = (id: string, key: string) => Object.keys(line(id, key)).filter((y) => /^\d{4}$/.test(y)).map(Number).sort((a, b) => a - b);
export const lastYear = (id: string, key = "TOTAL") => years(id, key).at(-1)!;

/** Събития, които отбелязваме на графиките. Само факти с дата; ефектът се преценява от данните, не от нас. */
export const EVENTS: { year: number; title: string; what: string; url?: string }[] = [
  { year: 1997, title: "Валутен борд", what: "След хиперинфлацията от 1996–1997 г. левът е вързан към германската марка, а после към еврото. БНБ спира да печата пари срещу дълг. Данните за растежа на Евростат започват от 1996 г., затова сравнение „преди“ няма." },
  { year: 2007, title: "Членство в ЕС", what: "България влиза в ЕС на 1 януари 2007 г. Отварят се пазарите и започват да идват евросредства." },
  { year: 2008, title: "Плосък данък 10%", what: "Данъкът върху доходите става 10% за всички (от 2008 г.), корпоративният е 10% от 2007 г." },
  { year: 2009, title: "Световна финансова криза", what: "Чуждите инвестиции и строителството се сриват, безработицата расте до 2013 г." },
  { year: 2020, title: "Пандемия от COVID-19", what: "Затваряне на икономиката, спад на туризма и услугите, държавни мерки за запазване на заетостта." },
  { year: 2022, title: "Енергийна криза и война в Украйна", what: "Скок на цените на енергията и инфлация над 13% (по ХИПЦ, Евростат)." },
  { year: 2026, title: "Еврото", what: "От 1 януари 2026 г. България е в еврозоната." },
];

export const COUNTRY_BG: Record<string, string> = {
  NL: "Нидерландия", AT: "Австрия", DE: "Германия", CH: "Швейцария", IT: "Италия", EL: "Гърция", BE: "Белгия", HU: "Унгария", CY: "Кипър",
  UK: "Обединеното кралство", LU: "Люксембург", RU: "Русия", TR: "Турция", FR: "Франция", IE: "Ирландия", ES: "Испания", VG: "Британски Вирджински о-ви",
  MT: "Малта", SE: "Швеция", PL: "Полша", US: "САЩ", CZ: "Чехия", RO: "Румъния", DK: "Дания", FI: "Финландия", PT: "Португалия", SK: "Словакия",
  SI: "Словения", HR: "Хърватия", LT: "Литва", LV: "Латвия", EE: "Естония", NO: "Норвегия", LI: "Лихтенщайн", IL: "Израел", CN_X_HK: "Китай",
  JP: "Япония", KR: "Южна Корея", AE: "ОАЕ", CA: "Канада", UA: "Украйна", RS: "Сърбия", MK: "Северна Македония", JE: "Джърси", GI: "Гибралтар",
  SC: "Сейшели", PA: "Панама", BZ: "Белиз", MH: "Маршалови о-ви", IN: "Индия", HK: "Хонконг", SG: "Сингапур", BM: "Бермуда", KY: "Кайманови о-ви",
};
/** Юрисдикции, през които често минават холдингови структури: непосредственият инвеститор там не е крайният собственик. */
export const TRANSIT = new Set(["NL", "LU", "CY", "MT", "IE", "VG", "CH", "JE", "GI", "SC", "PA", "BZ", "MH", "BM", "KY", "LI"]);

export const FDI_SECTORS: { code: string; name: string }[] = [
  { code: "K", name: "Финанси и застраховане" }, { code: "C", name: "Преработваща промишленост" }, { code: "L", name: "Недвижими имоти" },
  { code: "G", name: "Търговия" }, { code: "J", name: "ИТ и комуникации" }, { code: "D35", name: "Енергетика" }, { code: "M", name: "Професионални и научни услуги" },
  { code: "B", name: "Добив" }, { code: "H", name: "Транспорт и складове" }, { code: "F", name: "Строителство" }, { code: "N", name: "Административни услуги" },
  { code: "I", name: "Хотели и ресторанти" }, { code: "E", name: "Води и отпадъци" }, { code: "A", name: "Земеделие" },
];
export const FDI_MANUF: { code: string; name: string }[] = [
  { code: "C_MET", name: "Метали, машини, електроника" }, { code: "C19-C22", name: "Горива, химия, фармация, пластмаси" }, { code: "C_OTH", name: "Друго производство" },
  { code: "C10-C12", name: "Храни, напитки, тютюн" }, { code: "C29_C30", name: "Автомобили и транспортни средства" }, { code: "C_TXW", name: "Текстил и облекло" }, { code: "C16-C18", name: "Дървесина, хартия, печат" },
];
