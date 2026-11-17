import Link from "next/link";
import { OutcomeTag, TallyBar } from "@/components/parliament";
import { SectionTitle } from "@/components/ui";
import { PARTIES, VOTES, type Vote, formatDate, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";
import { explain, lawFromTitle } from "@/lib/voteExplain";

const POS: Record<string, string> = { y: "за", n: "против", a: "въздържал се", split: "разделени", absent: "отсъства" };
const tally = (v: Vote) => {
  const br = partyBreakdown(v);
  return Object.values(br).reduce((s, c) => ({ y: s.y + c.y, n: s.n + c.n, a: s.a + c.a, x: s.x + c.x }), { y: 0, n: 0, a: 0, x: 0 });
};

/** Последните заседания: гласуванията по закони, групирани по ден и закон, без процедурните. */
export function RecentSittings({ days = 3 }: { days?: number }) {
  const dates = [...new Set(VOTES.map((v) => v.date))].sort().reverse().slice(0, days);
  return (
    <section className="mb-14">
      <SectionTitle right={<a href="#vsichki">Всички гласувания</a>}>Последните заседания</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        {dates.map((d) => {
          const dayVotes = VOTES.filter((v) => v.date === d);
          const groups = new Map<string, { name: string; slug?: string; votes: Vote[] }>();
          for (const v of dayVotes) {
            const ex = explain(v.title, v.outcome);
            if (ex.kind.startsWith("Процедура")) continue;
            const law = lawFromTitle(v.title);
            const key = law?.slug ?? v.id;
            const g = groups.get(key) ?? { name: law?.name ?? v.title, slug: law?.slug, votes: [] };
            g.votes.push(v);
            groups.set(key, g);
          }
          const items = [...groups.values()].slice(0, 6);
          return (
            <div key={d} className="ring-1 ring-rule rounded-sm bg-white">
              <p className="px-4 py-2.5 bg-surface font-semibold border-b border-rule">{formatDate(d)} <span className="text-sm font-normal text-muted">· {dayVotes.length} гласувания</span></p>
              <ul className="divide-y divide-rule">
                {items.map((g) => {
                  const main = g.votes.find((v) => /първо гласуване/.test(v.title) && !/процедура/.test(v.title)) ?? g.votes[g.votes.length - 1];
                  const stage = g.votes.some((v) => /второ гласуване/.test(v.title)) ? `второ четене, ${g.votes.length} гласувания` : g.votes.some((v) => /първо гласуване/.test(v.title)) ? "първо четене" : explain(main.title, main.outcome).kind.toLowerCase();
                  const br = partyBreakdown(main);
                  return (
                    <li key={g.name} className="px-4 py-3">
                      <Link href={g.slug ? `/parlament/zakon/${g.slug}` : `/parlament/glasuvane/${main.id}`} className="font-semibold text-ink no-underline hover:underline line-clamp-2">{g.name}</Link>
                      <div className="flex items-center gap-2 mt-1.5"><OutcomeTag outcome={main.outcome} /><span className="text-xs text-muted">{stage}</span></div>
                      <div className="mt-2"><TallyBar c={tally(main)} height={6} /></div>
                      <p className="text-xs text-muted mt-1.5">{PARTIES.filter((p) => br[p] && partyPosition(br[p]) !== "absent").map((p) => `${partyName(p)}: ${POS[partyPosition(br[p])]}`).join(" · ")}</p>
                    </li>
                  );
                })}
                {groups.size > items.length && <li className="px-4 py-2 text-sm text-muted">и още {groups.size - items.length} теми</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Предстои: законите, приети на първо четене, по които още няма гласуване на второ четене. */
export function Upcoming() {
  const byLaw = new Map<string, { name: string; slug: string; first?: Vote; second: boolean }>();
  for (const v of [...VOTES].reverse()) {
    const law = lawFromTitle(v.title);
    if (!law) continue;
    const g = byLaw.get(law.slug) ?? { name: law.name, slug: law.slug, second: false };
    if (/първо гласуване/.test(v.title) && !/процедура/.test(v.title) && v.outcome !== "rejected") g.first = v;
    if (/второ гласуване/.test(v.title) && g.first && v.date >= g.first.date) g.second = true;
    byLaw.set(law.slug, g);
  }
  const waiting = [...byLaw.values()].filter((g) => g.first && !g.second).sort((a, b) => (a.first!.date < b.first!.date ? 1 : -1));
  return (
    <section className="mb-14">
      <SectionTitle>Предстои: чакат второ четене</SectionTitle>
      <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Тези закони са приети на първо четене, но още не са гласувани окончателно. Между двете четения депутатите внасят предложения, а комисията ги обсъжда. Заседанията са от сряда до петък всяка седмица.</p>
      {waiting.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {waiting.slice(0, 12).map((g) => (
            <li key={g.slug} className="ring-1 ring-rule rounded-sm p-3 bg-white flex justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/parlament/zakon/${g.slug}`} className="font-semibold text-ink no-underline hover:underline line-clamp-2">{g.name}</Link>
                <p className="text-xs text-muted mt-1">Първо четене: {formatDate(g.first!.date)} · {g.first!.tally.yes} за, {g.first!.tally.no} против</p>
              </div>
              <span className="text-xs font-semibold bg-[#e2b33b] text-ink rounded-full px-2.5 py-1 h-fit whitespace-nowrap">чака второ четене</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-[15px]">Няма закони, които чакат второ четене.</p>}
    </section>
  );
}
