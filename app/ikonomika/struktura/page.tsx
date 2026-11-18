import Link from "next/link";
import { ChoroMap } from "@/components/ChoroMap";
import { MultiLine } from "@/components/Charts";
import { MoneyFlow, type FlowLink, type FlowNode } from "@/components/MoneyFlow";
import { Page, SectionTitle, Title } from "@/components/ui";
import { EVENTS, EXPENDITURE, INCOME, MAIN_SECTORS, NUTS3_BY_PREFIX, REGIONAL_SECTORS, SECTORS, lastYear, val, years } from "@/lib/economy";
import { ELECTIONS } from "@/lib/partyMeta";
import { GEO, STATS, eurostatUrl, fmt } from "@/lib/stats";

export const metadata = { title: "Анатомия на икономиката" };

const pct = (a?: number, b?: number) => (a != null && b ? (a / b) * 100 : undefined);
const f1 = (v?: number) => (v == null ? "–" : fmt(v, 1));
const bn = (v?: number) => (v == null ? "–" : `${fmt(v / 1000, 1)} млрд. €`);

export default function Struktura() {
  const y = lastYear("gva_sectors");
  const yEmp = lastYear("emp_sectors");
  const first = 2000;
  const gdp = val("gdp_expenditure", "B1GQ", y);
  const gvaT = val("gva_sectors", "TOTAL", y);
  const empT = val("emp_sectors", "TOTAL", yEmp);
  const prodAvg = gvaT / empT; // млн. € / хил. души = хил. € на зает
  const rows = SECTORS.map((s) => {
    const g = val("gva_sectors", s.code, y), e = val("emp_sectors", s.code, yEmp), d1 = val("comp_sectors", s.code, y);
    const real = years("gva_sectors_real", s.code).slice(-5).map((yy) => val("gva_sectors_real", s.code, yy)).filter((v) => v != null);
    return {
      ...s, share: pct(g, gvaT), share08: pct(val("gva_sectors", s.code, 2008), val("gva_sectors", "TOTAL", 2008)), shareFirst: pct(val("gva_sectors", s.code, first), val("gva_sectors", "TOTAL", first)),
      shareEu: pct(val("gva_sectors_eu", s.code, y) ?? val("gva_sectors_eu", s.code, y - 1), val("gva_sectors_eu", "TOTAL", y) ?? val("gva_sectors_eu", "TOTAL", y - 1)),
      emp: pct(e, empT), prod: g && e ? g / e : undefined, labour: pct(d1, g), real: real.length ? real.reduce((a, b) => a + b, 0) / real.length : undefined,
    };
  });
  const shareData = MAIN_SECTORS.flatMap((s) => years("gva_sectors", s.code).filter((yy) => yy >= first).map((yy) => ({ series: s.short, x: yy, value: Math.round((val("gva_sectors", s.code, yy) / val("gva_sectors", "TOTAL", yy)) * 1000) / 10 })));
  const expData = EXPENDITURE.flatMap((e) => years("gdp_expenditure", e.code).filter((yy) => yy >= first).map((yy) => ({ series: e.name, x: yy, value: Math.round((val("gdp_expenditure", e.code, yy) / val("gdp_expenditure", "B1GQ", yy)) * 1000) / 10 })));
  const incData = INCOME.flatMap((e) => years("gdp_income", e.code).filter((yy) => yy >= first).map((yy) => ({ series: e.name, x: yy, value: Math.round((val("gdp_income", e.code, yy) / val("gdp_income", "B1GQ", yy)) * 1000) / 10 })));
  const growth = STATS.series.gdp_growth.lines.BG;
  const g = (yy: number) => growth[String(yy)];
  const avg = (ys: number[]) => { const v = ys.map(g); return v.every((x) => x != null) ? v.reduce((a, b) => a + b, 0) / v.length : undefined; };

  // Как тече икономиката: търсене → общо търсене → внос / БВП → доходи
  const E = (c: string) => (val("gdp_expenditure", c, y) ?? 0) * 1e6;
  const I = (c: string) => (val("gdp_income", c, y) ?? 0) * 1e6;
  const demand = E("P31_S14") + E("P31_S15") + E("P3_S13") + E("P51G") + E("P52") + E("P6");
  const flowNodes: FlowNode[] = [
    { id: "hh", label: "Потребление на домакинствата", kind: "source", color: "#2f6f8f", note: "Храна, жилище, транспорт, услуги: всичко, което купуват хората (вкл. организациите с нестопанска цел)." },
    { id: "gov", label: "Потребление на държавата", kind: "source", color: "#8a5a8c", note: "Заплати в държавния сектор, лекарства, образование, отбрана." },
    { id: "inv", label: "Инвестиции", kind: "source", color: "#b08436", note: "Сгради, машини, пътища, софтуер и промяна на запасите." },
    { id: "exp", label: "Износ", kind: "source", color: "#2f7d57", note: "Стоки и услуги, продадени в чужбина." },
    { id: "dem", label: "Общо търсене", kind: "buyer", color: "#143426", note: "Всичко, което е купено в икономиката за годината." },
    { id: "imp", label: "Внос: изтича навън", kind: "annex", color: "#c46a4a", note: "Частта от търсенето, задоволена с внос. Тези пари отиват при чужди производители." },
    { id: "gdp", label: "БВП: създадено в България", kind: "buyer", color: "#1F4D3A" },
    { id: "w", label: "Заплати и осигуровки", kind: "supplier", color: "#2f6f8f", note: "Доходът на наетите, включително осигуровките, платени от работодателя." },
    { id: "p", label: "Печалби, самонаети, наеми", kind: "supplier", color: "#b08436", note: "Брутен опериращ излишък и смесен доход: печалби на фирмите, доходи на самонаетите и земеделците, амортизация." },
    { id: "t", label: "Данъци върху продуктите (нето)", kind: "supplier", color: "#8a5a8c", note: "ДДС, акцизи, мита минус субсидиите." },
  ];
  const flowLinks: FlowLink[] = [
    { source: "hh", target: "dem", value: E("P31_S14") + E("P31_S15") },
    { source: "gov", target: "dem", value: E("P3_S13") },
    { source: "inv", target: "dem", value: E("P51G") + E("P52") },
    { source: "exp", target: "dem", value: E("P6") },
    { source: "dem", target: "imp", value: E("P7") },
    { source: "dem", target: "gdp", value: demand - E("P7") },
    { source: "gdp", target: "w", value: I("D1") },
    { source: "gdp", target: "p", value: I("B2A3G") },
    { source: "gdp", target: "t", value: I("D2X3") },
  ];
  const impShare = pct(E("P7"), demand);

  // Области
  const ry = years("gva_oblasts", "BG411|TOTAL").at(-1)!;
  const oblasts = Object.keys(GEO).filter((k) => /^BG\d{3}$/.test(k)).map((code) => {
    const tot = val("gva_oblasts", `${code}|TOTAL`, ry);
    const secs = REGIONAL_SECTORS.map((s) => ({ ...s, share: pct(val("gva_oblasts", `${code}|${s.code}`, ry), tot) ?? 0 }));
    const top = [...secs].sort((a, b) => b.share - a.share)[0];
    return { code, name: GEO[code], tot, pc: STATS.series.gdp_pc_oblasts?.lines[code]?.[String(lastYear("gdp_pc_oblasts", code))], secs, top };
  }).sort((a, b) => (b.tot ?? 0) - (a.tot ?? 0));
  const byNuts = Object.fromEntries(oblasts.map((o) => [o.code, o]));
  const pcYear = lastYear("gdp_pc_oblasts", "BG411");
  const mapValues = Object.fromEntries(Object.entries(ELECTIONS.munis).flatMap(([c, m]) => {
    const n = NUTS3_BY_PREFIX[c.slice(0, 3)]; const o = n && byNuts[n];
    return o && o.pc ? [[c, { name: o.name, value: o.pc, note: `община ${m.name}` }]] : [];
  }));

  return (
    <Page>
      <Title back={{ href: "/ikonomika", label: "Здравето на икономиката" }} lead={`Откъде идват парите в икономиката, за какво се харчат и при кого остават. По официалните национални сметки на Евростат, от 1995 до ${y} г. Сравняваме от 2000 г., защото годините около хиперинфлацията изкривяват дяловете.`}>
        Анатомия на икономиката
      </Title>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          { l: `БВП, ${y}`, v: bn(gdp), s: "всичко произведено за година" },
          { l: `Заети, ${yEmp}`, v: `${fmt(empT / 1000, 2)} млн.`, s: "души, по националните сметки" },
          { l: "Добавена стойност на зает", v: `${fmt(prodAvg, 1)} хил. €`, s: "средно за икономиката" },
          { l: "Дял на заплатите в БВП", v: `${f1(pct(val("gdp_income", "D1", y), gdp))}%`, s: "заплати и осигуровки на наетите" },
        ].map((k) => (
          <div key={k.l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{k.l}</p><p className="display text-[2.4rem] leading-none mt-1">{k.v}</p><p className="text-xs text-muted mt-1">{k.s}</p></div>
        ))}
      </div>

      <section className="mb-14">
        <SectionTitle>Как тече икономиката, {y}</SectionTitle>
        <p className="text-[15px] -mt-2 mb-4 max-w-3xl">
          Отляво: кой харчи. В средата: колко от това се произвежда тук и колко изтича към внос ({f1(impShare)}% от цялото търсене). Отдясно: при кого остава създаденото у нас. Посочи поток за подробности.
        </p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MoneyFlow nodes={flowNodes} links={flowLinks} columns={["Кой харчи", "Общо търсене", "Създадено у нас", "Къде отива"]} minHeight={420} /></div>
        <p className="text-xs text-muted mt-2">Евростат, национални сметки (nama_10_gdp). Сумите по двата края се различават с малката статистическа разлика между метода на разходите и метода на доходите.</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Откъде идва: сектори</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Добавената стойност е това, което всеки сектор създава над материалите, които купува. Сборът на секторите плюс данъците върху продуктите прави БВП.</p>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule">
              <th className="p-3">Сектор</th><th className="p-3 num">Дял {y}</th><th className="p-3 num hidden md:table-cell">Дял {first}</th><th className="p-3 num hidden md:table-cell">ЕС</th>
              <th className="p-3 num">Ръст*</th><th className="p-3 num">Заети</th><th className="p-3 num">На зает</th><th className="p-3 num hidden sm:table-cell">Заплати**</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className={`border-t border-rule ${r.sub ? "text-muted" : ""}`}>
                  <td className={`p-3 ${r.sub ? "pl-8 text-sm" : ""}`}><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: r.color }} />{r.name}</td>
                  <td className="p-3 num font-semibold">{f1(r.share)}%</td>
                  <td className="p-3 num hidden md:table-cell">{f1(r.shareFirst)}%</td>
                  <td className="p-3 num hidden md:table-cell">{f1(r.shareEu)}%</td>
                  <td className={`p-3 num ${r.real != null && r.real < 0 ? "text-red" : ""}`}>{r.real == null ? "–" : `${r.real > 0 ? "+" : ""}${fmt(r.real, 1)}%`}</td>
                  <td className="p-3 num">{f1(r.emp)}%</td>
                  <td className="p-3 num">{r.prod ? `${fmt(r.prod, 1)} хил. €` : "–"}</td>
                  <td className="p-3 num hidden sm:table-cell">{f1(r.labour)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">* Среден реален годишен ръст за последните 5 години. ** Каква част от добавената стойност на сектора отива за заплати и осигуровки на наетите; останалото са печалби, доходи на самонаетите и данъци. „На зает“ е добавена стойност на един зает годишно (за {yEmp} г. заетост).</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white mt-6">
          <p className="font-semibold mb-2">Дял на секторите във времето, %</p>
          <MultiLine data={shareData} unit="%" height={380} />
        </div>
        <ul className="list-disc pl-5 mt-4 space-y-1.5 text-[15px] max-w-3xl">
          {(() => {
            const top = [...rows].filter((r) => !r.sub && r.prod && r.code !== "L").sort((a, b) => b.prod! - a.prod!);
            const it = rows.find((r) => r.code === "J")!, agr = rows.find((r) => r.code === "A")!;
            return (<>
              <li>Най-много стойност на зает създават <b>{top[0].short}</b> ({fmt(top[0].prod!, 1)} хил. €) и <b>{top[1].short}</b> ({fmt(top[1].prod!, 1)} хил. €). Най-малко: <b>{top.at(-1)!.short}</b> ({fmt(top.at(-1)!.prod!, 1)} хил. €).</li>
              <li>Недвижимите имоти изглеждат с огромна стойност на зает ({fmt(rows.find((r) => r.code === "L")!.prod!, 0)} хил. €), но това е счетоводно: в тях влиза и условният наем, който собствениците „плащат“ сами на себе си за дома, в който живеят. Затова не ги сравняваме с другите.</li>
              <li>Земеделието дава {f1(agr.share)}% от добавената стойност, но заема {f1(agr.emp)}% от заетите. Това е белег за ниска производителност и скрита безработица на село.</li>
              <li>ИТ и комуникациите са {f1(it.share)}% от икономиката при {f1(it.shareFirst)}% през {first} г.</li>
            </>);
          })()}
        </ul>
      </section>

      <section className="mb-14">
        <SectionTitle>За какво се харчи</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">БВП погледнат откъм купувачите: домакинствата, държавата, инвеститорите и чужбина. Вносът се изважда, защото е произведен другаде.</p>
        <div className="grid gap-3 sm:grid-cols-5 mb-4">
          {EXPENDITURE.map((e) => (
            <div key={e.code} className="ring-1 ring-rule rounded-sm p-3 bg-white"><p className="text-sm">{e.name}</p><p className="display text-[1.8rem]">{f1(pct(val("gdp_expenditure", e.code, y), gdp))}%</p><p className="text-xs text-muted">{bn(val("gdp_expenditure", e.code, y))}</p></div>
          ))}
        </div>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">Като дял от БВП, %</p><MultiLine data={expData} unit="%" height={340} /></div>
      </section>

      <section className="mb-14">
        <SectionTitle>При кого остава</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Същият БВП, разделен на доходи: заплати на наетите, печалби на фирмите (включително доходите на самонаетите) и данъците върху производството.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MultiLine data={incData} unit="%" height={320} /></div>
        <p className="text-[15px] mt-3 max-w-3xl">През {y} г. заплатите са {f1(pct(val("gdp_income", "D1", y), gdp))}% от БВП, а печалбите и доходите на самонаетите {f1(pct(val("gdp_income", "B2A3G", y), gdp))}%. За сравнение, през {first} г. заплатите са {f1(pct(val("gdp_income", "D1", first), val("gdp_income", "B1GQ", first)))}%.</p>
      </section>

      <section id="sabitiya" className="mb-14 scroll-mt-32 lg:scroll-mt-24">
        <SectionTitle>Решения и събития</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Средният реален растеж за трите години преди и трите години след всяко събитие. Съвпадението във времето не доказва причина: в същите години действат и много други фактори, например световната икономика.</p>
        <ol className="space-y-3">
          {EVENTS.map((e) => {
            const before = avg([e.year - 3, e.year - 2, e.year - 1]), after = avg([e.year, e.year + 1, e.year + 2]);
            return (
              <li key={e.year} className="ring-1 ring-rule rounded-sm p-4 bg-white hover:ring-2 hover:ring-green grid gap-3 md:grid-cols-[6rem_1fr_14rem]">
                <p className="display text-[2rem] leading-none">{e.year}</p>
                <div><p className="font-semibold"><Link href={`/ikonomika/sabitie/${e.slug}`}>{e.title} →</Link></p><p className="text-[15px]">{e.what}</p></div>
                <p className="text-sm">Растеж преди: <b>{before == null ? "няма данни" : `${fmt(before, 1)}%`}</b><br />Растеж след: <b>{after == null ? "още няма данни" : `${fmt(after, 1)}%`}</b></p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-14">
        <SectionTitle>По области</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">БВП на човек по области ({pcYear} г.). Всяка община е оцветена със стойността на своята област, защото Евростат не публикува БВП по общини.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white mb-6"><ChoroMap values={mapValues} color="#1F4D3A" legend="БВП на човек, € годишно" unit=" €" /></div>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Област</th><th className="p-3 num">Добавена стойност {ry}</th><th className="p-3 num">На човек</th><th className="p-3">Най-голям сектор</th>{REGIONAL_SECTORS.slice(0, 2).map((s) => <th key={s.code} className="p-3 num hidden md:table-cell">{s.name}</th>)}<th className="p-3 num hidden md:table-cell">ИТ</th></tr></thead>
            <tbody>
              {oblasts.map((o) => (
                <tr key={o.code} className="border-t border-rule">
                  <td className="p-3"><Link href={`/statistiki/gdp_pc_oblasts`}>{o.name}</Link></td>
                  <td className="p-3 num">{bn(o.tot)}</td>
                  <td className="p-3 num">{o.pc ? `${Math.round(o.pc).toLocaleString("bg-BG")} €` : "–"}</td>
                  <td className="p-3">{o.top.name} <span className="text-muted">{f1(o.top.share)}%</span></td>
                  {o.secs.slice(0, 2).map((s) => <td key={s.code} className="p-3 num hidden md:table-cell">{f1(s.share)}%</td>)}
                  <td className="p-3 num hidden md:table-cell">{f1(o.secs.find((s) => s.code === "J")?.share)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted">Източник: Евростат, национални сметки: <a href={eurostatUrl("nama_10_a10")} target="_blank" rel="noreferrer">nama_10_a10</a>, <a href={eurostatUrl("nama_10_a10_e")} target="_blank" rel="noreferrer">nama_10_a10_e</a>, <a href={eurostatUrl("nama_10_gdp")} target="_blank" rel="noreferrer">nama_10_gdp</a>, <a href={eurostatUrl("nama_10r_3gva")} target="_blank" rel="noreferrer">nama_10r_3gva</a>, <a href={eurostatUrl("nama_10r_3gdp")} target="_blank" rel="noreferrer">nama_10r_3gdp</a>. Следват: чуждестранните инвестиции, евросредствата и паричните потоци.</p>
    </Page>
  );
}
