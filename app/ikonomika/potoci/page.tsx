import Link from "next/link";
import { MoneyFlow, type FlowLink, type FlowNode } from "@/components/MoneyFlow";
import { Page, SectionTitle, Title } from "@/components/ui";
import flows from "@/content/flows.json";
import funds from "@/data/funds.json";
import { MAIN_SECTORS, lastYear, val } from "@/lib/economy";
import { fmt } from "@/lib/stats";

export const metadata = { title: "Кръвоносната система на икономиката" };
const bn = (v: number) => `${fmt(v / 1000, 1)} млрд. €`;
const mn = (v: number) => `${fmt(Math.abs(v), 0)} млн. €`;

export default function Potoci() {
  const y = lastYear("gva_sectors");
  const gdp = val("gdp_expenditure", "B1GQ", y), gva = val("gva_sectors", "TOTAL", y);
  // Поток 1: сектори → заплати и печалби (добавената стойност на всеки сектор се дели на заплати и останалото).
  const nodes: FlowNode[] = [
    ...MAIN_SECTORS.map((s) => ({ id: s.code, label: s.short, kind: "source" as const })),
    { id: "tax", label: "Данъци върху продуктите (ДДС, акцизи)", kind: "source" },
    { id: "wages", label: "Заплати и осигуровки на наетите", kind: "buyer" },
    { id: "profit", label: "Печалби, самонаети, наеми", kind: "supplier" },
    { id: "state", label: "Държавата", kind: "sub" },
  ];
  const links: FlowLink[] = MAIN_SECTORS.flatMap((s) => {
    const g = val("gva_sectors", s.code, y), d = val("comp_sectors", s.code, y);
    return g && d != null ? [{ source: s.code, target: "wages", value: Math.round(d * 1e6) }, { source: s.code, target: "profit", value: Math.max(0, Math.round((g - d) * 1e6)) }] : [];
  });
  links.push({ source: "tax", target: "state", value: Math.round((gdp - gva) * 1e6) });

  const ext = [
    { l: "Износ", v: val("gdp_expenditure", "P6", y), dir: "in", s: "пари, които чужбина плаща за наши стоки и услуги" },
    { l: "Внос", v: val("gdp_expenditure", "P7", y), dir: "out", s: "пари, които плащаме на чужбина" },
    { l: "Нови чужди инвестиции", v: val("fdi_flow_partner", "WRL_REST", y), dir: "in", s: "нетен приток за годината" },
    { l: "Доход на чуждите инвеститори", v: val("fdi_income_partner", "WRL_REST", y), dir: "out", s: "печалби: част се изплаща навън, част се реинвестира" },
  ];
  const F = flows.soe, N = flows.nap, T = F.totals;
  const eu = (funds as unknown as { totals: { paidEur: number } }).totals.paidEur;

  return (
    <Page>
      <Title back={{ href: "/ikonomika", label: "Икономика" }} lead={`Откъде идват парите, през кои сектори минават и при кого остават. Кое носи печалба и кое потъва. Данни: национални сметки на Евростат за ${y} г., НАП, АППК, ИСУН.`}>
        Кръвоносната система на икономиката
      </Title>

      <section className="mb-14">
        <SectionTitle>Как се разпределя създаденото</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Всеки сектор създава стойност, която се разделя на заплати и осигуровки за наетите и на всичко останало: печалби на фирмите, доходи на самонаетите и наемите. Данъците върху продуктите отиват при държавата. Общо: {bn(gdp)} БВП за {y} г.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MoneyFlow nodes={nodes} links={links} /></div>
        <p className="text-sm text-muted mt-2">Държавата получава и данъци от заплатите и печалбите (подоходен и корпоративен данък, осигуровки). Те не са показани тук, за да не се броят два пъти. Къде отиват парите на държавата: <Link href="/byudzhet">бюджетът</Link>.</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Какво влиза и какво излиза от страната</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ext.map((e) => (
            <div key={e.l} className={`rounded-sm p-4 ring-1 ${e.dir === "in" ? "ring-[#2f9e6a] bg-[#eef7f1]" : "ring-[#d2353f] bg-[#fbeef0]"}`}>
              <p className="text-sm">{e.dir === "in" ? "Влиза" : "Излиза"}: <b>{e.l}</b></p>
              <p className="display text-[2.2rem] leading-none mt-1">{e.v ? bn(e.v) : "–"}</p>
              <p className="text-xs text-muted mt-1">{e.s}</p>
            </div>
          ))}
        </div>
        <p className="text-[15px] mt-4 max-w-3xl">Освен това от европейските фондове досега са изплатени {bn(eu / 1e6)} по договори от 2014 г. насам (<Link href="/ikonomika/evrosredstva">подробно</Link>). Подробно за чуждия капитал: <Link href="/ikonomika/investicii">инвестициите</Link>.</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Кое носи печалба</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">По данъчните декларации на всички фирми за 2025 г. (НАП).</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Приходи на всички фирми</p><p className="display text-[2.2rem]">{bn(N.revenue)}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Печалба в търговията</p><p className="display text-[2.2rem]">{bn(N.profitTrade)}</p><p className="text-xs text-muted">най-печелившият сектор</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Печалба в промишлеността</p><p className="display text-[2.2rem]">{bn(N.profitManuf)}</p><p className="text-xs text-muted">втори по печалба</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Обявени данъчни загуби</p><p className="display text-[2.2rem]">{bn(N.lossesTotal)}</p><p className="text-xs text-muted">енергетиката: −{mn(N.energyLoss)}</p></div>
        </div>
        <p className="text-[15px] mt-4 max-w-3xl">Най-много стойност на един зает създават финансите, ИТ и енергетиката, а най-малко земеделието (<Link href="/ikonomika/struktura">анатомията на икономиката</Link>). Източник за печалбите: <a href={N.source.url} target="_blank" rel="noreferrer">{N.source.title}</a></p>
      </section>

      <section className="mb-14">
        <SectionTitle>Държавните фирми: кои печелят и кои губят</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Държавни предприятия</p><p className="display text-[2.2rem]">{T.enterprises}</p><p className="text-xs text-muted">над {T.employees.toLocaleString("bg-BG")} служители</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Приходи, {F.year}</p><p className="display text-[2.2rem]">{bn(T.revenue)}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Обща нетна печалба</p><p className="display text-[2.2rem]">{mn(T.profit)}</p><p className="text-xs text-muted">дивиденти за държавата: {mn(T.dividends)}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">На загуба</p><p className="display text-[2.2rem]">{T.lossMaking}</p><p className="text-xs text-muted">общо −{mn(T.losses)}</p></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
            <p className="font-semibold mb-2 text-red">Най-големите загуби</p>
            <ul className="space-y-2">{F.losers.map((x) => <li key={x.name} className="flex justify-between gap-3 text-[15px] border-b border-rule pb-2"><span>{x.name}<br /><span className="text-sm text-muted">{x.note}</span></span><span className="num text-red whitespace-nowrap">−{mn(x.result)}</span></li>)}</ul>
          </div>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
            <p className="font-semibold mb-2 text-[#1f7a4a]">Най-големите печалби</p>
            <ul className="space-y-2">{F.winners.map((x) => <li key={x.name} className="flex justify-between gap-3 text-[15px] border-b border-rule pb-2"><span>{x.name}{x.note && <><br /><span className="text-sm text-muted">{x.note}</span></>}</span><span className="num text-[#1f7a4a] whitespace-nowrap">+{mn(x.result)}</span></li>)}</ul>
          </div>
        </div>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white mt-6">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Сектор (държавни фирми)</th><th className="p-3 num">Приходи</th><th className="p-3 num">Резултат</th></tr></thead>
            <tbody>{F.sectors.map((s) => <tr key={s.name} className="border-t border-rule"><td className="p-3">{s.name}</td><td className="p-3 num">{mn(s.revenue)}</td><td className={`p-3 num ${s.result < 0 ? "text-red" : ""}`}>{s.result < 0 ? "−" : "+"}{mn(s.result)}</td></tr>)}</tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 mt-4 space-y-1.5 text-[15px] max-w-3xl">
          <li>Въглищата са най-голямата яма: добивът губи над {mn(Math.abs(F.sectors.find((s) => s.name.startsWith("Добив"))!.result))} годишно при приходи около {mn(F.sectors.find((s) => s.name.startsWith("Добив"))!.revenue)}.</li>
          <li>„БДЖ – Пътнически превози“ получава около {mn(F.bdzSubsidy)} субсидия годишно и пак завършва на загуба. Това е цената на обществения превоз, а не непременно лошо управление: влаковете в цяла Европа се субсидират.</li>
          <li>Държавните финансови институции и газопреносът носят по-голямата част от печалбата.</li>
        </ul>
        <p className="text-xs text-muted mt-3">{F.caveat} Източник: <a href={F.source.url} target="_blank" rel="noreferrer">{F.source.title}</a>.</p>
      </section>
    </Page>
  );
}
