import raw from "@/data/stats.json";

type Line = Record<string, number>;
type Series = { dataset: string; url: string; updated?: string; labels?: Record<string, string>; lines: Record<string, Line> };
export const STATS = raw as unknown as { updated: string; source: string; series: Record<string, Series> };

export const GEO: Record<string, string> = {
  BG: "България", EU27_2020: "ЕС", RO: "Румъния", GR: "Гърция", EL: "Гърция", HR: "Хърватия", DE: "Германия", PL: "Полша", HU: "Унгария", ES: "Испания",
  M: "Мъже", F: "Жени",
  BG31: "Северозападен", BG32: "Северен централен", BG33: "Североизточен",
  BG34: "Югоизточен", BG41: "Югозападен (София)", BG42: "Южен централен",
  BG311: "Видин", BG312: "Монтана", BG313: "Враца", BG314: "Плевен", BG315: "Ловеч",
  BG321: "Велико Търново", BG322: "Габрово", BG323: "Русе", BG324: "Разград", BG325: "Силистра",
  BG331: "Варна", BG332: "Добрич", BG333: "Шумен", BG334: "Търговище",
  BG341: "Бургас", BG342: "Сливен", BG343: "Ямбол", BG344: "Стара Загора",
  BG411: "София (столица)", BG412: "София (област)", BG413: "Благоевград", BG414: "Перник", BG415: "Кюстендил",
  BG421: "Пловдив", BG422: "Хасково", BG423: "Пазарджик", BG424: "Смолян", BG425: "Кърджали",
};

export type Point = { series: string; x: number | string; value: number };

/** Годишна серия като точки (само числови години). */
export function line(id: string, key: string, from = 0): { x: number; value: number }[] {
  const l = STATS.series[id]?.lines[key] ?? {};
  return Object.entries(l)
    .filter(([k]) => /^\d{4}$/.test(k) && Number(k) >= from)
    .map(([k, v]) => ({ x: Number(k), value: v }))
    .sort((a, b) => a.x - b.x);
}

export function multi(id: string, keys: string[], from = 0): Point[] {
  return keys.flatMap((k) => line(id, k, from).map((p) => ({ series: GEO[k] ?? k, ...p })));
}

export function last(id: string, key: string) {
  const l = line(id, key);
  return l[l.length - 1];
}
export function at(id: string, key: string, year: number) {
  return STATS.series[id]?.lines[key]?.[String(year)];
}

/** Натрупан ценови индекс от годишни темпове (база = 100 в `base`). */
export function cumIndex(id: string, key: string, base: number): { x: number; value: number }[] {
  const out = [{ x: base, value: 100 }];
  let v = 100;
  for (const p of line(id, key, base + 1)) {
    v = v * (1 + p.value / 100);
    out.push({ x: p.x, value: Math.round(v * 10) / 10 });
  }
  return out;
}

/** Индекс на ниво (стойностите се превръщат в база = 100 в `base`). */
export function levelIndex(points: { x: number; value: number }[], base: number) {
  const b = points.find((p) => p.x === base)?.value;
  if (!b) return [];
  return points.filter((p) => p.x >= base).map((p) => ({ x: p.x, value: Math.round((p.value / b) * 1000) / 10 }));
}

/** Минимална заплата: стойността от второто полугодие за всяка година. */
export function minWageYearly(geo: string) {
  const l = STATS.series.min_wage?.lines[geo] ?? {};
  const out: { x: number; value: number }[] = [];
  for (const [k, v] of Object.entries(l)) {
    const m = k.match(/^(\d{4})-S2$/);
    if (m) out.push({ x: Number(m[1]), value: v });
  }
  return out.sort((a, b) => a.x - b.x);
}

export const fmt = (n: number, d = 1) => n.toLocaleString("bg-BG", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const eurostatUrl = (ds: string) => `https://ec.europa.eu/eurostat/databrowser/view/${ds}/default/table`;
