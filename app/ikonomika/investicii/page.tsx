import Link from "next/link";
import { BarRank, MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { COUNTRY_BG, FDI_MANUF, FDI_SECTORS, TRANSIT, val, years } from "@/lib/economy";
import { STATS, eurostatUrl, fmt } from "@/lib/stats";

export const metadata = { title: "Чуждестранни инвестиции" };

const bn = (v?: number) => (v == null ? "–" : `${fmt(v / 1000, 1)} млрд. €`);
const mn = (v?: number) => (v == null ? "–" : `${Math.round(v).toLocaleString("bg-BG")} млн. €`);

export default function Investicii() {
  const W = "WRL_REST";
  const y = years("fdi_stock_partner", W).at(-1)!;
  const stock = val("fdi_stock_partner", W, y), flow = val("fdi_flow_partner", W, y), income = val("fdi_income_partner", W, y);
  const gdp = val("gdp_expenditure", "B1GQ", y) ?? val("gdp_expenditure", "B1GQ", y - 1);
  const flowYears = years("fdi_flow_partner", W);
  const flowData = [
    ...flowYears.map((x) => ({ series: "Нови вложения (поток)", x, value: Math.round(val("fdi_flow_partner", W, x)) })),
    ...years("fdi_income_partner", W).map((x) => ({ series: "Доход на чуждите инвеститори", x, value: Math.round(val("fdi_income_partner", W, x)) })),
  ];
  const stockData = years("fdi_stock_partner", W).map((x) => ({ series: "Натрупани вложения", x, value: Math.round(val("fdi_stock_partner", W, x)) }));
  const base = 2015;
  const countries = Object.keys(STATS.series.fdi_stock_partner.lines).filter((k) => COUNTRY_BG[k]).map((k) => {
    const s = val("fdi_stock_partner", k, y), s0 = val("fdi_stock_partner", k, base);
    const f3 = [y - 2, y - 1, y].map((yy) => val("fdi_flow_partner", k, yy)).filter((v) => v != null);
    const inc = val("fdi_income_partner", k, y);
    return { k, name: COUNTRY_BG[k], s, s0, f3: f3.length ? f3.reduce((a, b) => a + b, 0) : undefined, inc, ret: s && inc != null ? (inc / s) * 100 : undefined };
  }).filter((c) => c.s && c.s > 0).sort((a, b) => b.s! - a.s!);
  const top = countries.slice(0, 25);
  const sectors = FDI_SECTORS.map((s) => ({ ...s, v: val("fdi_stock_ind", s.code, y), v0: val("fdi_stock_ind", s.code, base), f: val("fdi_flow_ind", s.code, y) })).filter((s) => s.v != null).sort((a, b) => b.v! - a.v!);
  const manuf = FDI_MANUF.map((s) => ({ name: s.name, value: Math.round(val("fdi_stock_ind", s.code, y) ?? 0) })).sort((a, b) => b.value - a.value);
  const sumFlow = flowYears.reduce((a, x) => a + (val("fdi_flow_partner", W, x) ?? 0), 0);
  const sumInc = flowYears.reduce((a, x) => a + (val("fdi_income_partner", W, x) ?? 0), 0);

  return (
    <Page>
      <Title back={{ href: "/ikonomika", label: "Икономика" }} lead="Колко са вложили чуждите компании в България, от кои държави, в кои отрасли и колко печелят от това. По данните на БНБ, предадени на Евростат.">
        Чуждестранни инвестиции
      </Title>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          { l: `Натрупани вложения, ${y}`, v: bn(stock), s: gdp ? `${fmt((stock / gdp) * 100, 0)}% от БВП` : "" },
          { l: `Нови вложения, ${y}`, v: bn(flow), s: "нетен приток за годината" },
          { l: `Доход на инвеститорите, ${y}`, v: bn(income), s: "печалби: изплатени и реинвестирани" },
          { l: "Доходност", v: `${fmt((income / stock) * 100, 1)}%`, s: "доход спрямо натрупаните вложения" },
        ].map((k) => (
          <div key={k.l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{k.l}</p><p className="display text-[2.4rem] leading-none mt-1">{k.v}</p><p className="text-xs text-muted mt-1">{k.s}</p></div>
        ))}
      </div>

      <section className="mb-14">
        <SectionTitle>Влизат ли повече, отколкото излизат</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Сравнение на новите вложения с дохода, който чуждите собственици получават от вече вложеното. Доходът включва и реинвестираната печалба, която остава в България и се брои и като ново вложение. Затова двете линии се застъпват отчасти и не бива просто да се изваждат.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MultiLine data={flowData} yLabel="млн. €" height={320} /></div>
        <p className="text-[15px] mt-3 max-w-3xl">За {flowYears[0]}–{y} г. новите вложения са общо {bn(sumFlow)}, а доходът на чуждите инвеститори {bn(sumInc)}. Растящият доход показва, че вложеното носи печалба. Колко от нея напуска страната, зависи от дела на изплатените дивиденти; Евростат не го дава в този набор и го търсим в данните на БНБ.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white mt-6"><p className="font-semibold mb-2">Натрупани вложения, млн. €</p><MultiLine data={stockData} yLabel="млн. €" height={260} /></div>
      </section>

      <section className="mb-14">
        <SectionTitle>От кои държави</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">По държавата на непосредствения инвеститор. Когато тя е Нидерландия, Кипър, Люксембург или офшорна зона, често това е холдинг, а крайният собственик е другаде. Такива държави са отбелязани с *.</p>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Държава</th><th className="p-3 num">Натрупано {y}</th><th className="p-3 num hidden sm:table-cell">Дял</th><th className="p-3 num hidden md:table-cell">{base}</th><th className="p-3 num">Нови за 3 г.</th><th className="p-3 num">Доход {y}</th><th className="p-3 num hidden sm:table-cell">Доходност</th></tr></thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.k} className="border-t border-rule">
                  <td className="p-3">{c.name}{TRANSIT.has(c.k) && <span className="text-muted"> *</span>}</td>
                  <td className="p-3 num font-semibold">{mn(c.s)}</td>
                  <td className="p-3 num hidden sm:table-cell">{fmt((c.s! / stock) * 100, 1)}%</td>
                  <td className="p-3 num hidden md:table-cell">{mn(c.s0)}</td>
                  <td className={`p-3 num ${c.f3 != null && c.f3 < 0 ? "text-red" : ""}`}>{mn(c.f3)}</td>
                  <td className="p-3 num">{mn(c.inc)}</td>
                  <td className="p-3 num hidden sm:table-cell">{c.ret == null ? "–" : `${fmt(c.ret, 1)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">Отрицателните „нови“ означават, че инвеститорите от тази държава са изтеглили повече, отколкото са вложили (продажби, погасени заеми към майката).</p>
      </section>

      <section className="mb-14">
        <SectionTitle>В кои отрасли</SectionTitle>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white mb-6">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Отрасъл</th><th className="p-3 num">Натрупано {y}</th><th className="p-3 num">Дял</th><th className="p-3 num hidden sm:table-cell">{base}</th><th className="p-3 num">Нови {y}</th></tr></thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.code} className="border-t border-rule">
                  <td className="p-3">{s.name}</td><td className="p-3 num font-semibold">{mn(s.v)}</td><td className="p-3 num">{fmt((s.v! / stock) * 100, 1)}%</td>
                  <td className="p-3 num hidden sm:table-cell">{mn(s.v0)}</td><td className={`p-3 num ${s.f != null && s.f < 0 ? "text-red" : ""}`}>{mn(s.f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">Преработващата промишленост по видове, млн. € ({y})</p><BarRank data={manuf} /></div>
        <p className="text-[15px] mt-3 max-w-3xl">Най-много чужд капитал е във финансите, имотите и търговията. Те обслужват вътрешния пазар. Промишлеността и ИТ, които изнасят и създават най-много стойност на зает (виж <Link href="/ikonomika/struktura">анатомията на икономиката</Link>), привличат по-малка част.</p>
      </section>

      <section className="mb-10 bg-surface rounded-sm p-5 max-w-3xl">
        <p className="font-semibold mb-1">Какво следва</p>
        <ul className="list-disc pl-5 text-[15px] space-y-1">
          <li>Чуждите инвестиции по области (НСИ). Евростат не ги дава по региони.</li>
          <li>Европейските средства по проекти, бенефициенти и общини (ИСУН).</li>
          <li>Държавните инвестиции от бюджета, свързани с обществените поръчки.</li>
          <li>Сертифицираните инвеститори по Закона за насърчаване на инвестициите.</li>
        </ul>
      </section>

      <p className="text-xs text-muted">Източник: Евростат, преки инвестиции по методиката BPM6: <a href={eurostatUrl("bop_fdi6_geo")} target="_blank" rel="noreferrer">bop_fdi6_geo</a>, <a href={eurostatUrl("bop_fdi6_pos")} target="_blank" rel="noreferrer">bop_fdi6_pos</a>, <a href={eurostatUrl("bop_fdi6_flow")} target="_blank" rel="noreferrer">bop_fdi6_flow</a>. Първичен източник: БНБ.</p>
    </Page>
  );
}
