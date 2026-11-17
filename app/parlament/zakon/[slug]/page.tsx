import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeTag } from "@/components/parliament";
import { Page, SectionTitle, Title } from "@/components/ui";
import { getLaw } from "@/lib/laws";
import { PARTIES, VOTES, formatDate, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";
import { explain, lawFromTitle } from "@/lib/voteExplain";

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

  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Закон" lead={law?.status ?? `${votes.length} гласувания в 52-рото Народно събрание`}>
        {name}
      </Title>

      {law ? (
        <section className="mb-12 max-w-4xl">
          <SectionTitle>Какво променя</SectionTitle>
          <p className="text-[17px]">{law.summary}</p>
          {law.sponsors && <p className="mt-3 text-[15px]"><b>Вносители:</b> {law.sponsors}{law.bill && <> · <a href={law.bill.url} target="_blank" rel="noreferrer">законопроект {law.bill.sign}</a></>}</p>}
          {law.whatHappened && <p className="mt-3 text-[15px]"><b>Какво се случи:</b> {law.whatHappened}</p>}
          {law.sides && (
            <div className="grid gap-4 sm:grid-cols-3 mt-6">
              {law.sides.map((s) => (
                <div key={s.who} className="bg-surface p-4 rounded-sm">
                  <p className="text-sm font-semibold mb-1">{s.who}</p>
                  <p className="text-[15px]">{s.argument}</p>
                </div>
              ))}
            </div>
          )}
          {law.checks && (
            <div className="mt-8">
              <h3 className="display text-[1.8rem] mb-3">Проверени твърдения</h3>
              <ul className="space-y-3">
                {law.checks.map((c) => (
                  <li key={c.claim} className="rounded-xl ring-1 ring-rule p-4 bg-white">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{c.claim}</p>
                      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${c.verdict === "Вярно" ? "bg-[#2f9e6a] text-white" : c.verdict === "Невярно" ? "bg-[#d2353f] text-white" : "bg-[#e2b33b] text-ink"}`}>{c.verdict}</span>
                    </div>
                    <p className="text-[15px] text-muted mt-1">{c.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted mt-4">{law.note} Източници: {law.sources.map((src, i) => (
            <span key={src.url}>{i > 0 && ", "}<a href={src.url} target="_blank" rel="noreferrer">{src.title}</a></span>
          ))}</p>
        </section>
      ) : (
        <section className="mb-12 max-w-4xl bg-surface p-5 rounded-sm">
          <p className="text-[15px]">Още нямаме обяснение на съдържанието на този закон. Подреждаме гласуванията по него по-долу. Обясненията добавяме постепенно, като започваме от законите с най-голямо значение.</p>
        </section>
      )}

      <section className="mb-12">
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

      <section>
        <SectionTitle>Всички гласувания по закона</SectionTitle>
        <ul>
          {votes.map((v) => {
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
          })}
        </ul>
      </section>
    </Page>
  );
}
