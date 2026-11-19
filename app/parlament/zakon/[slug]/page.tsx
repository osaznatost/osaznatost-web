import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeTag } from "@/components/parliament";
import { Page, SectionTitle, Title } from "@/components/ui";
import { getLaw } from "@/lib/laws";
import { LawAnalysis } from "@/components/LawAnalysis";
import { PARTIES, VOTES, formatDate, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";
import { explain, lawFromTitle } from "@/lib/voteExplain";
import { billsForLaw, type Bill } from "@/lib/bills";
import { lawSignals, type LawSignal } from "@/lib/lawSignals";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Term } from "@/components/Term";

function lawVotes(slug: string) {
  return VOTES.filter((v) => lawFromTitle(v.title)?.slug === slug).sort((a, b) => (a.date === b.date ? a.item - b.item : a.date < b.date ? -1 : 1));
}

export function generateStaticParams() {
  const slugs = new Set<string>();
  for (const v of VOTES) {
    const l = lawFromTitle(v.title);
    if (l) slugs.add(l.slug);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const v = lawVotes((await params).slug)[0];
  return { title: v ? lawFromTitle(v.title)!.name : "Закон" };
}

const POS: Record<string, string> = { y: "За", n: "Против", a: "Въздържал се", split: "Разделени", absent: "Отсъства" };

export default async function Zakon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const votes = lawVotes(slug);
  if (!votes.length) notFound();
  const name = lawFromTitle(votes[0].title)!.name;
  const law = getLaw(slug);
  const first = votes.filter((v) => /първо гласуване/.test(v.title) && !/процедура/.test(v.title));
  const passedCount = votes.filter((v) => v.outcome !== "rejected").length;

  // Колко често всяка група е гласувала "за" по този закон
  const partyYes = PARTIES.map((p) => {
    let y = 0, n = 0, total = 0;
    for (const v of votes) {
      const pos = partyPosition(partyBreakdown(v)[p] ?? { y: 0, n: 0, a: 0, x: 0 });
      if (pos === "absent") continue;
      total++;
      if (pos === "y") y++;
      if (pos === "n") n++;
    }
    return { p, y, n, total };
  });

  const voteRow = (v: (typeof votes)[number]) => {
            const ex = explain(v.title, v.outcome);
            const br = partyBreakdown(v);
            return (
              <li key={v.id} className="border-b border-rule py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/parlament/glasuvane/${v.id}`} className="text-ink no-underline hover:underline">{v.title.replace(name, "").replace(/^ЗИД на\s*/, "").replace(/^[\s–-]+/, "") || v.title}</Link>
                  <OutcomeTag outcome={v.outcome} />
                </div>
                <p className="text-sm text-muted mt-1">
                  {formatDate(v.date)} · {ex.kind} · {PARTIES.filter((p) => br[p]).map((p) => `${partyName(p)}: ${POS[partyPosition(br[p])]}`).join(" · ")}
                </p>
              </li>
            );
  };
  const bills = billsForLaw(slug);
  const signals = lawSignals(votes, bills);
  const nav: [string, string][] = [["nakratko", "Накратко"], ...(signals.length ? [["signali", `Сигнали (${signals.length})`] as [string, string]] : []), ...(bills.length ? [["zakonoproekti", "Кой внесе и кой се изказа"] as [string, string]] : []), ...(law?.motives || law?.critics ? [["argumenti", "Двете страни"] as [string, string]] : []), ["grupi", "Как гласуваха"], ["glasuvaniya", `Гласувания (${votes.length})`]];

  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Закон" lead={law?.status ?? statusLine(votes, bills)}>
        {name}
      </Title>
      <SectionNav items={nav} />

      <Anchor id="nakratko" title="Накратко">
        {law ? (
          <div className="max-w-4xl">
            <p className="text-[17px]">{law.summary}</p>
            {law.sponsors && <p className="mt-3 text-[15px]"><b>Вносители:</b> {law.sponsors}{law.bill && <> · <a href={law.bill.url} target="_blank" rel="noreferrer">законопроект {law.bill.sign}</a></>}</p>}
            {law.whatHappened && <p className="mt-3 text-[15px]"><b>Какво се случи:</b> {law.whatHappened}</p>}
          </div>
        ) : (
          <div className="max-w-4xl bg-surface p-5 rounded-sm text-[15px] space-y-2">
            <p>Обяснението на съдържанието (какво променя, кого засяга, какво казват вносителите и критиците) се подготвя от мотивите, докладите на комисиите, становищата и дебата в залата.</p>
            {bills[0] && <p>Междувременно: законопроектът е внесен на {formatDate(bills[0].date)} от {bills[0].byGov ? "Министерския съвет" : who(bills[0])}. Пълният текст и мотивите са в <a href={bills[0].url} target="_blank" rel="noreferrer">parliament.bg</a>.</p>}
          </div>
        )}
      </Anchor>

      {signals.length > 0 && (
        <Anchor id="signali" title="Сигнали" lead="Автоматично открити особености в начина, по който е приет законът. Не са доказателство за нарушение, а повод текстът да се прочете внимателно.">
          <ul className="grid gap-3 md:grid-cols-2 max-w-5xl">{signals.map((x) => <SignalCard key={x.title} s={x} />)}</ul>
          <p className="text-sm mt-3"><Link href="/parlament/signali">Всички сигнали в парламента</Link></p>
        </Anchor>
      )}

      {bills.length > 0 && (
        <Anchor id="zakonoproekti" title="Кой внесе и кой се изказа" lead={<>Законопроектите, с които е променян законът в този парламент: вносители, комисии, становища на външни организации и обсъжданията в залата.</>}>
          <ul className="space-y-4 max-w-5xl">{bills.slice(0, 2).map((b) => <BillCard key={b.id} b={b} />)}</ul>
          {bills.length > 2 && (
            <details className="mt-3 max-w-5xl">
              <summary className="cursor-pointer font-semibold text-green py-2">Още {bills.length - 2} законопроекта по този закон</summary>
              <ul className="space-y-4 mt-2">{bills.slice(2, 12).map((b) => <BillCard key={b.id} b={b} />)}</ul>
            </details>
          )}
        </Anchor>
      )}

      {law && <div id="argumenti" className="scroll-mt-32 lg:scroll-mt-20 max-w-4xl"><LawAnalysis law={law} /></div>}

      <section id="grupi" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Как гласуваха групите по този закон</SectionTitle>
        <p className="text-sm text-muted mb-3">Брой гласувания, в които мнозинството в групата е било „за“ или „против“, от общо {votes.length}. Прието: {passedCount}, отхвърлено: {votes.length - passedCount}.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partyYes.filter((x) => x.total > 0).map((x) => (
            <div key={x.p} className="border border-rule rounded-sm p-4">
              <p className="font-semibold">{partyName(x.p)}</p>
              <p className="num text-sm mt-1">За: <b>{x.y}</b> · Против: <b>{x.n}</b> · общо {x.total}</p>
            </div>
          ))}
        </div>
        {first.length > 0 && <p className="text-sm mt-3">Първо четене: {first.map((v) => <Link key={v.id} href={`/parlament/glasuvane/${v.id}`}>{formatDate(v.date)}</Link>)}</p>}
      </section>

      <section id="glasuvaniya" className="scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Всички гласувания по закона</SectionTitle>
        <ul>{votes.slice(0, 15).map(voteRow)}</ul>
        {votes.length > 15 && (
          <details className="mt-2">
            <summary className="cursor-pointer font-semibold text-green py-2">Покажи още {votes.length - 15} гласувания</summary>
            <ul>{votes.slice(15).map(voteRow)}</ul>
          </details>
        )}
      </section>
    </Page>
  );
}

