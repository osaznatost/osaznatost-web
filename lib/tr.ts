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

const PEOPLE_KEYS: (keyof TrFirm)[] = ["managers", "board", "partners", "owner", "ubo", "procurator"];
const norm = (s: string) => s.toUpperCase().replace(/[„“"']/g, "").replace(/\s+/g, " ").trim();
/** Хората (три имена) и фирмите собственици на една фирма. */
export function peopleOf(f: TrFirm | null) {
  if (!f) return [];
  return PEOPLE_KEYS.flatMap((k) => ((f[k] as TrPerson[]) ?? []).map((p) => ({ key: p.eik ? `EIK:${p.eik.slice(0, 9)}` : norm(p.name), name: p.name, role: k })))
    .filter((p) => p.key.startsWith("EIK:") || p.key.split(" ").length >= 3);
}
/** Двойки фирми с общ човек (управител, съдружник, собственик) или обща фирма собственик. */
export function sharedPeople(eiks: string[]) {
  const by = new Map<string, { name: string; firms: Set<string> }>();
  for (const e of new Set(eiks.map((x) => x.slice(0, 9)))) for (const p of peopleOf(trFor(e))) {
    const x = by.get(p.key) ?? { name: p.name, firms: new Set<string>() };
    x.firms.add(e); by.set(p.key, x);
  }
  return [...by.values()].filter((x) => x.firms.size > 1).map((x) => ({ name: x.name, firms: [...x.firms] }));
}
/** Други фирми с изпълнители (от тези с поръчки), които имат общ човек с тази. */
export function relatedFirms(eik: string) {
  const me = trFor(eik);
  const out = new Map<string, string[]>();
  for (const p of peopleOf(me)) {
    if (p.key.startsWith("EIK:")) continue;
    for (const { eik: e } of firmsOfPerson(p.name)) if (e !== eik.slice(0, 9)) out.set(e, [...new Set([...(out.get(e) ?? []), p.name])]);
  }
  return [...out.entries()].map(([e, via]) => ({ eik: e, firm: trFor(e), via }));
}

const addrKey = (a: string) => a.replace(/^Държава:\s*БЪЛГАРИЯ\s*/i, "").replace(/,?\s*(ет\.|етаж|ап\.|апартамент|офис|оф\.|вх\.)\s*[^,]*/gi, "").replace(/\s+/g, " ").trim().toUpperCase();
/** Групи фирми (от дадените) с един и същ адрес на управление в Търговския регистър, без етаж, вход и офис. */
export function sharedAddress(eiks: string[]) {
  const by = new Map<string, { address: string; firms: Set<string> }>();
  for (const e of new Set(eiks.map((x) => x.slice(0, 9)))) {
    const f = trFor(e);
    if (!f?.address) continue;
    const k = addrKey(f.address);
    if (k.length < 25) continue;
    const x = by.get(k) ?? { address: f.address.replace(/^Държава:\s*БЪЛГАРИЯ\s*/i, ""), firms: new Set<string>() };
    x.firms.add(e); by.set(k, x);
  }
  return [...by.values()].filter((x) => x.firms.size > 1).map((x) => ({ address: x.address, firms: [...x.firms] }));
}
