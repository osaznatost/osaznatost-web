// Законопроектите от parliament.bg (data/bills.json, от scripts/build-bills.mjs), свързани със законите по име.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lawFromTitle } from "@/lib/voteExplain";

export type Bill = {
  id: number; sign: string; date: string; title: string; final: string | null; url: string; withdrawn: boolean;
  adopted: string | null; dv: string | null; veto: string | null; byGov: boolean;
  sponsors: string[]; committees: string[];
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
