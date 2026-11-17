import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeTag, TallyBar, VOTE_COLOR, VoteLegend } from "@/components/parliament";
import { Page } from "@/components/ui";
import { MPS, PARLIAMENT_SOURCE, PARTIES, TOPICS, VOTES, VOTE_LABEL, type VoteCode, formatDate, getVote, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";

export function generateStaticParams() {
  return VOTES.map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = getVote((await params).id);
  return { title: v?.title ? v.title.slice(0, 80) : "Гласуване" };
}

const POS: Record<string, string> = { y: "За", n: "Против", a: "Въздържал се", split: "Разделени", absent: "Отсъства" };

export default async function Glasuvane({ params }: { params: Promise<{ id: string }> }) {
  const v = getVote((await params).id);
  if (!v) notFound();
  const br = partyBreakdown(v);
  const parties = PARTIES.filter((p) => br[p]);
  const order: VoteCode[] = ["y", "n", "a", "x"];

  return (
    <Page>
      <p className="text-sm mb-3"><Link href="/parlament">← Всички гласувания</Link></p>
      <p className="text-sm text-muted mb-2">{formatDate(v.date)} · точка {v.item} · {TOPICS[v.topic] ?? v.topic}</p>
      <h1 className="text-2xl sm:text-3xl font-bold leading-snug max-w-4xl">{v.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <OutcomeTag outcome={v.outcome} />
        <span className="num">За <b>{v.tally.yes}</b> · Против <b>{v.tally.no}</b> · Въздържал се <b>{v.tally.abstain}</b> · Отсъстващи {v.tally.absent}</span>
      </div>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-xl font-bold border-b border-ink pb-2 mb-4">Как гласува всяка група</h2>
        <VoteLegend />
        <div className="mt-4 space-y-4">
          {parties.map((p) => {
            const c = br[p];
            return (
              <div key={p}>
                <div className="flex justify-between gap-4 text-[15px] mb-1">
                  <span className="font-semibold">{partyName(p)}</span>
                  <span className="num text-muted">
                    <b className="text-ink">{POS[partyPosition(c)]}</b> · {c.y} за, {c.n} против, {c.a} въздържал се, {c.x} отсъстват
                  </span>
                </div>
                <TallyBar c={c} height={12} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold border-b border-ink pb-2 mb-4">Кой как гласува</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {parties.map((p) => (
            <div key={p}>
              <h3 className="font-semibold mb-2">{partyName(p)}</h3>
              <ul className="text-[15px]">
                {MPS.map((m, i) => ({ m, c: v.v[i] as VoteCode }))
                  .filter(({ m, c }) => m.party === p && c !== "-")
                  .sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c) || a.m.name.localeCompare(b.m.name, "bg"))
                  .map(({ m, c }) => (
                    <li key={m.id} className="flex justify-between gap-3 py-1 border-b border-rule">
                      <Link href={`/parlament/deputat/${m.id}`} className="text-ink no-underline hover:underline">{m.name}</Link>
                      <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: VOTE_COLOR[c] }} />{VOTE_LABEL[c]}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-3xl text-[15px]">
        <h2 className="text-xl font-bold border-b border-ink pb-2 mb-3">Какво печели и какво губи всяка страна</h2>
        <p className="text-muted">
          За всеки важен закон ще добавяме мотивите на вносителите, становищата на критиците и какво казват данните, с източник за всеки аргумент.
        </p>
      </section>

      <p className="text-xs text-muted mt-10">
        {v.pdf && <>Стенограма: <a href={v.pdf} target="_blank" rel="noreferrer">parliament.bg (PDF)</a>. </>}
        Данни: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>.
      </p>
    </Page>
  );
}
