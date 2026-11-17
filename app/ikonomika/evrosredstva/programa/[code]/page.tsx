import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, SectionTitle, Title } from "@/components/ui";
import { FUND_NAME, FUNDS, PERIOD, findProgramme, mn, progSlug } from "@/lib/funds";
import { fmt } from "@/lib/stats";

export function generateStaticParams() {
  return FUNDS.byProgramme.map((p) => ({ code: progSlug(p.code) }));
}
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const p = findProgramme(decodeURIComponent((await params).code));
  return { title: p ? p.name : "Програма" };
}

const BAND: Record<string, string> = { high: "силно концентрирана", moderate: "умерено концентрирана", low: "разпределена между много бенефициенти" };

export default async function Programa({ params }: { params: Promise<{ code: string }> }) {
  const p = findProgramme(decodeURIComponent((await params).code));
  if (!p) notFound();
  const integ = FUNDS.integrity.programmes[p.code];
  const winners = FUNDS.integrity.serial.flatMap((w) => w.top.filter((t) => t.code === p.code).map((t) => ({ ...w, eur: t.eur }))).sort((a, b) => b.eur - a.eur);
  const same = FUNDS.byProgramme.filter((x) => x.fund === p.fund && x.code !== p.code).sort((a, b) => b.contracted - a.contracted).slice(0, 8);
  const cases = FUNDS.confirmed.cases.filter((c) => (p.period === "RRP" && /НПВУ|ПВУ/.test(c.programme)));
  const unpaid = p.contracted - p.paid;
  return (
    <Page>
      <Title back={{ href: "/ikonomika/evrosredstva", label: "Европейски средства" }} kicker={`${PERIOD[p.period] ?? p.period} · ${FUND_NAME[p.fund] ?? p.fund}`}
        lead={<>Код на програмата: {p.code}. Данни от регистъра ИСУН към {FUNDS.updated}.</>}>{p.name}</Title>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {[
          ["Договорени", mn(p.contracted), `${p.contracts.toLocaleString("bg-BG")} договора`],
          ["Изплатени", mn(p.paid), `${fmt(p.pct, 0)}% от договореното`],
          ["Още неизплатени", mn(unpaid), p.pct < 30 ? "риск парите да не бъдат усвоени навреме" : "остават за изплащане"],
          ["Бенефициенти", integ ? integ.beneficiaries.toLocaleString("bg-BG") : "–", integ ? `индекс на концентрация ${integ.hhi.toLocaleString("bg-BG")}` : ""],
        ].map(([l, v, n]) => (
          <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2.2rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>
        ))}
      </section>

      <section className="mb-10 max-w-3xl">
        <div className="h-4 rounded-full bg-surface overflow-hidden"><div className={`h-full ${p.pct < 30 ? "bg-red" : "bg-green"}`} style={{ width: `${Math.min(100, p.pct)}%` }} /></div>
        <p className="text-[15px] mt-2">Изплатени са {fmt(p.pct, 1)}% от договорените пари. {p.period === "2014-20" ? "Периодът 2014–2020 е приключил: неизплатеното вероятно няма да бъде платено." : p.period === "RRP" ? "Срокът за инвестициите по Плана за възстановяване е 31 август 2026 г. Неизплатеното след него може да бъде загубено." : "Периодът 2021–2027 продължава до 2029 г. включително."}</p>
      </section>

      {integ && (
        <section className="mb-10 max-w-3xl">
          <SectionTitle>Колко е концентрирана</SectionTitle>
          <p className="text-[15px]">Програмата е <b>{BAND[integ.band] ?? integ.band}</b>. Най-големият бенефициент, <b>{integ.top1Name}</b>, получава <b>{fmt(integ.top1Share * 100, 0)}%</b> от парите. Висока концентрация е нормална за инфраструктурни програми (един държавен възложител строи пътища или железници), но при програми за фирми е повод за въпрос.</p>
          {integ.debarred && <p className="text-red font-semibold mt-2">Сред бенефициентите има фирма с забрана за участие в обществени поръчки.</p>}
        </section>
      )}

      {winners.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Големи бенефициенти, които печелят и от други програми</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{winners.map((w) => (
            <li key={w.eik} className="py-2 grid sm:grid-cols-[1fr_auto] gap-x-4"><span><Link href={`/porachki/firma/${w.eik}`}>{w.name}</Link> <span className="text-sm text-muted">· в {w.programmes} програми, общо {mn(w.total)}</span></span><span className="num">{mn(w.eur)} от тази програма</span></li>
          ))}</ul>
        </section>
      )}

      {cases.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Случаи, разкрити от журналисти</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">Бенефициенти по Плана за възстановяване, свързани от медиите с политици. Подробно: <Link href="/ikonomika/evrosredstva/politika#sluchai">връзки с политици</Link>.</p>
          <ul className="text-[15px] list-disc pl-5 space-y-1">{cases.map((c) => <li key={c.id}><b>{c.beneficiaries.map((b) => b.name).join(", ")}</b>: {c.person}</li>)}</ul>
        </section>
      )}

      {same.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Други програми от същия фонд</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{same.map((x) => (
            <li key={x.code} className="py-2 flex justify-between gap-3"><Link href={`/ikonomika/evrosredstva/programa/${progSlug(x.code)}`}>{x.name}</Link><span className="num whitespace-nowrap">{mn(x.contracted)} · {fmt(x.pct, 0)}%</span></li>
          ))}</ul>
        </section>
      )}
      <p className="text-xs text-muted">Пълният списък с договорите по програмата е в <a href="https://2020.eufunds.bg/bg/0/0/Project" target="_blank" rel="noreferrer">публичния модул на ИСУН</a> (търсене по код {p.code}). Обработка: <a href={FUNDS.source.repo} target="_blank" rel="noreferrer">„Наясно“</a>.</p>
    </Page>
  );
}
