// Министерствата от Административния регистър (data/ministries.json, събрано от scripts/import-ministries.mjs).
import { data } from "@/lib/data";

export type Leader = { role: string; kind: string; person: string | null; since: string | null; staff: number | null; vacant: number | null };
export type Unit = { name: string; group: string | null; staff: number | null; vacant: number | null; head: string | null };
export type Agency = { id: string; name: string; eik: string | null; site: string | null };
export type Ministry = { id: string; name: string; url: string; eik: string | null; site: string | null; leaders: Leader[]; units: Unit[]; agencies: Agency[]; staff: number; vacant: number };
type Data = { source: string; url: string; updated: string; ministries: Ministry[]; history: Record<string, { person: string; since: string | null; seen: string }[]> };

const EMPTY: Data = { source: "", url: "", updated: "", ministries: [], history: {} };
const fixed = new WeakSet<object>();
/** Данните за министерствата (по време на рендериране). */
export async function minData(): Promise<Data> {
  const d = (await data<Data>("ministries.json")) ?? EMPTY;
  if (!fixed.has(d)) {
    // „Състав“ е заглавие в регистъра (за политическия кабинет), не име на човек.
    for (const m of d.ministries) for (const l of m.leaders) if (l.person && !/\s/.test(l.person.trim())) l.person = null;
    fixed.add(d);
  }
  return d;
}
export const ministry = async (id: string) => (await minData()).ministries.find((m) => m.id === id) ?? null;
export const minister = (m: Ministry) => m.leaders.find((l) => l.kind === "GBHeadAdm") ?? null;
/** Кратко име за менюта: „Министерство на финансите“ → „Финансите“. */
export const shortName = (n: string) => n.replace(/^Министерство на\s+/, "").replace(/^./, (c) => c.toUpperCase());
/** Всички ЕИК на министерството и агенциите към него: за поръчките. */
export const buyerEiks = (m: Ministry) => [m.eik, ...m.agencies.map((a) => a.eik)].filter((x): x is string => !!x);
