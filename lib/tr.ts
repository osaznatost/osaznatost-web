// Търговският регистър за фирмите с обществени поръчки (data/tr, събрано от scripts/import-tr.py).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type TrPerson = { name: string; eik?: string; country?: string; share?: string };
export type TrFirm = {
  name: string; form: string | null; status: number; founded: string | null; firstEntry: string | null; town: string | null; muni: string | null;
  address: string | null; activity: string | null; capital: string | null; fetched: string;
  managers: TrPerson[]; board: TrPerson[]; partners: TrPerson[]; owner: TrPerson[]; ubo: TrPerson[]; procurator: TrPerson[];
};
const DIR = path.join(process.cwd(), "data", "tr");
const shards = new Map<string, Record<string, TrFirm>>();
export function trFor(eik: string): TrFirm | null {
  const k = eik.slice(0, 2);
  if (!shards.has(k)) { const f = path.join(DIR, `${k}.json`); shards.set(k, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}); }
  return shards.get(k)![eik.slice(0, 9)] ?? null;
}
let people: Record<string, [string, string][]> | null = null;
/** Фирмите, в които човек с тези три имена е управител, съдружник или собственик. Съвпадение по имена, не по ЕГН. */
export function firmsOfPerson(name: string) {
  if (!people) { const f = path.join(DIR, "people.json"); people = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; }
  const rows = people![name.toUpperCase().replace(/\s+/g, " ").trim()] ?? [];
  const by = new Map<string, string[]>();
  for (const [eik, role] of rows) by.set(eik, [...new Set([...(by.get(eik) ?? []), role])]);
  return [...by.entries()].map(([eik, roles]) => ({ eik, roles, firm: trFor(eik) }));
}
/** Годината на създаване: от номера на фирменото дело или от първото вписване (след пререгистрацията през 2008 г.). */
export function foundedYear(f: TrFirm | null) {
  if (!f) return null;
  if (f.founded) return Number(f.founded);
  if (f.firstEntry && f.firstEntry > "2008-12-31") return Number(f.firstEntry.slice(0, 4));
  return null;
}
export function foundedDate(f: TrFirm | null) {
  if (!f) return null;
  if (f.founded) return `${f.founded}-01-01`;
  return f.firstEntry && f.firstEntry > "2008-12-31" ? f.firstEntry : null;
}
