import Link from "next/link";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";
import { GEO, STATS, eurostatUrl, fmt, last, line, minWageYearly, multi, type Point } from "@/lib/stats";

export const metadata = { title: "Здравето на икономиката" };

type Tone = "good" | "mid" | "bad";
const TONE: Record<Tone, string> = { good: "border-[#2f9e6a]", mid: "border-[#e2b33b]", bad: "border-red" };
const TONE_LABEL: Record<Tone, string> = { good: "Добре", mid: "Внимание", bad: "Проблем" };
const TONE_TEXT: Record<Tone, string> = { good: "text-[#2f7d57]", mid: "text-[#9a7414]", bad: "text-red" };

function Gauge({ label, value, unit, eu, tone, why, href }: { label: string; value: string; unit?: string; eu?: string; tone: Tone; why: string; href: string }) {
  return (
    <a href={href} className={`no-underline text-ink block bg-white ring-1 ring-rule rounded-sm p-4 border-t-4 ${TONE[tone]} hover:bg-surface`}>
      <div className="flex justify-between items-baseline gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className={`text-xs font-semibold ${TONE_TEXT[tone]}`}>{TONE_LABEL[tone]}</span>
      </div>
      <p className="display num text-[2.6rem] leading-none mt-2">{value}<span className="text-lg font-normal text-muted">{unit}</span></p>
      {eu && <p className="text-sm mt-1">ЕС: <b className="num">{eu}</b></p>}
      <p className="text-sm text-muted mt-2">{why}</p>
    </a>
  );
}

function Chart({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
      <p className="font-semibold mb-2">{title}</p>
      {children}
      {note && <p className="text-sm text-muted mt-2">{note}</p>}
    </div>
  );
}

function Block({ id, title, lead, children, sources }: { id: string; title: string; lead: React.ReactNode; children: React.ReactNode; sources: string[] }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <SectionTitle>{title}</SectionTitle>
      <div className="text-[16px] max-w-3xl -mt-2 mb-5">{lead}</div>
      {children}
      <p className="text-xs text-muted mt-3">Източник: Евростат ({sources.map((s, i) => <span key={s}>{i > 0 && ", "}<a href={eurostatUrl(s)} target="_blank" rel="noreferrer">{s}</a></span>)}).</p>
    </section>
  );
}

const v = (id: string, geo = "BG") => last(id, geo);
const tag = (pts: { x: number; value: number }[], series: string): Point[] => pts.map((p) => ({ series, ...p }));

