import elections from "@/data/elections-2026.json";
import exit from "@/content/exitpoll-2026.json";

/** Данни за всяка парламентарна група: цвят за разпознаване, връзка с изборната листа и субсидията. */
export type PartyMeta = {
  group: string; slug: string; name: string; short: string; color: string; initials: string;
  /** Номер в бюлетината на 19 април 2026 г. */
  ballot: number; list: string; exitKey: string;
  /** Групата е част от листа, в която са и други партии. */
  sharedList?: string;
  about: string;
};

export const PARTY_META: PartyMeta[] = [
  { group: "ПБ", slug: "progresivna-balgariya", name: "Прогресивна България", short: "ПБ", color: "#2f6f8f", initials: "ПБ", ballot: 21, list: "Прогресивна България", exitKey: "ПБ",
    about: "Коалиция около Румен Радев, създадена за изборите на 19 април 2026 г. Спечели мнозинство и от 8 май 2026 г. управлява сама." },
  { group: "ГЕРБ - СДС", slug: "gerb-sds", name: "ГЕРБ – СДС", short: "ГЕРБ–СДС", color: "#2b5fa8", initials: "Г", ballot: 15, list: "ГЕРБ-СДС", exitKey: "ГЕРБ-СДС",
    about: "Коалиция на ГЕРБ (лидер Бойко Борисов) и СДС. Водеща сила в правителството „Желязков“ (януари–декември 2025 г.). Сега в опозиция." },
  { group: "ДБ", slug: "demokratichna-balgariya", name: "Демократична България", short: "ДБ", color: "#1f7a5a", initials: "ДБ", ballot: 7, list: "ПП – ДБ", exitKey: "ПП-ДБ", sharedList: "ПП",
    about: "Коалиция на „Да, България“ и ДСБ. На изборите се яви в обща листа с „Продължаваме промяната“, а в парламента групите са отделни. В опозиция." },
  { group: "ПП", slug: "prodalzhavame-promyanata", name: "Продължаваме промяната", short: "ПП", color: "#d18a1c", initials: "ПП", ballot: 7, list: "ПП – ДБ", exitKey: "ПП-ДБ", sharedList: "ДБ",
    about: "Партия, създадена през 2021 г. от Кирил Петков и Асен Василев. На изборите се яви в обща листа с „Демократична България“, а в парламента групите са отделни. В опозиция." },
  { group: "ДПС", slug: "dps", name: "Движение за права и свободи", short: "ДПС", color: "#6a4c93", initials: "ДПС", ballot: 17, list: "ДПС", exitKey: "ДПС",
    about: "Подкрепя част от решенията на мнозинството, например намаляването на партийната субсидия." },
  { group: "ВЪЗРАЖДАНЕ", slug: "vazrazhdane", name: "Възраждане", short: "Възраждане", color: "#4f6b2a", initials: "В", ballot: 8, list: "Възраждане", exitKey: "Възраждане",
    about: "Партия на Костадин Костадинов. В опозиция." },
];

export const partyBySlug = (s: string) => PARTY_META.find((p) => p.slug === s);
export const partyByGroup = (g: string) => PARTY_META.find((p) => p.group === g);

export type Elections = typeof elections;
export const ELECTIONS = elections;
export const EXIT = exit as {
  source: { title: string; url: string }; note: string;
  groups: { id: string; title: string; rows: { label: string; v: Record<string, number> }[] }[];
};

/** Субсидия: 4,09 € на глас до 30 април 2026 г., после 3 € на глас по удължителния закон. */
export const SUBSIDY = {
  before: 4.09, after: 3, from: "2026-04-30",
  vote: { yes: 136, no: 11, abstain: 55, text: "„За“: ПБ и ДПС. „Против“: Възраждане. „Въздържали се“: ГЕРБ, ДБ, ПП." },
  sources: [
    { title: "Стандарт: парламентът намалява субсидията до 3 € на глас", url: "https://www.standartnews.com/balgariya-politika/kray-horata-na-radev-otryazaha-parite-na-partiite-635904.html" },
    { title: "Podtepeto: кой има право на субсидия и колко", url: "https://podtepeto.com/izbori/parite-sled-vota-koi-pechelyat-i-koi-ostavat-bez-subsidiya/" },
    { title: "Клуб Z: как се разпределя субсидията на коалиция", url: "https://clubz.bg/175554" },
  ],
  reports: "https://gfopp.bulnao.government.bg/",
};