function who(b: Bill) {
  if (!b.sponsors.length) return "депутати";
  return b.sponsors.length > 3 ? `${b.sponsors.slice(0, 3).join(", ")} и още ${b.sponsors.length - 3} депутати` : b.sponsors.join(", ");
}

function statusLine(votes: { date: string; title: string; outcome: string }[], bills: Bill[]) {
  const done = bills.find((b) => b.dv);
  if (done) return `Приет${done.adopted ? ` на ${formatDate(done.adopted)}` : ""}, обнародван в ${done.dv}`;
  const second = votes.some((v) => /второ гласуване/i.test(v.title));
  return `${votes.length} гласувания в 52-рото Народно събрание${second ? "" : " · само първо четене засега"}`;
}

const LEVEL = { high: "border-red bg-[#fdeff1]", mid: "border-[#e08a2e] bg-[#fdf3e6]", info: "border-rule bg-surface" };
function SignalCard({ s }: { s: LawSignal }) {
  return (
    <li className={`border-l-4 rounded-sm p-4 ${LEVEL[s.level]}`}>
      <p className="font-semibold">{s.title}</p>
      <p className="text-[15px] text-muted mt-1">{s.text}</p>
    </li>
  );
}

function BillCard({ b }: { b: Bill }) {
  return (
    <li className="ring-1 ring-rule rounded-sm bg-white p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <a href={b.url} target="_blank" rel="noreferrer" className="font-semibold text-ink">{b.title}</a>
        <span className="text-sm text-muted num whitespace-nowrap">№ {b.sign}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
        <dt className="text-muted">Внесен</dt><dd>{formatDate(b.date)} от {b.byGov ? "Министерския съвет" : who(b)}{b.withdrawn && <b className="text-red"> · оттеглен</b>}</dd>
        {b.committees.length > 0 && <><dt className="text-muted">Комисии</dt><dd>{b.committees.join("; ")}</dd></>}
        {b.opinions.length > 0 && <><dt className="text-muted">Становища</dt><dd>{b.opinions.map((o) => o.title).join("; ")}</dd></>}
        {(b.notes?.votes.length ?? 0) > 0 && <><dt className="text-muted">В комисията</dt><dd>{b.notes!.votes.map((v, i) => <span key={i}>{i > 0 && "; "}{v.committee.replace(/^Комисия (по|за) /, "")}, {v.stage}: {v.yes} за, {v.no} против{v.abst ? `, ${v.abst} въздържал се` : ""}</span>)}</dd></>}
        {(b.notes?.conflict.length ?? 0) > 0 && <><dt className="text-red font-semibold">Конфликт на интереси</dt><dd>{b.notes!.conflict[0]}</dd></>}
        {(b.notes?.against.length ?? 0) > 0 && <><dt className="text-muted">Несъгласие</dt><dd>{b.notes!.against[0]}</dd></>}
        {b.proposals > 0 && <><dt className="text-muted">Предложения</dt><dd>{b.proposals} писмени предложения на депутати между <Term k="parvo-chetene">първо</Term> и <Term k="vtoro-chetene">второ четене</Term></dd></>}
        {b.hall.length > 0 && <><dt className="text-muted">В залата</dt><dd>{b.hall.filter((h, i, a) => a.findIndex((x) => x.url === h.url && x.stage === h.stage) === i).map((h, i) => <span key={i}>{i > 0 && ", "}<a href={h.url} target="_blank" rel="noreferrer">{formatDate(h.date)}</a> ({h.stage})</span>)}</dd></>}
        {b.dv && <><dt className="text-muted">Обнародван</dt><dd>{b.dv}{b.adopted && `, приет на ${formatDate(b.adopted)}`}</dd></>}
      </dl>
    </li>
  );
}
