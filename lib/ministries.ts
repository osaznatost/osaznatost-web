// Министерствата от Административния регистър (data/ministries.json, събрано от scripts/import-ministries.mjs).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Leader = { role: string; kind: string; person: string | null; since: string | null; staff: number | null; vacant: number | null };
export type Unit = { name: string; group: string | null; staff: number | null; vacant: number | null; head: string | null };
export type Agency = { id: string; name: string; eik: string | null; site: string | null };
export type Ministry = { id: string; name: string; url: string; eik: string | null; site: string | null; leaders: Leader[]; units: Unit[]; agencies: Agency[]; staff: number; vacant: number };
type Data = { source: string; url: string; updated: string; ministries: Ministry[]; history: Record<string, { person: string; since: string | null; seen: string }[]> };

const f = path.join(process.cwd(), "data", "ministries.json");
export const MIN: Data = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { source: "", url: "", updated: "", ministries: [], history: {} };
// „Състав“ е заглавие в регистъра (за политическия кабинет), не име на човек.
for (const m of MIN.ministries) for (const l of m.leaders) if (l.person && !/\s/.test(l.person.trim())) l.person = null;
export const ministry = (id: string) => MIN.ministries.find((m) => m.id === id) ?? null;
export const minister = (m: Ministry) => m.leaders.find((l) => l.kind === "GBHeadAdm") ?? null;
/** Кратко име за менюта: „Министерство на финансите“ → „Финансите“. */
export const shortName = (n: string) => n.replace(/^Министерство на\s+/, "").replace(/^./, (c) => c.toUpperCase());
/** Всички ЕИК на министерството и агенциите към него: за поръчките. */
export const buyerEiks = (m: Ministry) => [m.eik, ...m.agencies.map((a) => a.eik)].filter((x): x is string => !!x);
