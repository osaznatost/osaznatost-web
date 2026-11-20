// Държавните дружества от регистъра на АППК (data/public-companies.json, scripts/import-public-companies.mjs).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Ministry } from "./ministries";

export type PublicCompany = { id: number; name: string; eik: string | null; kind: string | null; form: string | null; principal: string | null; board: string[]; town: string[] | null; activity: string | null; size: string | null; url: string };
const f = path.join(process.cwd(), "data", "public-companies.json");
export const PC: { source: string; url: string; updated: string; companies: PublicCompany[] } = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { source: "", url: "", updated: "", companies: [] };

for (const c of PC.companies) c.name = c.name.replace(/&(amp;)?quot;/g, "\"").replace(/&(amp;)?amp;/g, "&");
const stem = (s: string) => s.toLowerCase().replace(/[„“"]/g, "").replace(/\s+/g, " ");
/** Дружествата, в които правата на държавата упражнява министърът или министерството (не дъщерните на холдингите). */
export function companiesOf(m: Ministry) {
  const key = stem(m.name.replace(/^Министерство на\s+/, "")).split(/,| и /)[0].trim();
  return PC.companies.filter((c) => !/^министерство/i.test(c.name) && c.principal && /министър|министерств/i.test(c.principal) && stem(c.principal).includes(key));
}
