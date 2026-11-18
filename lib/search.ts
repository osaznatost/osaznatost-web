// Търсене в поръчките с обикновен въпрос, без изкуствен интелект: разпознаваме думите в заявката
// (община, село, година, сума, вид работа, сигнал, ЕИК) и ги превръщаме във филтри към базата.
import places from "@/data/places.json";

export type Parsed = {
  muni: { code: string; name: string } | null;
  oblast: string | null;
  village: string | null;
  from: string | null; to: string | null;
  min: number | null; max: number | null;
  words: string[];             // търсят се в предмета на поръчката (всички трябва да присъстват)
  topic: string | null;        // разпозната тема (за обяснението)
  single: boolean; direct: boolean; eu: boolean;
  eik: string | null;
  firm: string | null;         // текст в кавички: търси се в името на изпълнителя или възложителя
  understood: string[];        // какво сме разбрали, за показване
};

type Place = { name: string; municipalities: { code: string; name: string; settlements: [string, string, number][] }[] };
const OBL = (places as { oblasts: Place[] }).oblasts;
const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const MUNIS = OBL.flatMap((o) => o.municipalities.map((m) => ({ code: m.code, name: m.name, l: low(m.name) })));
const VILLAGES = new Map<string, { name: string; code: string }[]>();
for (const o of OBL) for (const m of o.municipalities) for (const [, n, isV] of m.settlements) if (isV) { const k = low(n); VILLAGES.set(k, [...(VILLAGES.get(k) ?? []), { name: n, code: m.code }]); }

// Теми → корени на думи, които се търсят в предмета (поне един от тях).
export const TOPICS: [string, RegExp, string[]][] = [
  ["асфалт и пътища", /асфалт|улиц|път|тротоар|паваж|кръпк|дупк/, ["асфалт", "улиц", "пътищ", "пътна", "пътен", "пътни", "тротоар", "настилк"]],
  ["храна", /храна|храни|хранител|кетъринг/, ["хран"]],
  ["горива", /гориво|горива|бензин|дизел|нафта/, ["горив"]],
  ["ток и енергия", /ток|електроенерг|енерги/, ["електр", "енерги"]],
  ["почистване и сметосъбиране", /почиств|смет|отпадъ|чистот/, ["почиств", "отпадъ", "смет"]],
  ["осветление", /осветл|лампи/, ["осветл"]],
  ["вода и канализация", /водопровод|канализ|вик/, ["водопровод", "канализ"]],
  ["лекарства и медицина", /лекарств|медицин|болниц/, ["лекарств", "медицин"]],
  ["ремонт на сгради", /сград|училищ|детска градина|покрив|саниране|енергийна ефективност/, ["сград", "училищ", "градин", "енергийна ефективност"]],
  ["снегопочистване", /сняг|снего|зимно/, ["снег", "зимн"]],
  ["коли и транспорт", /автомоб|автобус|превоз|кола|коли/, ["автомоб", "превоз", "автобус"]],
  ["компютри и софтуер", /компют|софтуер|лиценз|информацион/, ["компют", "софтуер", "информацион"]],
  ["охрана", /охран/, ["охран"]],
  ["консултанти и проекти", /консулт|проектиран|надзор/, ["консулт", "проектиран", "надзор"]],
];
const STOP = new Set(("колко е са бе беше платил платила платило платили похарчил похарчила дал дала за през в във на от до и или с със по кой кои коя какво какви " +
  "общината община общини държавата договори договор поръчки поръчка обществени години година г лв лева евро € хил хиляди млн милиона млрд пари " +
  "всички най показай покажи искам търся търси къде много").split(/\s+/));

const NUM = String.raw`(\d{1,3}(?:[\s.]\d{3})+(?!\d)(?:,\d+)?|\d+(?:[.,]\d+)?)`;
function money(n: string, unit?: string) {
  const v = Number(n.replace(/\s/g, "").replace(",", "."));
  const m = unit ? (/млрд/.test(unit) ? 1e9 : /млн|милион/.test(unit) ? 1e6 : /хил/.test(unit) ? 1e3 : 1) : 1;
  return Number.isFinite(v) ? v * m : null;
}

