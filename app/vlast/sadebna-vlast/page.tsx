import Link from "next/link";
import { Page, SectionTitle, Title } from "@/components/ui";
import { PARTIES, VOTES, partyBreakdown, partyName, type PartyCount } from "@/lib/parliament";

export const metadata = { title: "Съдебната власт: кой е избран във Висшия съдебен съвет и кой как гласува" };

const VSS = /Висшия съдебен съвет/;
type Row = { id: string; date: string; who: string; college: "съдийската" | "прокурорската"; yes: number; no: number; abstain: number; passed: boolean; groups: Record<string, PartyCount> };

function rows(): Row[] {
  return VOTES.filter((v) => VSS.test(v.title) && /избира\s+/.test(v.title) && !/процедур/i.test(v.title)).map((v) => ({
    id: v.id, date: v.date, who: v.title.split(/избира\s+/).pop()!.trim(),
    college: /прокурорската/.test(v.title) ? "прокурорската" : "съдийската",
    yes: v.tally.yes, no: v.tally.no, abstain: v.tally.abstain, passed: v.outcome.startsWith("passed"), groups: partyBreakdown(v),
  }));
}
const pos = (c?: PartyCount) => {
  if (!c) return "–";
  const p = c.y + c.n + c.a;
  if (!p) return "отсъства";
  return c.y === p ? "за" : c.n === p ? "против" : c.a === p ? "въздържали се" : `${c.y} за, ${c.n} против${c.a ? `, ${c.a} възд.` : ""}`;
};

export default function SadebnaVlast() {
  const all = rows();
  const dates = [...new Set(all.map((r) => r.date))].sort().reverse();
  const groups = PARTIES.filter((p) => p !== "independent" && p !== "Независими").slice(0, 8);
  return (
    <Page>
      <Title back={{ href: "/vlast", label: "Властта" }} kicker="Власт"
        lead="Висшият съдебен съвет назначава, повишава и наказва съдиите и прокурорите и избира главния прокурор. 11 от членовете му избира парламентът (6 в съдийската и 5 в прокурорската колегия), останалите — самите съдии, прокурори и следователи. Тук е как гласува всяка група за всеки кандидат от парламентарната квота.">
        Съдебната власт: изборът на ВСС
      </Title>
      <p className="text-[15px] mb-8 max-w-3xl bg-surface rounded-sm p-4">За да бъде избран член на ВСС от парламента, трябват поне <b>160 гласа „за“</b> — две трети от всички 240 депутати (по Конституцията и Закона за съдебната власт). Кандидат с повече „за“, отколкото „против“, но под 160, <b>не е избран</b>.</p>
      {dates.map((d) => (
        <section key={d} className="mb-12">
          <SectionTitle>Гласуване на {new Date(d).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}</SectionTitle>
          {(["съдийската", "прокурорската"] as const).map((col) => {
            const rs = all.filter((r) => r.date === d && r.college === col).sort((a, b) => b.yes - a.yes);
            if (!rs.length) return null;
            return (
              <div key={col} className="mb-8">
                <h3 className="font-semibold mb-2">Кандидати за {col} колегия</h3>
                <div className="overflow-x-auto">
                  <table data-nostack className="w-full text-[14px] border-collapse">
                    <thead><tr className="text-left border-b border-rule"><th className="py-1 pr-3">Кандидат</th><th className="py-1 px-2 num">За</th><th className="py-1 px-2">Избран</th>{groups.map((g) => <th key={g} className="py-1 px-2 whitespace-nowrap">{partyName(g)}</th>)}</tr></thead>
                    <tbody>{rs.map((r) => (
                      <tr key={r.id} className="border-b border-rule align-top">
                        <td className="py-1 pr-3"><Link href={`/parlament/glasuvane/${r.id}`}>{r.who}</Link></td>
                        <td className="py-1 px-2 num">{r.yes}<span className="block text-xs text-muted">против {r.no}</span></td>
                        <td className="py-1 px-2">{r.passed ? "да" : <span className="text-muted">не</span>}</td>
                        {groups.map((g) => <td key={g} className="py-1 px-2 text-xs">{pos(r.groups[g])}</td>)}
                      </tr>))}</tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {!dates.length && <p className="text-muted">Няма гласувания за ВСС в текущото Народно събрание.</p>}
      <p className="text-xs text-muted">Източник: поименните гласувания на Народното събрание (parliament.bg). Изборът от професионалните квоти (съдии, прокурори, следователи) се прави от общите им събрания и не е тук.</p>
    </Page>
  );
}
