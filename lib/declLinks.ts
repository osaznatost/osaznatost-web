// Връзки „декларирана фирма ↔ обществени поръчки“ (data/declarations/links.json, scripts/build-declaration-links.mjs).
import data from "@/data/declarations/links.json";

export type DeclLink = {
  year: string; name: string; pos: string; inst: string; kind: string; co: string; eik: string; decl: string;
  contracts: number; eur: number; own: { n: number; eur: number } | null; confirmed?: boolean | null; mp?: string[];
};
const L = ((data as { links?: DeclLink[] }).links ?? []) as DeclLink[];
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

const byPerson = new Map<string, DeclLink[]>();
const byEik = new Map<string, DeclLink[]>();
for (const l of L) {
  (byPerson.get(norm(l.name)) ?? byPerson.set(norm(l.name), []).get(norm(l.name))!).push(l);
  const e = String(l.eik).slice(0, 9);
  (byEik.get(e) ?? byEik.set(e, []).get(e)!).push(l);
}
/** Декларираните фирми с поръчки на лицето (по трите имена). */
export const declLinksFor = (name: string) => byPerson.get(norm(name)) ?? [];
/** Лицата на власт, декларирали тази фирма. */
export const declLinksForEik = (eik: string) => byEik.get(String(eik).slice(0, 9)) ?? [];