export function parse(input: string): Parsed {
  let q = " " + low(input).replace(/[?!.;:]/g, " ").replace(/\s+/g, " ") + " ";
  const p: Parsed = { oblast: null, muni: null, village: null, from: null, to: null, min: null, max: null, words: [], topic: null, single: false, direct: false, eu: false, eik: null, firm: null, understood: [] };

  const quoted = input.match(/[„"«]([^“"»]{2,80})[“"»]/);
  if (quoted) { p.firm = quoted[1].trim(); p.understood.push(`фирма или възложител „${p.firm}“`); q = q.replace(low(quoted[0]), " "); }
  const eik = q.match(/\b(\d{9}|\d{13})\b/);
  if (eik) { p.eik = eik[1]; p.understood.push(`ЕИК ${p.eik}`); q = q.replace(eik[1], " "); }

  // Суми: „над 100 000“, „под 50 хил.“, „между 1 и 5 млн“
  const U = String.raw`\s*(хил|млн|милион|млрд)?\S*\.?`;
  const between = q.match(new RegExp(`между\\s+${NUM}${U}\\s+и\\s+${NUM}${U}\\s`));
  if (between) { p.min = money(between[1], between[2] ?? between[4]); p.max = money(between[3], between[4]); q = q.replace(between[0], " "); }
  const over = q.match(new RegExp(`(?:над|повече от|поне)\\s+${NUM}${U}\\s`));
  if (over) { p.min = money(over[1], over[2]); q = q.replace(over[0], " "); }
  const under = q.match(new RegExp(`(?:под|по-малко от|до)\\s+${NUM}${U}\\s`));
  if (under && !/^20[0-3]\d$/.test(under[1])) { p.max = money(under[1], under[2]); q = q.replace(under[0], " "); }
  if (p.min) p.understood.push(`над ${p.min.toLocaleString("bg-BG")} €`);
  if (p.max) p.understood.push(`под ${p.max.toLocaleString("bg-BG")} €`);

  // Години: „2024“, „2022-2024“, „от 2023“, „след 2023“, „преди 2025“
  const range = q.match(/(20[0-3]\d)\s*[-–]\s*(20[0-3]\d)/);
  if (range) { p.from = `${range[1]}-01-01`; p.to = `${range[2]}-12-31`; q = q.replace(range[0], " "); }
  const since = q.match(/(?:от|след|след като)\s+(20[0-3]\d)/);
  if (!p.from && since) { p.from = `${since[1]}-01-01`; q = q.replace(since[0], " "); }
  const before = q.match(/преди\s+(20[0-3]\d)/);
  if (!p.to && before) { p.to = `${Number(before[1]) - 1}-12-31`; q = q.replace(before[0], " "); }
  const years = [...q.matchAll(/\b(20[0-3]\d)\b/g)].map((m) => Number(m[1]));
  if (!p.from && !p.to && years.length) { p.from = `${Math.min(...years)}-01-01`; p.to = `${Math.max(...years)}-12-31`; }
  for (const y of years) q = q.replace(String(y), " ");
  if (/миналата година/.test(q)) p.understood.push("(„миналата година“: посочете годината с цифри)");
  if (p.from || p.to) p.understood.push(p.from && p.to && p.from.slice(0, 4) === p.to.slice(0, 4) ? `през ${p.from.slice(0, 4)} г.` : `${p.from ? `от ${p.from.slice(0, 4)}` : ""}${p.to ? ` до ${p.to.slice(0, 4)}` : ""} г.`.trim());

  // Сигнали
  if (/една оферта|един участник|без конкуренция/.test(q)) { p.single = true; p.understood.push("само една оферта"); q = q.replace(/една оферта|един участник|без конкуренция/g, " "); }
  if (/без конкурс|пряко|договаряне без|директно/.test(q)) { p.direct = true; p.understood.push("без открит конкурс"); q = q.replace(/без конкурс|пряко|договаряне без|директно/g, " "); }
  if (/европейск|еврофонд|по програма/.test(q)) { p.eu = true; p.understood.push("с европейски пари"); q = q.replace(/европейски|европейските|еврофондове|европейск\S*|по програма/g, " "); }

  // Област: „Софийска област“, „област Пловдив“, „във Варненска“
  const ADJ: Record<string, string> = { софийск: "София", пловдивск: "Пловдив", варненск: "Варна", бургаск: "Бургас", старозагорск: "Стара Загора", великотърновск: "Велико Търново", русенск: "Русе", плевенск: "Плевен", благоевградск: "Благоевград", хасковск: "Хасково", кърджалийск: "Кърджали", смолянск: "Смолян", пазарджишк: "Пазарджик", кюстендилск: "Кюстендил", пернишк: "Перник", врачанск: "Враца", монтанск: "Монтана", видинск: "Видин", ловешк: "Ловеч", габровск: "Габрово", сливенск: "Сливен", ямболск: "Ямбол", шуменск: "Шумен", търговищк: "Търговище", разградск: "Разград", силистренск: "Силистра", добричк: "Добрич" };
  const adj = q.match(/(софийск|пловдивск|варненск|бургаск|старозагорск|великотърновск|русенск|плевенск|благоевградск|хасковск|кърджалийск|смолянск|пазарджишк|кюстендилск|пернишк|врачанск|монтанск|видинск|ловешк|габровск|сливенск|ямболск|шуменск|търговищк|разградск|силистренск|добричк)\S*(\s+област\S*)?/);
  const obl = q.match(/област\S*\s+([а-я]+(?:\s[а-я]+)?)/);
  if (adj) { p.oblast = ADJ[adj[1]]; q = q.replace(adj[0], " "); }
  else if (obl) { const o = OBL.find((x) => obl[1].startsWith(low(x.name))); if (o) { p.oblast = o.name; q = q.replace(obl[0], " "); } }
  if (p.oblast) p.understood.push(`област ${p.oblast}`);

  // Община (най-дългото съвпадение първо: „Горна Оряховица“ преди „Оряхово“)
  for (const m of [...MUNIS].sort((a, b) => b.l.length - a.l.length)) {
    const re = new RegExp(`(^|[^а-я])${m.l}(а|та|ска|ски|ския|ската)?([^а-я]|$)`);
    if (re.test(q)) { p.muni = { code: m.code, name: m.name }; p.understood.push(`община ${m.name}`); q = q.replace(re, " "); break; }
  }
  // Село: „с. Трудовец“, „село Скравена“ или име на село в разпознатата община
  const vm = q.match(/(?:с\.|село)\s*([а-я][а-я-]+(?:\s[а-я][а-я-]+)?)/);
  const vname = vm?.[1] ?? [...VILLAGES.keys()].find((k) => k.length >= 5 && new RegExp(`(^|[^а-я])${k}([^а-я]|$)`).test(q) && (!p.muni || VILLAGES.get(k)!.some((x) => x.code === p.muni!.code)));
  if (vname && VILLAGES.has(vname)) {
    const v = VILLAGES.get(vname)!;
    p.village = v[0].name;
    if (!p.muni && v.length === 1) { const m = MUNIS.find((x) => x.code === v[0].code)!; p.muni = { code: m.code, name: m.name }; }
    p.understood.push(`с. ${p.village}`);
    q = q.replace(vm?.[0] ?? vname, " ");
  }

  // Тема
  for (const [label, re] of TOPICS) if (re.test(q)) { p.topic = label; p.understood.push(`тема: ${label}`); q = q.replace(new RegExp(`\\S*(${re.source})\\S*`, "g"), " "); break; }

  // Останалите думи → корени, търсени в предмета
  p.words = q.split(/[^а-я0-9a-z-]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => (w.length > 6 ? w.slice(0, w.length - 2) : w)).slice(0, 4);
  if (p.words.length) p.understood.push(`думи в предмета: ${p.words.map((w) => `„${w}…“`).join(", ")}`);
  return p;
}

const enc = encodeURIComponent;
const like = (w: string) => enc(`*${w.replace(/[*,()]/g, " ")}*`);
/** Заявка към PostgREST по разбраното. */
export function toQuery(p: Parsed, firmEiks: string[] = [], limit = 1000) {
  const f: string[] = [];
  if (p.muni) f.push(`municipality_code=eq.${p.muni.code}`);
  else if (p.oblast) f.push(`oblast=eq.${enc(p.oblast)}`);
  if (p.from) f.push(`contract_date=gte.${p.from}`);
  if (p.to) f.push(`contract_date=lte.${p.to}`);
  if (p.min != null) f.push(`contract_value_eur=gte.${p.min}`);
  if (p.max != null) f.push(`contract_value_eur=lte.${p.max}`);
  if (p.single) f.push("offers_count=eq.1");
  if (p.direct) f.push(`procedure_type=ilike.${enc("*договаряне*")}`);
  if (p.eu) f.push("is_eu_funded=is.true");
  if (p.eik) f.push(`or=(buyer_eik.eq.${p.eik},supplier_eiks.cs.{${p.eik}})`);
  const topicStems = p.topic ? TOPICS.find((t) => t[0] === p.topic)![2] : [];
  const ands: string[] = [];
  if (topicStems.length) ands.push(`or(${topicStems.map((w) => `tender_name.ilike.${like(w)}`).join(",")})`);
  for (const w of p.words) ands.push(`tender_name.ilike.${like(w)}`);
  if (p.village) ands.push(`tender_name.ilike.${like(p.village)}`);
  if (p.firm) ands.push(firmEiks.length ? `or(buyer_name.ilike.${like(p.firm)},supplier_eiks.ov.{${firmEiks.join(",")}})` : `buyer_name.ilike.${like(p.firm)}`);
  if (ands.length) f.push(`and=(${ands.join(",")})`);
  return `proc_contracts_geo?${f.join("&")}&order=contract_value_eur.desc.nullslast&limit=${limit}`;
}
