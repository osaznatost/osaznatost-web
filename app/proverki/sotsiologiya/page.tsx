import Link from "next/link";
import { MultiLine } from "@/components/Charts";
import { PollTrend } from "@/components/PollTrend";
import { TrustPolls } from "@/components/TrustPolls";
import { Page, SectionTitle, Title } from "@/components/ui";
import P from "@/data/polls.json";
import { paidTo } from "@/lib/payments";

export const metadata = { title: "Социология: кой колко точно предсказва изборите" };

type Ag = { id: string; name: string; eik: string | null; site: string | null; polls: number; pre: number; elections: number; mae: number; maeAdj: number; barrier: number; history: [string, number][]; bias: [string, number, number][] };
type El = { date: string; actual: [string, number][]; polls: { id: string; end: string; days: number; n: number | null; errors: [string, number, number, number][] }[] };
const D = P as unknown as { source: string; generatedAt: string; agencies: Ag[]; elections: El[] };
const pp = (v: number) => { const r = Math.round(v * 10) / 10; return `${r > 0 ? "+" : ""}${(r === 0 ? 0 : r).toLocaleString("bg-BG", { maximumFractionDigits: 1 })}`; };
const dd = (s: string) => s.split("-").reverse().join(".");

export default function Sotsiologiya() {
  const names = Object.fromEntries(D.agencies.map((a) => [a.id, a.name]));
  const last = D.elections[0];
  return (
    <Page>
      <Title back={{ href: "/proverki", label: "Проверки" }} kicker="Обществени нагласи"
        lead="Колко точно социологическите агенции са предсказали изборите: последното им проучване преди всеки вот срещу резултата на ЦИК. Не оценяваме намерения, само числата.">
        Кой колко точно предсказва
      </Title>
      <section className="mb-12">
        <SectionTitle>Подкрепата за партиите във времето</SectionTitle>
        <PollTrend />
      </section>
      <section id="doverie" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Доверие в лидерите и институциите</SectionTitle>
        <TrustPolls />
      </section>
      <section className="mb-12">
        <SectionTitle>Агенциите</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Средна грешка: с колко процентни пункта средно се разминава прогнозата за всяка партия с резултата. По-малко е по-точно. „Системно“: партии, при които агенцията многократно надценява (+) или подценява (−).</p>
        <div className="overflow-x-auto"><table className="w-full text-[15px]">
          <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Агенция</th><th className="px-2 text-right">Средна грешка</th><th className="px-2 text-right">Избори</th><th className="px-2 text-right">Проучвания</th><th className="px-2">Системно</th><th className="px-2 text-right">Пари от държавата*</th></tr></thead>
          <tbody>{D.agencies.map((a) => { const paid = paidTo(a.name); return (
            <tr key={a.id} className="border-b border-rule align-top">
              <td className="py-2 pr-3 font-semibold">{a.site ? <a href={a.site} target="_blank" rel="noreferrer">{a.name}</a> : a.name}{a.eik && <span className="block text-xs text-muted font-normal">ЕИК {a.eik}</span>}</td>
              <td className="px-2 text-right num">{a.mae.toLocaleString("bg-BG")} пр.п.</td>
              <td className="px-2 text-right num">{a.elections}</td>
              <td className="px-2 text-right num">{a.polls}</td>
              <td className="px-2 text-sm">{a.bias.map((b) => `${b[0]} ${pp(b[1])} (${b[2]} пъти)`).join("; ") || "–"}</td>
              <td className="px-2 text-right num text-sm">{paid ? `${Math.round(paid.total).toLocaleString("bg-BG")} €` : "–"}</td>
            </tr>
          ); })}</tbody>
        </table></div>
        <p className="text-xs text-muted mt-2">* Плащания от бюджетни организации по СЕБРА от 2024 г., по име на фирмата. Не значи, че плащането е за предизборни проучвания.</p>
      </section>

      <section className="mb-12">
        <SectionTitle>Грешката през годините</SectionTitle>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MultiLine data={D.agencies.flatMap((a) => a.history.map(([d, v]) => ({ series: a.name, x: Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12, value: v })))} unit=" пр.п." height={300} /></div>
      </section>

      {last && (
        <section className="mb-12">
          <SectionTitle>{`Изборите на ${dd(last.date)}: прогноза срещу резултат`}</SectionTitle>
          <div className="overflow-x-auto"><table className="w-full text-[15px] num">
            <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Партия</th><th className="px-2 text-right">Резултат</th>{last.polls.map((p) => <th key={p.id} className="px-2 text-right">{names[p.id] ?? p.id}<span className="block text-xs font-normal">{p.days} дни преди</span></th>)}</tr></thead>
            <tbody>{last.actual.map(([k, v]) => (
              <tr key={k} className="border-b border-rule"><td className="py-1.5 pr-3">{k}</td><td className="px-2 text-right font-semibold">{v.toLocaleString("bg-BG")}%</td>
                {last.polls.map((p) => { const e = p.errors.find((x) => x[0] === k); return <td key={p.id} className={`px-2 text-right ${e && Math.abs(e[3]) >= 3 ? "text-red" : ""}`}>{e ? <>{e[1].toLocaleString("bg-BG")}% <span className="text-xs text-muted">({pp(e[3])})</span></> : "–"}</td>; })}
              </tr>
            ))}</tbody>
          </table></div>
          <p className="text-sm text-muted mt-2">В червено: разминаване от 3 и повече пункта.</p>
        </section>
      )}
      <p className="text-xs text-muted">Източник: {D.source}. Сравнява се последното публикувано проучване на всяка агенция преди изборите. <Link href="/parlament">Изборите и парламентът</Link>.</p>
    </Page>
  );
}
