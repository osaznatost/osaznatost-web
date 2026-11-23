// Бърз поглед на началната страница: по една карта от основните раздели (парламент, социология, бюджет, цени, новини).
// Всичко е от данните в хранилището и се обновява при всяко качване; няма оценки, само числа с източник.
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import BUDGET from "@/data/budget.json";
import POLLS from "@/data/polls-trend.json";
import { data } from "@/lib/data";
import { latestNews, OUTLETS } from "@/lib/news";
import { formatDate } from "@/lib/parliament";
import { PROGRAM, parsePoint, programIsPast } from "@/lib/program";

const card = "ring-1 ring-rule rounded-lg p-5 bg-white min-w-0 break-words";
const bn = (n: number, d = 1) => `${(n / 1e9).toLocaleString("bg-BG", { maximumFractionDigits: d, minimumFractionDigits: d })} млрд. €`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("bg-BG", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
const MONTHS = ["", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
const STAGE: Record<string, string> = { "първо четене": "1-во четене", "второ четене": "2-ро четене", контрол: "контрол", избор: "избор", решение: "решение", друго: "" };

type Latest = { date: string; cats: Record<string, { name: string; med: number }> };
type Hist = { dates: string[]; cats: Record<string, Record<string, number>> };
type Draft = { year: number; revenue: { total: number }; expenditure: { total: number }; balance: number | null };

async function priceMoves() {
  const [L, H] = await Promise.all([data<Latest>("prices/latest.json"), data<Hist>("prices/history.json")]);
  if (!L || !H) return null;
  // спрямо преди около месец: най-близката дата до 28 дни назад
  const target = new Date(Date.parse(L.date) - 28 * 864e5).toISOString().slice(0, 10);
  const then = [...H.dates].reverse().find((d) => d <= target) ?? H.dates[0];
  const moves = Object.entries(L.cats).flatMap(([id, c]) => {
    const old = H.cats[id]?.[then];
    return old && c.med ? [{ id, name: c.name.replace(/\s*\(.*\)$/, ""), now: c.med, ch: (c.med / old - 1) * 100 }] : [];
  }).filter((x) => Math.abs(x.ch) >= 0.5);
  return { date: L.date, then, up: [...moves].sort((a, b) => b.ch - a.ch).slice(0, 4), down: [...moves].sort((a, b) => a.ch - b.ch).slice(0, 3) };
}

export async function HomeGlance() {
  const B = BUDGET as unknown as { year: number; revenue: { total: number }; expenditure: { total: number }; transfers: { totalEur: number }; euContribution: number; balance: number; execution: { throughMonth: number | null; revenue: { ytdEur: number; annualisedEur: number } | null; expenditure: { ytdEur: number; annualisedEur: number } | null } };
  const [prices, draft, news] = await Promise.all([priceMoves(), data<Draft>("budget-draft.json"), latestNews().catch(() => [])]);
  const past = programIsPast();
  const points = PROGRAM.points.map(parsePoint).filter((p) => p.stage !== "контрол").slice(0, 4);
  const polls = (POLLS as unknown as { polls: { date: string; agency: string; source: string; support: Record<string, number> }[] }).polls;
  const lastPoll = polls.at(-1)!;
  const pollRows = Object.entries(lastPoll.support).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxP = pollRows[0]?.[1] ?? 1;
  const E = B.execution;
  const outlet = (id: string) => OUTLETS.find((o) => o.id === id)?.name ?? id;

  return (
    <section className="mb-16">
      <SectionTitle>Бърз поглед</SectionTitle>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className={card}>
          <p className="font-semibold">{past ? "Парламентът: програмата от миналата седмица" : "Парламентът тази седмица"}</p>
          <p className="text-sm text-muted mb-3">{formatDate(PROGRAM.from)} – {formatDate(PROGRAM.to)}{past && " · новата програма излиза след гласуването ѝ в сряда"}</p>
          <ol className="space-y-2.5 text-[15px]">{points.map((p) => (
            <li key={p.n} className="leading-snug">
              {STAGE[p.stage] && <span className="text-xs font-semibold bg-surface rounded-full px-2 py-0.5 mr-1.5">{STAGE[p.stage]}</span>}
              {p.slug ? <Link href={`/parlament/zakon/${p.slug}`}>{p.title}</Link> : p.title}
            </li>
          ))}</ol>
          <p className="text-sm mt-3"><Link href="/parlament#programa">Цялата програма</Link></p>
        </div>

        <div className={card}>
          <p className="font-semibold">Последно проучване</p>
          <p className="text-sm text-muted mb-3">{lastPoll.agency}, {formatDate(lastPoll.date)} · дял от решилите да гласуват</p>
          <ul className="space-y-1.5 text-[15px]">{pollRows.map(([party, v]) => (
            <li key={party} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3rem] items-center gap-2">
              <span className="truncate">{party}</span>
              <span className="h-2.5 bg-surface rounded-full overflow-hidden"><span className="block h-full bg-green" style={{ width: `${(v / maxP) * 100}%` }} /></span>
              <span className="num text-right">{v.toLocaleString("bg-BG")}%</span>
            </li>
          ))}</ul>
          <p className="text-sm mt-3"><a href={lastPoll.source} target="_blank" rel="noreferrer">Източник</a> · <Link href="/proverki/sotsiologiya">Колко точни са агенциите</Link></p>
        </div>

        <div className={card}>
          <p className="font-semibold">Парите на държавата</p>
          {E.throughMonth && E.revenue && E.expenditure ? (
            <>
              <p className="text-sm text-muted mb-3">Бюджет {B.year}, изпълнение до {MONTHS[E.throughMonth]}</p>
              {([["Приходи", E.revenue, B.revenue.total], ["Разходи с трансферите", E.expenditure, B.expenditure.total + B.transfers.totalEur]] as const).map(([l, x, plan]) => (
                <div key={l} className="mb-3">
                  <div className="flex justify-between text-[15px]"><span>{l}</span><span className="num">{bn(x.ytdEur)} от {bn(plan)}</span></div>
                  <div className="h-2.5 bg-surface rounded-full overflow-hidden mt-1"><div className="h-full bg-green" style={{ width: `${Math.min(100, (x.ytdEur / plan) * 100)}%` }} /></div>
                </div>
              ))}
              <p className="text-[15px]">Планиран дефицит: <b className="num">{bn(-B.balance)}</b>.</p>
            </>
          ) : <p className="text-[15px]">Планиран дефицит за {B.year}: <b className="num">{bn(-B.balance)}</b>.</p>}
          {draft && draft.year === B.year + 1 && (
            <p className="text-[15px] mt-2 bg-surface rounded-sm px-3 py-2">Проектът за {draft.year}: приходи <b className="num">{bn(draft.revenue.total)}</b>{draft.balance !== null && <>, дефицит <b className="num">{bn(-draft.balance)}</b></>}. Още не е приет.</p>
          )}
          <p className="text-sm mt-3"><Link href="/byudzhet">Целият бюджет</Link> · <Link href="/pari/dalg">Дългът</Link></p>
        </div>

        {prices && (prices.up.length > 0 || prices.down.length > 0) && (
          <div className={card}>
            <p className="font-semibold">Цените за месец</p>
            <p className="text-sm text-muted mb-3">Типична цена в магазините, {formatDate(prices.then)} → {formatDate(prices.date)}</p>
            <ul className="space-y-1.5 text-[15px]">
              {prices.up.map((x) => <li key={x.id} className="flex justify-between gap-3"><span>{x.name}</span><span className="num whitespace-nowrap">{x.now.toFixed(2)} € <span className="text-red">{pct(x.ch)}</span></span></li>)}
              {prices.down.map((x) => <li key={x.id} className="flex justify-between gap-3"><span>{x.name}</span><span className="num whitespace-nowrap">{x.now.toFixed(2)} € <span className="text-green">{pct(x.ch)}</span></span></li>)}
            </ul>
            <p className="text-sm mt-3"><Link href="/ceni">Цени по вериги и градове</Link> · <Link href="/ceni/nadcenki">Надценки</Link></p>
          </div>
        )}

        {news.length > 0 && (
          <div className={`${card} lg:col-span-2`}>
            <p className="font-semibold mb-3">Последните новини</p>
            <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 text-[15px]">{news.slice(0, 8).map((n) => (
              <li key={n.url} className="leading-snug"><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a> <span className="text-sm text-muted">· {outlet(n.outlet)}</span></li>
            ))}</ul>
            <p className="text-sm mt-3"><Link href="/novini">Всички новини и къде на сайта има данни по темата</Link></p>
          </div>
        )}
      </div>
    </section>
  );
}
