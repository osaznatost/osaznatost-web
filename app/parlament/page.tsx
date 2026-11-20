import Link from "next/link";
import { KeyNumber, Page, Title, num, pct, SectionTitle } from "@/components/ui";
import { currentSeats, MPS, NS, PARLIAMENT_SOURCE, PARTIES, TOPICS, UPDATED_AT, VOTES, formatDate, partyBreakdown, partyName, partyPosition, partyStats } from "@/lib/parliament";
import { VoteList, type VoteRow } from "./VoteList";
import { Hemicycle } from "@/components/Hemicycle";
import { PartyBadge } from "@/components/PartyBadge";
import { partyByGroup } from "@/lib/partyMeta";
import { RecentSittings, Upcoming, WeekProgram } from "./Recent";
import { SectionNav } from "@/components/SectionNav";

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

      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 mb-12 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <KeyNumber label="Гласувания" value={num(VOTES.length, 0)} note={`от ${formatDate(first)} до ${formatDate(last)}`} />
        <KeyNumber label="Отхвърлени предложения" value={num(rejected, 0)} note={`${pct(rejected / VOTES.length, 0)} от всички гласувания`} />
        <KeyNumber label="Депутати в периода" value={num(MPS.length, 0)} note="включително заместили други" />
      </div>

      <Link href="/parlament/signali" className="block ring-2 ring-red rounded-sm p-4 mb-10 bg-white no-underline text-ink hover:ring-4">
        <p className="font-semibold text-lg">Сигнали: текстове, добавени на второ четене →</p>
        <p className="text-[15px] text-muted">Нови параграфи, особено в преходните и заключителните разпоредби, където често се променят други закони в полза на тесен кръг. Кой ги подкрепя.</p>
      </Link>
      <p className="mb-8 -mt-4 text-[15px]"><Link href="/parlament/zakoni" className="font-semibold">Всички закони: етап, вносители, двете страни и сигнали</Link> · <Link href="/vlast">Властта накратко</Link> · <Link href="/parlament/predishni">Предишните парламенти (49–51)</Link> · <Link href="/parlament/zayaveno">Заявено и гласувано</Link> · <Link href="/mnenie">Твоето мнение за законите</Link></p>
      <SectionNav items={[["programa", "Седмицата"], ["zasedaniya", "Заседания"], ["predstoi", "Предстои"], ["grupi", "Групи"], ["vsichki", "Всички гласувания"]]} />
      <WeekProgram />
      <RecentSittings />
      <Upcoming />

      <section id="grupi" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle right={<Link href="/parlament/partii">Подробно и сравнение</Link>}>Парламентарни групи</SectionTitle>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
        <Hemicycle groups={currentSeats()} />
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
                  <td className="py-2"><Link href={partyByGroup(s.p) ? `/parlament/partiya/${partyByGroup(s.p)!.slug}` : `/parlament/partii#${encodeURIComponent(s.p)}`} className="inline-flex items-center gap-2"><PartyBadge p={s.p} size={22} />{partyName(s.p)}</Link></td>
                  <td>{s.seats}</td>
                  <td>{pct(s.attendance, 0)}</td>
                  <td>{pct(s.unity, 0)}</td>
                  <td>{pct(s.winningShare, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
        <p className="text-xs text-muted mt-2">Полукръгът показва действащите депутати към последното гласуване. В таблицата броят е по последната известна група и включва заместници, затова сборът е над 240.</p>
      </section>

      <section id="vsichki" className="scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Всички гласувания</SectionTitle>
        <VoteList rows={rows} parties={PARTIES.map((p) => ({ id: p, name: partyName(p) }))} topics={TOPICS} />
      </section>

      <p className="text-xs text-muted mt-8">
        Източник: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>. Първоизточник: стенограмите на parliament.bg (линк към всяка в страницата на гласуването).
        Обновено: {formatDate(UPDATED_AT)}
      </p>
    </Page>
  );
}
