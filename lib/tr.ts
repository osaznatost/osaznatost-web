// Търговският регистър за фирмите с обществени поръчки (data/tr, събрано от scripts/import-tr.py).
import { data } from "@/lib/data";

export type TrPerson = { name: string; eik?: string; country?: string; share?: string };
export type TrFirm = {
  name: string; form: string | null; status: number; founded: string | null; firstEntry: string | null; town: string | null; muni: string | null;
  address: string | null; activity: string | null; capital: string | null; fetched: string;
  managers: TrPerson[]; board: TrPerson[]; partners: TrPerson[]; owner: TrPerson[]; ubo: TrPerson[]; procurator: TrPerson[];
};
export async function trFor(eik: string): Promise<TrFirm | null> {
  return (await data<Record<string, TrFirm>>(`tr/${eik.slice(0, 2)}.json`))?.[eik.slice(0, 9)] ?? null;
}
/** Фирмите по ЕИК наведнъж: ЕИК → запис или null. */
export async function trMany(eiks: string[]): Promise<Map<string, TrFirm | null>> {
  const u = [...new Set(eiks.map((e) => e.slice(0, 9)))];
  const r = await Promise.all(u.map(trFor));
  return new Map(u.map((e, i) => [e, r[i]]));
}
/** Фирмите, в които човек с тези три имена е управител, съдружник или собственик. Съвпадение по имена, не по ЕГН. */
export async function firmsOfPerson(name: string) {
  const people = (await data<Record<string, [string, string][]>>("tr/people.json")) ?? {};
  const rows = people[name.toUpperCase().replace(/\s+/g, " ").trim()] ?? [];
  const by = new Map<string, string[]>();
  for (const [eik, role] of rows) by.set(eik, [...new Set([...(by.get(eik) ?? []), role])]);
  const tr = await trMany([...by.keys()]);
  return [...by.entries()].map(([eik, roles]) => ({ eik, roles, firm: tr.get(eik.slice(0, 9)) ?? null }));
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
export async function sharedPeople(eiks: string[]) {
  const by = new Map<string, { name: string; firms: Set<string> }>();
  const tr = await trMany(eiks);
  for (const e of new Set(eiks.map((x) => x.slice(0, 9)))) for (const p of peopleOf(tr.get(e) ?? null)) {
    const x = by.get(p.key) ?? { name: p.name, firms: new Set<string>() };
    x.firms.add(e); by.set(p.key, x);
  }
  return [...by.values()].filter((x) => x.firms.size > 1).map((x) => ({ name: x.name, firms: [...x.firms] }));
}
/** Други фирми с изпълнители (от тези с поръчки), които имат общ човек с тази. */
export async function relatedFirms(eik: string) {
  const me = await trFor(eik);
  const out = new Map<string, string[]>();
  for (const p of peopleOf(me)) {
    if (p.key.startsWith("EIK:")) continue;
    for (const { eik: e } of await firmsOfPerson(p.name)) if (e !== eik.slice(0, 9)) out.set(e, [...new Set([...(out.get(e) ?? []), p.name])]);
  }
  const tr = await trMany([...out.keys()]);
  return [...out.entries()].map(([e, via]) => ({ eik: e, firm: tr.get(e) ?? null, via }));
}

const addrKey = (a: string) => a.replace(/^Държава:\s*БЪЛГАРИЯ\s*/i, "").replace(/,?\s*(ет\.|етаж|ап\.|апартамент|офис|оф\.|вх\.)\s*[^,]*/gi, "").replace(/\s+/g, " ").trim().toUpperCase();
/** Групи фирми (от дадените) с един и същ адрес на управление в Търговския регистър, без етаж, вход и офис. */
export async function sharedAddress(eiks: string[]) {
  const by = new Map<string, { address: string; firms: Set<string> }>();
  const tr = await trMany(eiks);
  for (const e of new Set(eiks.map((x) => x.slice(0, 9)))) {
    const f = tr.get(e) ?? null;
    if (!f?.address) continue;
    const k = addrKey(f.address);
    if (k.length < 25) continue;
    const x = by.get(k) ?? { address: f.address.replace(/^Държава:\s*БЪЛГАРИЯ\s*/i, ""), firms: new Set<string>() };
    x.firms.add(e); by.set(k, x);
  }
  return [...by.values()].filter((x) => x.firms.size > 1).map((x) => ({ address: x.address, firms: [...x.firms] }));
}
