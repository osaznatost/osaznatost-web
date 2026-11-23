// Всички закони, гласувани в този парламент, с основните факти за проследяване: етап, сигнали, обяснение, законопроекти.
import { billsForLaw, type Bill } from "@/lib/bills";
import { LAWS } from "@/lib/laws";
import { lawSignals, type LawSignal } from "@/lib/lawSignals";
import { VOTES, type Vote } from "@/lib/parliament";
import { lawFromTitle } from "@/lib/voteExplain";
import { autoFor } from "@/lib/lawAuto";

export type LawRow = { slug: string; name: string; votes: Vote[]; first: string; last: string; stage: "first" | "second"; adopted: boolean; signals: LawSignal[]; explained: boolean; auto: boolean; bills: Bill[] };

let cache: Promise<LawRow[]> | null = null;
export function lawIndex(): Promise<LawRow[]> {
  return (cache ??= build());
}
async function build(): Promise<LawRow[]> {
  const by = new Map<string, { name: string; votes: Vote[] }>();
  for (const v of VOTES) {
    const l = lawFromTitle(v.title);
    if (!l) continue;
    const g = by.get(l.slug) ?? { name: l.name, votes: [] };
    g.votes.push(v);
    by.set(l.slug, g);
  }
  const rows = await Promise.all([...by.entries()].map(async ([slug, g]) => {
    const dates = g.votes.map((v) => v.date).sort();
    const second = g.votes.some((v) => /второ гласуване/i.test(v.title));
    const bills = await billsForLaw(slug);
    const auto = (await Promise.all(bills.map((b) => autoFor(b.id)))).some(Boolean);
    return {
      slug, name: g.name, votes: g.votes, first: dates[0], last: dates.at(-1)!, stage: second ? "second" : "first",
      adopted: bills.some((b) => b.dv) || (second && g.votes.some((v) => /второ гласуване/i.test(v.title) && v.outcome !== "rejected")),
      signals: lawSignals(g.votes, bills), explained: Boolean(LAWS[slug]), auto, bills,
    } satisfies LawRow;
  }));
  return rows.sort((a, b) => (a.last < b.last ? 1 : -1));
}
