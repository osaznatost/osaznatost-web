// Законопроектите от parliament.bg (data/bills.json, от scripts/build-bills.mjs), свързани със законите по име.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lawFromTitle } from "@/lib/voteExplain";
import { MPS, VOTES } from "@/lib/parliament";

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

let voted: Set<string> | null = null;
/** Законът на законопроекта, само ако има страница (т.е. по него е гласувано); иначе null. */
export function billLawPage(b: Pick<Bill, "title">) {
  if (!voted) { voted = new Set(); for (const v of VOTES) { const l = lawFromTitle(v.title); if (l) voted.add(l.slug); } }
  const l = billLaw(b);
  return l && voted.has(l.slug) ? l : null;
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

/** Законопроектите на депутатите по група: групата е тази на мнозинството от вносителите. Без внесените от Министерския съвет. */
export function billsByGroup() {
  const party = new Map(MPS.filter((m) => m.pid).map((m) => [m.pid!, m.party]));
  const out = new Map<string, { n: number; adopted: number; withdrawn: number }>();
  for (const b of allBills()) {
    if (b.byGov || !b.sponsorIds?.length) continue;
    const cnt = new Map<string, number>();
    for (const id of b.sponsorIds) { const p = party.get(id); if (p) cnt.set(p, (cnt.get(p) ?? 0) + 1); }
    const p = [...cnt.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    if (!p) continue;
    const r = out.get(p) ?? { n: 0, adopted: 0, withdrawn: 0 };
    r.n++;
    if (b.final || (b.adopted && b.adopted !== "0001-01-01")) r.adopted++;
    if (b.withdrawn) r.withdrawn++;
    out.set(p, r);
  }
  return [...out.entries()].map(([party, r]) => ({ party, ...r })).sort((a, b) => b.n - a.n);
}
