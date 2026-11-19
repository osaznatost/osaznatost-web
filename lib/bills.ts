// Законопроектите от parliament.bg (data/bills.json, от scripts/build-bills.mjs), свързани със законите по име.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lawFromTitle } from "@/lib/voteExplain";

export type Bill = {
  id: number; sign: string; date: string; title: string; final: string | null; url: string; withdrawn: boolean;
  adopted: string | null; dv: string | null; veto: string | null; byGov: boolean;
  sponsors: string[]; sponsorIds?: number[]; committees: string[];
  opinions: { date: string; title: string }[];
  reports: { date: string; committee: string; stage: string }[];
  hall: { date: string; stage: string; url: string }[];
  proposals: number;
  notes?: { conflict: string[]; against: string[]; votes: { stage: string; committee: string; yes: number; no: number; abst: number }[] };
};
let cache: Bill[] | null = null;
export function allBills(): Bill[] {
  if (cache) return cache;
  const f = path.join(process.cwd(), "data", "bills.json");
  cache = existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")).bills as Bill[]) : [];
  return cache;
}
/** Законопроектите, които променят даден закон (по името му в заглавието). */
export function billsForLaw(slug: string): Bill[] {
  return allBills().filter((b) => billLaw(b)?.slug === slug);
}
export function billLaw(b: Pick<Bill, "title">) {
  return lawFromTitle(b.title.replace(/^Законопроект/, "")) ?? lawFromTitle(b.title.replace(/^Законопроект/, "Закон"));
}

const nameKey = (s: string) => { const p = s.trim().toUpperCase().split(/\s+/); return `${p[0]} ${p.at(-1)}`; };
/** Законопроектите, сред чиито вносители е депутатът (по име и фамилия), и в чиито доклади е обявил конфликт на интереси. */
export function billsOfMp(fullName: string, pid?: number, ambiguous = false) {
  const key = nameKey(fullName);
  // по номера в parliament.bg, ако го има; иначе по име, но не и когато двама депутати имат едно и също име и фамилия
  const sponsored = allBills().filter((b) => (pid && b.sponsorIds?.length ? b.sponsorIds.includes(pid) : !ambiguous && b.sponsors.some((s) => nameKey(s) === key)));
  const parts = fullName.trim().split(/\s+/), fl = `${parts[0]} ${parts.at(-1)}`;
  let conflict = allBills().filter((b) => (b.notes?.conflict ?? []).some((c) => c.includes(fl)));
  if (ambiguous) conflict = conflict.filter((b) => sponsored.includes(b)); // при съвпадащи имена — само ако е и вносител
  return { sponsored, conflict };
}
