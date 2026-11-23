import Link from "next/link";
import { OutcomeTag, TallyBar } from "@/components/parliament";
import { SectionTitle } from "@/components/ui";
import { FAILED_SITTINGS, PARTIES, VOTES, type Vote, formatDate, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";
import { explain, lawFromTitle } from "@/lib/voteExplain";
import { PROGRAM, PROGRAM_HISTORY, billUrl, parsePoint } from "@/lib/program";
import { Term } from "@/components/Term";

const POS: Record<string, string> = { y: "за", n: "против", a: "въздържал се", split: "разделени", absent: "отсъства" };
const tally = (v: Vote) => {
  const br = partyBreakdown(v);
  return Object.values(br).reduce((s, c) => ({ y: s.y + c.y, n: s.n + c.n, a: s.a + c.a, x: s.x + c.x }), { y: 0, n: 0, a: 0, x: 0 });
};

/** Последните заседания: гласуванията по закони, групирани по ден и закон, без процедурните. */
export function RecentSittings({ days = 3 }: { days?: number }) {
  const dates = [...new Set(VOTES.map((v) => v.date))].sort().reverse().slice(0, days);
  return (
    <section id="zasedaniya" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
      <SectionTitle right={<a href="#vsichki">Всички гласувания</a>}>Последните заседания</SectionTitle>
      {(() => {
        const lag = Math.round((Date.parse(PROGRAM.from) - Date.parse(dates[0])) / 86400000);
        return lag > 10 ? <p className="text-sm bg-[#fbecc4] rounded-sm px-3 py-2 -mt-2 mb-4 max-w-3xl">Последните публикувани поименни гласувания са от {formatDate(dates[0])} Обновяваме всеки ден от parliament.bg.</p> : null;
      })()}
      {FAILED_SITTINGS.length > 0 && <p className="text-sm text-muted -mt-2 mb-4">Провалени заседания (няма кворум, не е гласувано нищо): {FAILED_SITTINGS.map(formatDate).join(", ")}</p>}
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
                      <p className="hidden sm:block text-xs text-muted mt-1.5">{PARTIES.filter((p) => br[p] && partyPosition(br[p]) !== "absent").map((p) => `${partyName(p)}: ${POS[partyPosition(br[p])]}`).join(" · ")}</p>
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
  const upItem = (g: { name: string; slug: string; first?: Vote }) => (
    <li key={g.slug} className="ring-1 ring-rule rounded-sm p-3 bg-white flex justify-between gap-3">
      <div className="min-w-0">
        <Link href={`/parlament/zakon/${g.slug}`} className="font-semibold text-ink no-underline hover:underline line-clamp-2">{g.name}</Link>
        <p className="text-xs text-muted mt-1">Първо четене: {formatDate(g.first!.date)} · {g.first!.tally.yes} за, {g.first!.tally.no} против</p>
      </div>
      <span className="text-xs font-semibold bg-[#e2b33b] text-ink rounded-full px-2.5 py-1 h-fit whitespace-nowrap">чака второ четене</span>
    </li>
  );
  const waiting = [...byLaw.values()].filter((g) => g.first && !g.second).sort((a, b) => (a.first!.date < b.first!.date ? 1 : -1));
  return (
    <section id="predstoi" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
      <SectionTitle>Предстои: чакат второ четене</SectionTitle>
      <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Тези закони са приети на <Term k="parvo-chetene">първо четене</Term>, но още не са гласувани окончателно на <Term k="vtoro-chetene">второ четене</Term>. Между двете четения депутатите внасят предложения, а комисията ги обсъжда. Заседанията са от сряда до петък всяка седмица.</p>
      {waiting.length ? (
        <>
          <ul className="grid gap-3 md:grid-cols-2">{waiting.slice(0, 6).map(upItem)}</ul>
          {waiting.length > 6 && (
            <details className="mt-3 group">
              <summary className="cursor-pointer font-semibold text-green list-none">Покажи още {Math.min(waiting.length, 12) - 6}</summary>
              <ul className="grid gap-3 md:grid-cols-2 mt-3">{waiting.slice(6, 12).map(upItem)}</ul>
            </details>
          )}
        </>
      ) : <p className="text-[15px]">Няма закони, които чакат второ четене.</p>}
    </section>
  );
}

const STAGE_STYLE: Record<string, string> = {
  "първо четене": "bg-[#dbe7f3] text-[#1d4a73]",
  "второ четене": "bg-[#e2b33b] text-ink",
  избор: "bg-[#ece3f2] text-[#5b3a73]",
  контрол: "bg-surface text-muted",
  решение: "bg-surface text-ink",
  друго: "bg-surface text-ink",
};

/** Програмата за седмицата от parliament.bg. */
export function WeekProgram() {
  const p = PROGRAM;
  const pts = p.points.map(parsePoint);
  const range = `${formatDate(p.from)} – ${formatDate(p.to)}`;
  // новата програма се публикува едва след гласуването ѝ в сряда; дотогава показваме миналата с ясен надпис
  const past = p.to < new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10);
  const point = (x: ReturnType<typeof parsePoint>) => (
          <li key={x.n} className="px-4 py-3 grid grid-cols-[2rem_1fr] gap-x-2">
            <span className="text-muted font-semibold tabular-nums">{x.n}.</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${STAGE_STYLE[x.stage]}`}>{x.stage === "първо четене" ? <Term k="parvo-chetene">{x.stage}</Term> : x.stage === "второ четене" ? <Term k="vtoro-chetene">{x.stage}</Term> : x.stage}</span>
                {x.day && <span className="text-xs text-muted">{x.day}</span>}
                {x.analysed && <span className="text-xs font-semibold text-[#1f5c2a]">има анализ</span>}
              </div>
              {x.slug ? <Link href={`/parlament/zakon/${x.slug}`} className="font-semibold text-ink">{x.title}</Link> : <p className="font-semibold">{x.title}</p>}
              {x.sponsors && <p className="hidden sm:block text-sm text-muted mt-0.5">Вносители: {x.sponsors}{x.firstReading ? ` · първо четене на ${x.firstReading}` : ""}</p>}
              {x.acts.length > 0 && (
                <p className="hidden sm:block text-sm mt-1">{x.acts.length === 1 ? "Законопроект" : `${x.acts.length} законопроекта`}: {x.acts.map((a, i) => <span key={a.id}>{i > 0 && ", "}<a href={billUrl(a.id)} target="_blank" rel="noreferrer">{a.sign}</a></span>)}</p>
              )}
            </div>
          </li>
  );
  return (
    <section id="programa" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
      <SectionTitle right={<a href={p.source} target="_blank" rel="noreferrer">parliament.bg</a>}>{past ? "Програмата от миналата седмица" : "Програмата за седмицата"}</SectionTitle>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 -mt-3 mb-4 text-[15px]">
        <span className="font-semibold">{range}</span>
        {p.time.length === 2 && <span className="text-muted">заседания от {p.time[0]} до {p.time[1]} ч.</span>}
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${p.approved ? "bg-[#d7ecd9] text-[#1f5c2a]" : "bg-[#fbecc4] text-ink"}`}>{p.approved ? "приета програма" : "проект, предстои гласуване"}</span>
      </div>
      {!p.approved && <p className="text-sm text-muted -mt-2 mb-4 max-w-3xl">В сряда сутрин депутатите гласуват програмата. Редът може да се промени и да се добавят точки.</p>}
      {past && <p className="text-sm -mt-2 mb-4 max-w-3xl bg-surface px-3 py-2">Програмата за тази седмица още не е публикувана. Парламентът я пуска след като депутатите я гласуват, обикновено в сряда сутрин. Тук ще се появи до няколко часа след това.</p>}
      <ol className="ring-1 ring-rule rounded-sm bg-white divide-y divide-rule">{pts.slice(0, 5).map(point)}</ol>
      {pts.length > 5 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-green">Цялата програма (още {pts.length - 5} точки)</summary>
          <ol className="mt-3 ring-1 ring-rule rounded-sm bg-white divide-y divide-rule">{pts.slice(5).map(point)}</ol>
        </details>
      )}
      {PROGRAM_HISTORY.length > 1 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Предишни седмици ({PROGRAM_HISTORY.length - 1})</summary>
          <div className="mt-3 space-y-4">
            {PROGRAM_HISTORY.filter((h) => h.from !== p.from).map((h) => (
              <div key={h.from}>
                <p className="font-semibold">{formatDate(h.from)} – {formatDate(h.to)}</p>
                <ul className="text-sm list-disc pl-5">{h.points.map(parsePoint).map((x) => <li key={x.n}><span className="text-muted">{x.stage}:</span> {x.slug ? <Link href={`/parlament/zakon/${x.slug}`}>{x.title}</Link> : x.title}</li>)}</ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
