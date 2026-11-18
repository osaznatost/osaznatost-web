import Link from "next/link";
import { BarRank, MultiLine } from "@/components/Charts";
import { Page, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";
import { GEO, STATS, at, cumIndex, eurostatUrl, fmt, last, levelIndex, line, minWageYearly, multi, type Point } from "@/lib/stats";

export const metadata = { title: "Статистики: анализи по теми" };

const tag = (pts: { x: number; value: number }[], series: string): Point[] => pts.map((p) => ({ series, ...p }));
const pct = (a: number, b: number) => (b / a - 1) * 100;

function Section({ id, title, lead, children, sources, takeaway }: {
  id: string; title: string; lead?: string; children: React.ReactNode; sources: string[]; takeaway?: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="display text-[2.2rem] leading-none mb-2">{title}</h2>
      {lead && <p className="text-[16px] text-muted max-w-3xl mb-4">{lead}</p>}
      {takeaway && <div className="bg-surface rounded-sm p-4 mb-5 max-w-3xl text-[16px]">{takeaway}</div>}
      {children}
      <p className="text-xs text-muted mt-3">
        Източник: Евростат ({sources.map((s, i) => <span key={s}>{i > 0 && ", "}<a href={eurostatUrl(s)} target="_blank" rel="noreferrer">{s}</a></span>)}).
      </p>
    </section>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
      <p className="font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

const NAV = [
  ["dohodi", "Доходи срещу цени"], ["zhilishta", "Жилища срещу наеми"], ["dalg", "Дълг и растеж"],
  ["goriva", "Горивата"], ["regioni", "Областите"], ["trud", "Безработица"], ["zdrave", "Здраве и живот"], ["bednost", "Бедност и население"],
];

export default function Statistiki() {
  // 1. Доходи срещу цени, база 2010
  const B = 2010;
  const cpi = cumIndex("inflation", "BG", B);
  const mw = levelIndex(minWageYearly("BG"), B);
  const med = levelIndex(line("median_income", "BG"), B);
  const cpiLast = cpi.at(-1)!, mwLast = mw.find((p) => p.x === cpiLast.x) ?? mw.at(-1)!;
  const medLast = med.filter((p) => p.x <= cpiLast.x).at(-1);
  const cpiAtMed = medLast ? cpi.find((p) => p.x === medLast.x) : undefined;
  const realMw = (mwLast.value / cpiLast.value - 1) * 100;
  const realMed = medLast && cpiAtMed ? (medLast.value / cpiAtMed.value - 1) * 100 : undefined;

  // Региони: доход на домакинствата на човек, реален ръст
  const R0 = 2013;
  const regions = ["BG31", "BG32", "BG33", "BG34", "BG41", "BG42"];
  const incLastYear = last("household_income_regions", "BG31")?.x ?? 2023;
  const cpiR = cumIndex("inflation", "BG", R0).find((p) => p.x === incLastYear)?.value ?? 100;
  const regionReal = regions.map((r) => {
    const a = at("household_income_regions", r, R0), b = at("household_income_regions", r, incLastYear);
    return { name: GEO[r], value: a && b ? ((b / a) / (cpiR / 100) - 1) * 100 : 0, level: b ?? 0 };
  });

  // 2. Жилища срещу наеми, база 2015
  const H = 2015;
  const hp = line("house_price_index", "BG", H);
  const rent = cumIndex("inflation_rent", "BG", H);
  const cpiH = cumIndex("inflation", "BG", H);
  const hpEu = line("house_price_index", "EU27_2020", H);
  const rentEu = cumIndex("inflation_rent", "EU27_2020", H);
  const hpLast = hp.at(-1)!, rentLast = rent.find((p) => p.x === hpLast.x)!, cpiHLast = cpiH.find((p) => p.x === hpLast.x)!;
  const hpEuLast = hpEu.at(-1)!, rentEuLast = rentEu.find((p) => p.x === hpEuLast.x)!;
  const ratioChange = (hpLast.value / rentLast.value - 1) * 100;

  // 3. Дълг и растеж
  const debtLast = last("debt", "BG"), debtEu = last("debt", "EU27_2020"), defLast = last("deficit", "BG");
  const debt19 = at("debt", "BG", 2019) ?? 0;
  const g = line("gdp_growth", "BG", 2020);
  const growth20 = (g.reduce((v, p) => v * (1 + p.value / 100), 1) - 1) * 100;

  // 4. Горива (месечно)
  const fuelGeo = ["BG", "EU27_2020", "RO", "GR", "HR", "DE"];
  const fuelLines = (k: string) => ({ ...(STATS.series.fuel_monthly?.lines[k] ?? {}), ...(STATS.series.fuel_monthly_2026?.lines[k] ?? {}) });
  const fuel: Point[] = fuelGeo.flatMap((k) => Object.entries(fuelLines(k)).map(([x, value]) => ({ series: GEO[k], x, value })))
    .sort((a, b) => String(a.x).localeCompare(String(b.x)));
  const fuelLastMonth = fuel.length ? String(fuel.at(-1)!.x) : "";
  const fuelBg = fuelLines("BG")[fuelLastMonth];
  const fuelEu = fuelLines("EU27_2020")[fuelLastMonth];
  const has2026 = Boolean(STATS.series.fuel_monthly_2026);

  // 5. Области
  const oblLines = STATS.series.gdp_pc_oblasts?.lines ?? {};
  const oblYear = Math.max(...Object.values(oblLines).flatMap((l) => Object.keys(l).map(Number)));
  const obl = Object.entries(oblLines).map(([k, l]) => ({ name: GEO[k] ?? k, value: l[String(oblYear)] ?? 0, base: l["2014"] ?? 0 })).filter((o) => o.value);
  const top = obl.reduce((a, b) => (a.value > b.value ? a : b)), bottom = obl.reduce((a, b) => (a.value < b.value ? a : b));
  const oblGrowth = obl.map((o) => ({ name: o.name, value: o.base ? pct(o.base, o.value) : 0 }));

  // 6. Здраве
  const leM = last("life_expectancy", "M"), leF = last("life_expectancy", "F");
  const leM90 = at("life_expectancy", "M", 1990), leF90 = at("life_expectancy", "F", 1990);
  const leBg = last("life_expectancy_eu", "BG"), leEu = last("life_expectancy_eu", "EU27_2020");
  const hsBg = last("health_spending", "BG"), hsEu = last("health_spending", "EU27_2020");

  // 7. Население и бедност
  const popLast = last("population", "BG"), pop90 = at("population", "BG", 1990);
  const povBg = last("poverty_risk", "BG"), povEu = last("poverty_risk", "EU27_2020");
  const unBg = last("unemployment", "BG"), unEu = last("unemployment", "EU27_2020");

  return (
    <Page>
      <Title lead={`Официалните данни за България, с история и сравнение с ЕС. Изводите са изчислени от самите данни и се обновяват автоматично. Последно обновяване: ${formatDate(STATS.updated)}`}>
        Анализи по теми
      </Title>
      <p className="-mt-4 mb-8 text-[15px]"><Link href="/statistiki">← Библиотеката с всички показатели</Link></p>

      <nav className="flex flex-wrap gap-2 mb-12">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="no-underline text-sm px-3 py-1.5 rounded-full ring-1 ring-rule hover:ring-green text-ink">{label}</a>
        ))}
      </nav>

      <Section
        id="dohodi"
        title="Растат ли доходите по-бързо от цените?"
        lead={`Всичко е приравнено към ${B} г. = 100. Ако линията на дохода е над линията на цените, покупателната способност расте.`}
        sources={["prc_hicp_aind", "earn_mw_cur", "ilc_di03", "nama_10r_2hhinc"]}
        takeaway={<>
          От {B} до {cpiLast.x} г. цените в България са се увеличили с <b>{fmt(cpiLast.value - 100, 0)}%</b>.
          Минималната заплата е нараснала с <b>{fmt(mwLast.value - 100, 0)}%</b>, тоест реално с <b>{fmt(realMw, 0)}%</b> повече покупателна способност.
          {medLast && realMed !== undefined && <> Медианният доход (половината хора получават повече, половината по-малко) е нараснал с <b>{fmt(medLast.value - 100, 0)}%</b> до {medLast.x} г., реално с <b>{fmt(realMed, 0)}%</b>.</>}
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title={`Цени, минимална заплата и медианен доход (${B} = 100)`}>
            <MultiLine data={[...tag(cpi, "Цени"), ...tag(mw.filter((p) => p.x <= cpiLast.x), "Минимална заплата"), ...tag(med, "Медианен доход")]} />
          </Chart>
          <Chart title={`Реален ръст на дохода на домакинствата на човек, ${R0}–${incLastYear} г., по райони`}>
            <BarRank data={regionReal.map(({ name, value }) => ({ name, value }))} unit="%" />
            <p className="text-sm text-muted mt-2">Ръстът е след приспадане на инфлацията за същия период ({fmt(cpiR - 100, 0)}%). Евростат публикува доходите по шестте района, не по области.</p>
          </Chart>
        </div>
      </Section>

      <Section
        id="zhilishta"
        title="Жилищата поскъпват ли по-бързо от наемите?"
        lead={`${H} г. = 100. Когато цените на жилищата растат по-бързо от наемите, купуването става по-неизгодно спрямо наема, а доходността от отдаване под наем пада.`}
        sources={["prc_hpi_a", "prc_hicp_aind"]}
        takeaway={<>
          От {H} до {hpLast.x} г. жилищата в България са поскъпнали с <b>{fmt(hpLast.value - 100, 0)}%</b>, наемите с <b>{fmt(rentLast.value - 100, 0)}%</b>, а всички цени общо с <b>{fmt(cpiHLast.value - 100, 0)}%</b>.
          Цената на жилище, изразена в години наем, се е увеличила с <b>{fmt(ratioChange, 0)}%</b>.
          За сравнение в ЕС: жилищата +{fmt(hpEuLast.value - 100, 0)}%, наемите +{fmt(rentEuLast.value - 100, 0)}%.
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title={`България (${H} = 100)`}>
            <MultiLine data={[...tag(hp, "Жилища"), ...tag(rent.filter((p) => p.x <= hpLast.x), "Наеми"), ...tag(cpiH.filter((p) => p.x <= hpLast.x), "Всички цени")]} />
          </Chart>
          <Chart title={`ЕС (${H} = 100)`}>
            <MultiLine data={[...tag(hpEu, "Жилища"), ...tag(rentEu.filter((p) => p.x <= hpEuLast.x), "Наеми")]} />
          </Chart>
        </div>
      </Section>

      <Section
        id="dalg"
        title="Дългът расте ли по-бързо от икономиката?"
        lead="Дългът сам по себе си не е проблем, ако икономиката расте по-бързо и парите отиват за инвестиции. Затова гледаме дълга като дял от БВП заедно с растежа."
        sources={["gov_10dd_edpt1", "nama_10_gdp"]}
        takeaway={<>
          Дългът е <b>{fmt(debtLast.value)}% от БВП</b> през {debtLast.x} г. ({fmt(debt19)}% през 2019 г.), при средно <b>{fmt(debtEu.value)}%</b> за ЕС. Нисък е, но расте.
          Дефицитът през {defLast.x} г. е <b>{fmt(Math.abs(defLast.value))}% от БВП</b>, над границата от 3% в правилата на ЕС.
          Реалната икономика е нараснала общо с <b>{fmt(growth20, 0)}%</b> от 2020 до {g.at(-1)!.x} г.
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Chart title="Дълг, % от БВП"><MultiLine data={multi("debt", ["BG", "EU27_2020"], 2005)} unit="%" height={260} /></Chart>
          <Chart title="Бюджетно салдо, % от БВП"><MultiLine data={multi("deficit", ["BG", "EU27_2020"], 2005)} unit="%" height={260} zero /></Chart>
          <Chart title="Реален растеж на БВП, %"><MultiLine data={multi("gdp_growth", ["BG", "EU27_2020"], 2005)} unit="%" height={260} zero /></Chart>
        </div>
      </Section>

      <Section
        id="goriva"
        title="Горивата поскъпват само у нас ли?"
        lead="Годишна промяна на цените на горивата за автомобили, месец по месец. Ако линиите се движат заедно, причината е обща за Европа (петрол, курс, геополитика), а не решение на едно правителство."
        sources={["prc_hicp_manr", "prc_hicp_aind"]}
        takeaway={fuelLastMonth && fuelBg !== undefined && fuelEu !== undefined ? <>
          През {fuelLastMonth.replace(/(\d{4})-(\d{2})/, "$2.$1")} г. горивата в България са с <b>{fmt(fuelBg)}%</b> спрямо година по-рано, а средно в ЕС с <b>{fmt(fuelEu)}%</b>.
          {!has2026 && " Месечните данни на Евростат за 2026 г. са в нова класификация и ще бъдат добавени, след като ги свържем."}
        </> : undefined}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Горива: годишна промяна на цената, %"><MultiLine data={fuel} unit="%" zero /></Chart>
          <Chart title="Енергия общо: годишна инфлация, %"><MultiLine data={multi("inflation_energy", ["BG", "EU27_2020"], 2005)} unit="%" zero /></Chart>
        </div>
      </Section>

      <Section
        id="regioni"
        title="Колко различни са областите?"
        lead={`Брутен вътрешен продукт на човек по области, ${oblYear} г. Това е стойността, която икономиката на областта създава на жител, не заплата.`}
        sources={["nama_10r_3gdp"]}
        takeaway={<>
          Най-високият БВП на човек е в {top.name} (<b>{fmt(top.value, 0)} €</b>), най-ниският в {bottom.name} (<b>{fmt(bottom.value, 0)} €</b>), разлика <b>{fmt(top.value / bottom.value)} пъти</b>.
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title={`БВП на човек, €, ${oblYear} г.`}><BarRank data={obl.map(({ name, value }) => ({ name, value }))} highlight={top.name} /></Chart>
          <Chart title={`Ръст на БВП на човек, 2014–${oblYear} г. (номинално)`}><BarRank data={oblGrowth} unit="%" /></Chart>
        </div>
      </Section>

      <Section
        id="trud"
        title="Колко хора нямат работа?"
        lead="Безработица сред хората на 15–74 г., които търсят активно работа."
        sources={["une_rt_a", "lfst_r_lfu3rt"]}
        takeaway={<>Безработицата е <b>{fmt(unBg.value)}%</b> през {unBg.x} г., при <b>{fmt(unEu.value)}%</b> средно в ЕС. Ниската безработица заедно със спадащото население означава недостиг на работници.</>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="България и ЕС, %"><MultiLine data={multi("unemployment", ["BG", "EU27_2020"])} unit="%" /></Chart>
          <Chart title="По райони, %"><MultiLine data={multi("unemployment_regions", regions, 2010)} unit="%" /></Chart>
        </div>
      </Section>

      <Section
        id="zdrave"
        title="По-дълго ли живеем?"
        lead="Очаквана продължителност на живота при раждане. Свързаният показател до нея са разходите за здраве."
        sources={["demo_mlexpec", "hlth_sha11_hf"]}
        takeaway={<>
          Мъжете в България живеят средно <b>{fmt(leM.value)} г.</b>, жените <b>{fmt(leF.value)} г.</b> ({leM.x} г.). През 1990 г. са били {fmt(leM90 ?? 0)} и {fmt(leF90 ?? 0)} г.
          Средната продължителност е <b>{fmt(leBg.value)} г.</b> при <b>{fmt(leEu.value)} г.</b> в ЕС.
          За здраве страната харчи <b>{fmt(hsBg.value)}% от БВП</b> при {fmt(hsEu.value)}% в ЕС ({hsBg.x} г.).
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Продължителност на живота, години"><MultiLine data={[...multi("life_expectancy", ["M", "F"], 1960), ...multi("life_expectancy_eu", ["EU27_2020"])]} unit=" г." /></Chart>
          <Chart title="Разходи за здраве, % от БВП"><MultiLine data={multi("health_spending", ["BG", "EU27_2020"])} unit="%" /></Chart>
        </div>
      </Section>

      <Section
        id="bednost"
        title="Бедност и население"
        sources={["ilc_peps01n", "demo_pjan"]}
        takeaway={<>
          <b>{fmt(povBg.value)}%</b> от хората са в риск от бедност или социално изключване ({povBg.x} г.), при {fmt(povEu.value)}% в ЕС.
          Населението е <b>{fmt(popLast.value / 1e6, 2)} млн.</b> в началото на {popLast.x} г., с <b>{fmt(((pop90 ?? 0) - popLast.value) / 1e6, 2)} млн.</b> по-малко от 1990 г.
        </>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Риск от бедност или социално изключване, %"><MultiLine data={multi("poverty_risk", ["BG", "EU27_2020"])} unit="%" /></Chart>
          <Chart title="Население, млн."><MultiLine data={line("population", "BG", 1960).map((p) => ({ series: "България", x: p.x, value: Math.round(p.value / 10000) / 100 }))} unit=" млн." /></Chart>
        </div>
      </Section>
    </Page>
  );
}
