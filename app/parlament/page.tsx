import Link from "next/link";
import { KeyNumber, Page, Title, num, pct } from "@/components/ui";
import { MPS, NS, PARLIAMENT_SOURCE, PARTIES, TOPICS, UPDATED_AT, VOTES, formatDate, partyBreakdown, partyName, partyPosition, partyStats } from "@/lib/parliament";
import { VoteList, type VoteRow } from "./VoteList";

export const metadata = { title: "Парламент" };

export default function Parlament() {
  const rows: VoteRow[] = VOTES.map((v) => {
    const br = partyBreakdown(v);
    return {
      id: v.id, date: v.date, title: v.title, topic: v.topic, outcome: v.outcome,
      yes: v.tally.yes, no: v.tally.no, abstain: v.tally.abstain,
      pos: Object.fromEntries(Object.entries(br).map(([p, c]) => [p, partyPosition(c)])),
    };
  });
  const stats = PARTIES.map((p) => ({ p, ...partyStats(p) }));
  const rejected = VOTES.filter((v) => v.outcome === "rejected").length;
  const first = VOTES.at(-1)!.date;
  const last = VOTES[0].date;

  return (
    <Page>
      <Title kicker={`${NS}-то Народно събрание`} lead="Всяко поименно гласуване: кой как гласува, как гласува всяка група и какво е прието.">
        Парламент
      </Title>

      <div className="grid gap-8 sm:grid-cols-3 mb-12">
        <KeyNumber label="Гласувания" value={num(VOTES.length, 0)} note={`от ${formatDate(first)} до ${formatDate(last)}`} />
        <KeyNumber label="Отхвърлени предложения" value={num(rejected, 0)} note={`${pct(rejected / VOTES.length, 0)} от всички гласувания`} />
        <KeyNumber label="Депутати в периода" value={num(MPS.length, 0)} note="включително заместили други" />
      </div>

      <section className="mb-12">
        <div className="flex items-baseline justify-between border-b border-ink pb-2 mb-4">
          <h2 className="text-xl font-bold">Парламентарни групи</h2>
          <Link href="/parlament/partii" className="text-sm">Подробно и сравнение</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] num">
            <thead>
              <tr className="text-left text-sm text-muted border-b border-rule">
                <th className="py-2 font-normal">Група</th>
                <th className="font-normal">Депутати</th>
                <th className="font-normal" title="Дял на гласовете, подадени от членовете на групата, спрямо възможните">Присъствие</th>
                <th className="font-normal" title="Средно колко от присъстващите в групата гласуват като мнозинството ѝ">Единство</th>
                <th className="font-normal" title="Колко често позицията на групата съвпада с крайния резултат">На страната на резултата</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.p} className="border-b border-rule">
                  <td className="py-2"><Link href={`/parlament/partii#${encodeURIComponent(s.p)}`}>{partyName(s.p)}</Link></td>
                  <td>{s.seats}</td>
                  <td>{pct(s.attendance, 0)}</td>
                  <td>{pct(s.unity, 0)}</td>
                  <td>{pct(s.winningShare, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">Броят депутати е по последната известна група и включва заместници, затова сборът е над 240.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold border-b border-ink pb-2 mb-4">Всички гласувания</h2>
        <VoteList rows={rows} parties={PARTIES.map((p) => ({ id: p, name: partyName(p) }))} topics={TOPICS} />
      </section>

      <p className="text-xs text-muted mt-8">
        Източник: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>. Първоизточник: стенограмите на parliament.bg (линк към всяка в страницата на гласуването).
        Обновено: {formatDate(UPDATED_AT)}.
      </p>
    </Page>
  );
}