export default function Ikonomika() {
  const g = v("gdp_growth"), gEu = v("gdp_growth", "EU27_2020");
  const inf = v("inflation"), infEu = v("inflation", "EU27_2020");
  const un = v("unemployment"), unEu = v("unemployment", "EU27_2020");
  const emp = v("employment_rate"), empEu = v("employment_rate", "EU27_2020");
  const debt = v("debt"), debtEu = v("debt", "EU27_2020");
  const def = v("deficit"), defEu = v("deficit", "EU27_2020");
  const pps = v("gdp_pc_pps");
  const rev = v("gov_revenue"), exp = v("gov_expenditure"), int = v("gov_interest"), intEu = v("gov_interest", "EU27_2020");
  const inv = v("investment"), invEu = v("investment", "EU27_2020");
  const gini = v("gini"), giniEu = v("gini", "EU27_2020");
  const mw = minWageYearly("BG");
  const mwLast = mw.at(-1)!, mw5 = mw.find((p) => p.x === mwLast.x - 5);
  const neighbors = ["RO", "HR", "HU", "PL"].map((k) => ({ k, v: last("gdp_pc_pps", k)?.value ?? 0 })).sort((a, b) => b.v - a.v);
  const pps10 = line("gdp_pc_pps", "BG").find((p) => p.x === pps.x - 10);
  const monthly: Point[] = ["BG", "EU27_2020"].flatMap((k) =>
    Object.entries({ ...(STATS.series.inflation_monthly?.lines[k] ?? {}), ...(STATS.series.inflation_monthly_2026?.lines[k] ?? {}) }).map(([x, value]) => ({ series: GEO[k], x, value })),
  ).sort((a, b) => String(a.x).localeCompare(String(b.x)));

  const tone = {
    growth: g.value >= 2.5 ? "good" : g.value >= 1 ? "mid" : "bad",
    inflation: inf.value <= 2.5 ? "good" : inf.value <= 4 ? "mid" : "bad",
    unemployment: un.value <= unEu.value ? "good" : un.value <= unEu.value + 2 ? "mid" : "bad",
    employment: emp.value >= empEu.value ? "good" : emp.value >= empEu.value - 3 ? "mid" : "bad",
    debt: debt.value <= 40 ? "good" : debt.value <= 60 ? "mid" : "bad",
    deficit: Math.abs(def.value) <= 2 || def.value > 0 ? "good" : Math.abs(def.value) <= 3 ? "mid" : "bad",
    pps: pps.value >= 85 ? "good" : pps.value >= 70 ? "mid" : "bad",
    gini: gini.value <= 30 ? "good" : gini.value <= 34 ? "mid" : "bad",
  } as const satisfies Record<string, Tone>;

  return (
    <Page>
      <Title lead={`Осем числа, които показват дали икономиката е здрава, с история и сравнение с ЕС. Данните идват от Евростат и се обновяват автоматично (последно на ${formatDate(STATS.updated)}).`}>
        Здравето на икономиката
      </Title>
      <Link href="/ikonomika/struktura" className="block ring-1 ring-rule rounded-sm p-4 mb-8 bg-white no-underline text-ink hover:ring-2 hover:ring-green">
        <p className="font-semibold text-lg">Анатомия на икономиката →</p>
        <p className="text-[15px] text-muted">Кои сектори създават стойност, за какво се харчи БВП, колко остава за заплати и колко за печалби, решенията през годините и разликите между областите.</p>
      </Link>
      <Link href="/ikonomika/investicii" className="block ring-1 ring-rule rounded-sm p-4 mb-8 -mt-5 bg-white no-underline text-ink hover:ring-2 hover:ring-green">
        <p className="font-semibold text-lg">Чуждестранни инвестиции →</p>
        <p className="text-[15px] text-muted">Колко са вложили чуждите компании, от кои държави, в кои отрасли и колко печелят от това.</p>
      </Link>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Gauge label={`Растеж на икономиката, ${g.x}`} value={fmt(g.value)} unit="%" eu={`${fmt(gEu.value)}%`} tone={tone.growth} why="Реален ръст на БВП. Над 2,5% означава, че догонваме ЕС." href="#rastezh" />
        <Gauge label={`Инфлация, ${inf.x}`} value={fmt(inf.value)} unit="%" eu={`${fmt(infEu.value)}%`} tone={tone.inflation} why="Средногодишно поскъпване. Целта на ЕЦБ е 2%." href="#ceni" />
        <Gauge label={`Безработица, ${un.x}`} value={fmt(un.value)} unit="%" eu={`${fmt(unEu.value)}%`} tone={tone.unemployment} why="Дял на търсещите работа от работната сила." href="#trud" />
        <Gauge label={`Заетост 20–64 г., ${emp.x}`} value={fmt(emp.value)} unit="%" eu={`${fmt(empEu.value)}%`} tone={tone.employment} why="Колко от хората в трудоспособна възраст работят." href="#trud" />
        <Gauge label={`Дълг, ${debt.x}`} value={fmt(debt.value)} unit="% от БВП" eu={`${fmt(debtEu.value)}%`} tone={tone.debt} why="Границата в правилата на ЕС е 60%." href="#finansi" />
        <Gauge label={`Бюджетно салдо, ${def.x}`} value={fmt(def.value)} unit="% от БВП" eu={`${fmt(defEu.value)}%`} tone={tone.deficit} why="Границата за дефицит в правилата на ЕС е 3%." href="#finansi" />
        <Gauge label={`БВП на човек, ${pps.x}`} value={fmt(pps.value, 0)} unit=" (ЕС = 100)" tone={tone.pps} why={`По покупателна способност. Преди 10 години: ${fmt(pps10?.value ?? 0, 0)}.`} href="#rastezh" />
        <Gauge label={`Неравенство (Джини), ${gini.x}`} value={fmt(gini.value)} eu={fmt(giniEu.value)} tone={tone.gini} why="0 = всички имат еднакъв доход, 100 = един има всичко." href="#trud" />
      </section>
      <p className="text-xs text-muted mb-14 max-w-3xl">Оценките „добре / внимание / проблем“ са по прости, обявени прагове: целта за инфлация на ЕЦБ, границите за дълг и дефицит в правилата на ЕС и средното за ЕС за пазара на труда. Те не са мнение за правителство.</p>

      <Block id="rastezh" title="Растеж и богатство" sources={["nama_10_gdp", "tec00114"]}
        lead={<>Икономиката расте с <b>{fmt(g.value)}%</b> при <b>{fmt(gEu.value)}%</b> за ЕС, тоест догонваме. По покупателна способност сме на <b>{fmt(pps.value, 0)}%</b> от средното за ЕС ({pps.x} г.), след {neighbors.map((n) => `${GEO[n.k]} (${fmt(n.v, 0)})`).join(", ")}. Инвестициите са <b>{fmt(inv.value)}%</b> от БВП при {fmt(invEu.value)}% в ЕС: от тях зависи бъдещият растеж.</>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Реален растеж на БВП, %"><MultiLine data={multi("gdp_growth", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
          <Chart title="БВП на човек по покупателна способност (ЕС = 100)"><MultiLine data={multi("gdp_pc_pps", ["BG", "RO", "HR", "HU", "PL"], 2010)} /></Chart>
          <Chart title="Инвестиции, % от БВП"><MultiLine data={multi("investment", ["BG", "EU27_2020"], 2005)} unit="%" /></Chart>
          <Chart title="Износ, % от БВП" note="Високият дял на износа значи, че икономиката зависи от търсенето в чужбина."><MultiLine data={multi("exports", ["BG", "EU27_2020"], 2005)} unit="%" /></Chart>
        </div>
      </Block>

      <Block id="ceni" title="Цени" sources={["prc_hicp_aind", "prc_hicp_manr"]}
        lead={<>Цените растат с <b>{fmt(inf.value)}%</b> годишно при {fmt(infEu.value)}% в ЕС. При по-бърз растеж на заплатите от цените покупателната способност се подобрява, но храната и наемите поскъпват над средното (вижте <Link href="/statistiki/analiz#dohodi">доходи срещу цени</Link>).</>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Инфлация по години, %"><MultiLine data={multi("inflation", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
          <Chart title="Инфлация по месеци, годишна промяна, %"><MultiLine data={monthly} unit="%" zero /></Chart>
          <Chart title="Храни, годишна инфлация, %"><MultiLine data={multi("inflation_food", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
          <Chart title="Енергия, годишна инфлация, %"><MultiLine data={multi("inflation_energy", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
        </div>
      </Block>

      <Block id="finansi" title="Публични финанси" sources={["gov_10a_main", "gov_10dd_edpt1"]}
        lead={<>Държавата събира <b>{fmt(rev.value)}%</b> от БВП и харчи <b>{fmt(exp.value)}%</b> ({rev.x} г.). Разликата е дефицитът, който се покрива с нов дълг. Лихвите струват <b>{fmt(int.value)}%</b> от БВП при {fmt(intEu.value)}% в ЕС, защото дългът е нисък, но всеки дефицит над 3% го увеличава. Подробно: <Link href="/pari/dalg">дългът</Link> и <Link href="/byudzhet">бюджетът</Link>.</>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Приходи и разходи на държавата, % от БВП (България)"><MultiLine data={[...tag(line("gov_revenue", "BG", 2005), "Приходи"), ...tag(line("gov_expenditure", "BG", 2005), "Разходи")]} unit="%" /></Chart>
          <Chart title="Бюджетно салдо, % от БВП"><MultiLine data={multi("deficit", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
          <Chart title="Дълг, % от БВП"><MultiLine data={multi("debt", ["BG", "EU27_2020"], 2005)} unit="%" /></Chart>
          <Chart title="Разходи за лихви, % от БВП"><MultiLine data={multi("gov_interest", ["BG", "EU27_2020"], 2005)} unit="%" /></Chart>
        </div>
      </Block>

      <Block id="trud" title="Труд и доходи" sources={["une_rt_a", "lfsi_emp_a", "earn_mw_cur", "ilc_di12"]}
        lead={<>Работят <b>{fmt(emp.value)}%</b> от хората на 20–64 г., безработицата е <b>{fmt(un.value)}%</b>. Минималната заплата е <b>{fmt(mwLast.value, 0)} €</b>{mw5 && <> ({mw5.x} г.: {fmt(mw5.value, 0)} €)</>}. Неравенството в доходите (Джини <b>{fmt(gini.value)}</b>) е сред най-високите в ЕС ({fmt(giniEu.value)}).</>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Безработица, %"><MultiLine data={multi("unemployment", ["BG", "EU27_2020"])} unit="%" /></Chart>
          <Chart title="Безработица сред младите (15–24 г.), %"><MultiLine data={multi("youth_unemployment", ["BG", "EU27_2020"])} unit="%" /></Chart>
          <Chart title="Заетост 20–64 г., %"><MultiLine data={multi("employment_rate", ["BG", "EU27_2020"], 2005)} unit="%" /></Chart>
          <Chart title="Минимална заплата, € на месец"><MultiLine data={["BG", "RO", "HR", "GR", "PL"].flatMap((k) => minWageYearly(k).filter((p) => p.x >= 2010).map((p) => ({ series: GEO[k], ...p })))} unit=" €" /></Chart>
          <Chart title="Неравенство в доходите (коефициент на Джини)"><MultiLine data={multi("gini", ["BG", "EU27_2020", "RO"], 2007)} /></Chart>
          <Chart title="Колко пъти доходът на най-богатите 20% е по-голям от този на най-бедните 20%"><MultiLine data={multi("s80s20", ["BG", "EU27_2020", "RO"], 2007)} /></Chart>
        </div>
      </Block>

      <section className="max-w-3xl">
        <SectionTitle>Как се връзват числата</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-[16px]">
          <li><b>Растеж и дълг.</b> Дългът като дял от БВП пада, ако икономиката расте по-бързо от дълга. При растеж {fmt(g.value)}% и дефицит {fmt(Math.abs(def.value))}% дългът расте, защото новият дълг е по-голям от ефекта на растежа.</li>
          <li><b>Инфлация и заплати.</b> Когато минималната заплата и доходите растат по-бързо от цените, хората купуват повече. Но по-високите заплати увеличават и разходите на бизнеса, което може да вдигне цените.</li>
          <li><b>Заетост и пенсии.</b> По-малкото работещи на един пенсионер означава повече натиск върху бюджета на НОИ, който днес се доплаща от държавния бюджет.</li>
          <li><b>Инвестиции и бъдещ растеж.</b> Ниските инвестиции днес означават по-бавен растеж утре. Част от инвестициите зависят от европейските средства.</li>
        </ul>
      </section>
    </Page>
  );
}
