// Държавните дружества от регистъра на АППК (data/public-companies.json, scripts/import-public-companies.mjs).
import { data } from "@/lib/data";
import type { Ministry } from "./ministries";

export type PublicCompany = { id: number; name: string; eik: string | null; kind: string | null; form: string | null; principal: string | null; board: string[]; town: string[] | null; activity: string | null; size: string | null; url: string };
type PCData = { source: string; url: string; updated: string; companies: PublicCompany[] };
const fixed = new WeakSet<object>();
/** Регистърът на държавните дружества (по време на рендериране). */
export async function pcData(): Promise<PCData> {
  const d = (await data<PCData>("public-companies.json")) ?? { source: "", url: "", updated: "", companies: [] };
  if (!fixed.has(d)) { for (const c of d.companies) c.name = c.name.replace(/&(amp;)?quot;/g, "\"").replace(/&(amp;)?amp;/g, "&"); fixed.add(d); }
  return d;
}
const stem = (s: string) => s.toLowerCase().replace(/[„“"]/g, "").replace(/\s+/g, " ");
/** Дружествата, в които правата на държавата упражнява министърът или министерството (не дъщерните на холдингите). */
export async function companiesOf(m: Ministry) {
  const key = stem(m.name.replace(/^Министерство на\s+/, "")).split(/,| и /)[0].trim();
  return (await pcData()).companies.filter((c) => !/^министерство/i.test(c.name) && c.principal && /министър|министерств/i.test(c.principal) && stem(c.principal).includes(key));
}
