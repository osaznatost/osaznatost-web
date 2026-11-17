import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeTag, TallyBar, VOTE_COLOR, VoteBoard, VoteLegend } from "@/components/parliament";
import { Page, SectionTitle, Title } from "@/components/ui";
import { explain } from "@/lib/voteExplain";
import { getLaw } from "@/lib/laws";
import { LawAnalysis, OutcomeList } from "@/components/LawAnalysis";
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

  const ex = explain(v.title, v.outcome);
  const law = getLaw(ex.law?.slug);
  const par = v.title.match(/параграф[ие]?\s+(\d+[а-я]?)/i)?.[1];
  const parNote = law && par ? law.paragraphs?.[par] : undefined;
  const passed = v.outcome !== "rejected";
  // Икономическите последици важат за гласуване по закона като цяло (първо четене или целия закон).
  const whole = ex.kind === "Първо четене" || ex.kind === "Закон";
  const eff = law?.effects;

  return (
    <Page>
      <Title
        small
        back={{ href: "/parlament", label: "Всички гласувания" }}
        kicker={`${formatDate(v.date)} · ${ex.kind}`}
        lead={
          <span className="flex flex-wrap items-center gap-3 text-ink text-base">
            <OutcomeTag outcome={v.outcome} />
            <span className="num">За <b>{v.tally.yes}</b> · Против <b>{v.tally.no}</b> · Въздържал се <b>{v.tally.abstain}</b> · Отсъстващи {v.tally.absent}</span>
          </span>
        }
      >
        {v.title}
      </Title>

      <section className="grid gap-5 lg:grid-cols-3 mb-12">
        <div className="lg:col-span-3 bg-surface rounded-xl p-6">
          <h2 className="display text-[2rem] mb-3">За какво е това гласуване</h2>
          <p className="text-[18px] max-w-3xl">{ex.what}</p>
          {ex.proposer?.id && (
            <p className="text-sm mt-2">Вносител на предложението: <Link href={`/parlament/deputat/${ex.proposer.id}`}>{ex.proposer.name}</Link>{ex.proposer.party ? `, ${ex.proposer.party}` : ""}</p>
          )}
        </div>
        <div className={`rounded-xl p-5 ${passed ? "bg-[#2f9e6a] text-white" : "bg-white ring-1 ring-rule"}`}>
          <p className="font-semibold mb-1">Ако се приеме{passed && ": това се случи"}</p>
          {whole && eff ? <p className="text-xs opacity-80">Процедурно: {ex.ifYes}</p> : <p className="text-[15px]">{ex.ifYes}</p>}
          {whole && eff && <OutcomeList o={eff.ifPassed} onDark={passed} />}
        </div>
        <div className={`rounded-xl p-5 ${!passed ? "bg-[#d2353f] text-white" : "bg-white ring-1 ring-rule"}`}>
          <p className="font-semibold mb-1">Ако се отхвърли{!passed && ": това се случи"}</p>
          {whole && eff ? <p className="text-xs opacity-80">Процедурно: {ex.ifNo}</p> : <p className="text-[15px]">{ex.ifNo}</p>}
          {whole && eff && <OutcomeList o={eff.ifRejected} onDark={!passed} />}
        </div>
        <div className="rounded-xl p-5 bg-white ring-1 ring-rule">
          <p className="font-semibold mb-1">Законът</p>
          {ex.law ? (
            <>
              <p className="text-[15px]"><Link href={`/parlament/zakon/${ex.law.slug}`}>{ex.law.name}</Link>: всички гласувания по него{law ? " и обяснение какво променя" : ""}.</p>
              {!eff && <p className="text-sm text-muted mt-2">Още нямаме анализ какво ще промени този закон на практика. Добавяме ги по реда на важността им.</p>}
              {eff && !whole && <p className="text-sm mt-2">Това гласуване е за част от закона. Какво носи законът като цяло, ако бъде приет или отхвърлен, е описано по-долу.</p>}
            </>
          ) : (
            <p className="text-[15px] text-muted">Гласуването не е по конкретен закон.</p>
          )}
        </div>
      </section>

      {law && (
        <section className="mb-12 max-w-4xl">
          <SectionTitle>Какво променя законът</SectionTitle>
          <p className="text-[17px]">{law.summary}</p>
          {parNote && (
            <div className="mt-4 border-l-4 border-red pl-4">
              <p className="text-sm font-semibold mb-1">Конкретно за § {par}</p>
              <p className="text-[15px]">{parNote}</p>
            </div>
          )}
          <LawAnalysis law={law} hideEffects={whole} />
        </section>
      )}

      <section className="mt-10 max-w-4xl">
        <SectionTitle>Как гласува всяка група</SectionTitle>
        <div className="bg-surface rounded-xl p-5 mb-6"><VoteBoard vote={v} size={12} /></div>
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
        <SectionTitle>Кой как гласува</SectionTitle>
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
        <SectionTitle>Какво печели и какво губи всяка страна</SectionTitle>
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
