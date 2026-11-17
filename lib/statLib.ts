import { CATALOG, type StatInfo } from "@/lib/statCatalog";
import { GEO, STATS, minWageYearly } from "@/lib/stats";

export type Obs = { x: number | string; value: number };

/** Всички наблюдения на един ред, подредени по време (години, месеци или полугодия → години). */
export function obs(id: string, key: string): Obs[] {
  if (id === "min_wage") return minWageYearly(key);
  const l = STATS.series[id]?.lines[key] ?? {};
  return Object.entries(l)
    .map(([k, v]) => ({ x: /^\d{4}$/.test(k) ? Number(k) : k, value: v }))
    .sort((a, b) => (String(a.x) < String(b.x) ? -1 : 1));
}

export function mainKey(id: string): string {
  const info = CATALOG[id];
  const keys = Object.keys(STATS.series[id]?.lines ?? {});
  if (info?.main && keys.includes(info.main)) return info.main;
  if (keys.includes("BG")) return "BG";
  return keys[0];
}

export const keyLabel = (id: string, k: string) => GEO[k] ?? STATS.series[id]?.labels?.[k] ?? k;

export type Summary = {
  id: string; info: StatInfo; key: string;
  last?: Obs; prev?: Obs; change?: number; eu?: Obs; trend?: "up" | "down" | "flat";
  /** Дали последната промяна е в добрата посока. */
  good?: boolean | null;
  years: number;
};

export function summary(id: string): Summary {
  const info = CATALOG[id];
  if (info.regional) {
    // За регионалните: средно на регионите и разликата между най-високия и най-ниския.
    const keys = Object.keys(STATS.series[id].lines);
    const lastX = obs(id, keys[0]).at(-1)?.x;
    const vals = keys.map((k) => obs(id, k).find((o) => o.x === lastX)?.value).filter((v): v is number => v != null);
    return { id, info, key: keys[0], last: lastX != null ? { x: lastX, value: Math.max(...vals) / Math.min(...vals) } : undefined, years: obs(id, keys[0]).length };
  }
  const key = mainKey(id);
  const o = obs(id, key);
  const last = o.at(-1), prev = o.at(-2);
  const change = last && prev ? last.value - prev.value : undefined;
  const eu = STATS.series[id].lines.EU27_2020 ? obs(id, "EU27_2020").at(-1) : undefined;
  const trend = change == null ? undefined : Math.abs(change) < 1e-9 ? "flat" : change > 0 ? "up" : "down";
  const good = info.better == null || trend == null || trend === "flat" ? null : (trend === info.better);
  return { id, info, key, last, prev, change, eu, trend, good, years: o.length };
}

/** Корелация на годишните промени (не на нивата, за да не се хващат общи тенденции). */
function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
function annualDiffs(id: string): Map<number, number> {
  const o = obs(id, mainKey(id)).filter((p): p is { x: number; value: number } => typeof p.x === "number");
  const m = new Map<number, number>();
  for (let i = 1; i < o.length; i++) if (o[i].x === o[i - 1].x + 1) m.set(o[i].x, o[i].value - o[i - 1].value);
  return m;
}
export type Corr = { id: string; r: number; n: number; from: number; to: number };
export function correlations(id: string, min = 8): Corr[] {
  const info = CATALOG[id];
  if (info.regional || info.periodic) return [];
  const a = annualDiffs(id);
  const out: Corr[] = [];
  for (const other of Object.keys(CATALOG)) {
    const oi = CATALOG[other];
    if (other === id || oi.regional || oi.periodic || !STATS.series[other]) continue;
    const b = annualDiffs(other);
    const years = [...a.keys()].filter((y) => b.has(y)).sort();
    if (years.length < min) continue;
    out.push({ id: other, r: pearson(years.map((y) => a.get(y)!), years.map((y) => b.get(y)!)), n: years.length, from: years[0], to: years.at(-1)! });
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

export const strength = (r: number) => {
  const a = Math.abs(r);
  return a >= 0.7 ? "силна" : a >= 0.5 ? "умерена" : a >= 0.3 ? "слаба" : "почти няма";
};
