import Link from "next/link";
import { BarRank, MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { GEO, STATS } from "@/lib/stats";

export const metadata = { title: "Покупателна способност" };

const COUNTRIES = ["BG", "RO", "HR", "EL", "PL", "HU", "ES", "DE"];
/** Категории от сравнението на цените в ЕС (Евростат, prc_ppp_ind). */
const CATS: { code: string; label: string; note?: string }[] = [
  { code: "A010101", label: "Храна" },
  { code: "A01010101", label: "Хляб и зърнени храни" },
  { code: "A01010102", label: "Месо" },
  { code: "A01010103", label: "Риба" },
  { code: "A01010104", label: "Мляко, сирене, яйца" },
  { code: "A01010105", label: "Олио и мазнини" },
  { code: "A01010106", label: "Плодове, зеленчуци, картофи" },
  { code: "A010102", label: "Безалкохолни напитки" },
  { code: "A010201", label: "Алкохол" },
  { code: "A010202", label: "Цигари" },
  { code: "A010301", label: "Дрехи" },
  { code: "A010302", label: "Обувки" },
  { code: "A010405", label: "Ток, газ, отопление" },
  { code: "A0104", label: "Жилище с вода и енергия", note: "включва и наемите" },
  { code: "A010503", label: "Домакински уреди" },
  { code: "A0106", label: "Здраве" },
  { code: "A010701", label: "Коли" },
  { code: "A010703", label: "Обществен транспорт" },
  { code: "A0108", label: "Телефон и интернет" },
  { code: "A010901", label: "Телевизори, компютри, техника" },
  { code: "A0111", label: "Ресторанти и хотели" },
  { code: "A01", label: "Всичко, което потребяват домакинствата" },
];

/** Последна стойност на ред (ключ) в серия; връща [период, стойност]. */
function lastOf(id: string, key: string): [string, number] | undefined {
  const l = STATS.series[id]?.lines[key];
  if (!l) return;
  const e = Object.entries(l).sort((a, b) => (a[0] < b[0] ? -1 : 1)).at(-1);
  return e ? [e[0], e[1]] : undefined;
}
const pli = (geo: string, cat: string) => lastOf("price_levels", `${geo}|${cat}`)?.[1];
const wkey = (g: string) => (g === "EL" ? "GR" : g);
const wage = (geo: string) => lastOf("min_wage_all", wkey(geo))?.[1] ?? lastOf("min_wage_all", geo)?.[1] ?? lastOf("min_wage", wkey(geo))?.[1];
const eur = (v?: number) => (v == null ? "–" : `${Math.round(v).toLocaleString("bg-BG")} €`);
const name = (g: string) => GEO[g] ?? g;

export default function PokupatelnaSila() {
  const hasPli = !!STATS.series.price_levels;
  const wPeriod = lastOf("min_wage_all", "BG")?.[0] ?? lastOf("min_wage", "BG")?.[0];
  const pliYear = hasPli ? lastOf("price_levels", "BG|A010101")?.[0] : undefined;
  const countries = COUNTRIES.filter((g) => wage(g) != null);

  // Колко струва реално заплатата: заплата / (ниво на цените / 100) = колко евро по средни европейски цени.
  const real = (g: string, cat: string) => { const w = wage(g), p = pli(g, cat); return w != null && p ? w / (p / 100) : undefined; };
  const bg = wage("BG"), ro = wage("RO");

  const pps = STATS.series.min_wage_pps ? countries.map((g) => ({ name: name(g), value: Math.round((lastOf("min_wage_pps", wkey(g)) ?? lastOf("min_wage_pps", g))?.[1] ?? 0) })).filter((r) => r.value).sort((a, b) => b.value - a.value) : [];
  const wageHist = ["BG", "RO", "HR", "PL", "GR"].flatMap((g) => Object.entries(STATS.series.min_wage?.lines[g] ?? {}).filter(([k]) => /S1$/.test(k) && Number(k.slice(0, 4)) >= 2010).map(([k, v]) => ({ series: name(g), x: Number(k.slice(0, 4)), value: v })));

  return (
    <Page>
      <Title back={{ href: "/ikonomika", label: "Икономика" }} kicker="Заплати и цени"
        lead={<>Сравнението на заплатите в евро подвежда, защото цените в различните страни са различни. Тук смятаме колко реално купува минималната заплата: колко храна, ток, горива и други неща, в сравнение със съседите.</>}>
        Какво купува минималната заплата
      </Title>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-12">
        {[
          ["Минимална заплата в България", eur(bg), wPeriod ? `бруто, ${wPeriod.replace("-S1", ", първо полугодие").replace("-S2", ", второ полугодие")}` : ""],
          ["В Румъния", eur(ro), bg && ro ? `${Math.round(((ro - bg) / bg) * 100)}% повече в евро` : ""],
          ["Храна в България спрямо ЕС", hasPli && pli("BG", "A010101") ? `${Math.round(pli("BG", "A010101")!)}%` : "–", "от средната европейска цена"],
          ["Храна в Румъния спрямо ЕС", hasPli && pli("RO", "A010101") ? `${Math.round(pli("RO", "A010101")!)}%` : "–", "от средната европейска цена"],
        ].map(([l, v, n]) => (
          <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words">{v}</p><p className="text-xs text-muted">{n}</p></div>
        ))}
      </section>

      <section className="mb-14">
        <SectionTitle>Колко струва минималната заплата по средни европейски цени</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">
          {hasPli && bg && pli("BG", "A01010101") ? <>Пример: хлябът и зърнените храни в България струват {Math.round(pli("BG", "A01010101")!)}% от средната европейска цена. Затова {eur(bg)} купуват толкова хляб, колкото {eur(real("BG", "A01010101"))} в средна европейска страна. В Румъния същото е {eur(real("RO", "A01010101"))}.</> : null} Колкото по-голямо е числото, толкова повече от това нещо купува заплатата.
        </p>
        {!hasPli ? (
          <p className="text-[15px] bg-surface rounded-sm p-4">Сравнението на цените по категории от Евростат се зарежда със следващото обновяване на данните. Дотогава вижте <Link href="/statistiki/min_wage_pps">минималната заплата при равни цени</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px] num">
              <thead><tr className="text-left border-b border-rule"><th className="py-2 pr-3 font-semibold">Какво</th>{countries.map((g) => <th key={g} className={`py-2 px-2 text-right font-semibold ${g === "BG" ? "bg-surface" : ""}`}>{name(g)}</th>)}</tr></thead>
              <tbody>
                {CATS.filter((c) => pli("BG", c.code)).map((c) => {
                  const vals = countries.map((g) => real(g, c.code));
                  const best = Math.max(...vals.filter((v): v is number => v != null));
                  return (
                    <tr key={c.code} className="border-b border-rule">
                      <td className="py-2 pr-3">{c.label}{c.note && <span className="block text-xs text-muted">{c.note}</span>}<span className="block text-xs text-muted">цени в България: {Math.round(pli("BG", c.code)!)}% от ЕС</span></td>
                      {countries.map((g, i) => {
                        const v = vals[i];
                        const vsBg = v && vals[0] ? Math.round(((v - vals[0]) / vals[0]) * 100) : null;
                        return <td key={g} className={`py-2 px-2 text-right ${g === "BG" ? "bg-surface font-semibold" : ""} ${v === best ? "text-green font-semibold" : ""}`}>{eur(v)}{g !== "BG" && vsBg != null && <span className={`block text-xs ${vsBg > 0 ? "text-green" : "text-red"}`}>{vsBg > 0 ? "+" : ""}{vsBg}% спрямо БГ</span>}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-2">Зелено: най-много за тази категория. Цени: Евростат, сравнителни ценови нива ({pliYear}). Заплати: Евростат, минимални заплати ({wPeriod}).</p>
          </div>
        )}
      </section>

      {hasPli && (
        <section className="mb-14">
          <SectionTitle>Колко по-скъпо или по-евтино е в България</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Ниво на цените по категории, средното за ЕС = 100. Под 100 означава по-евтино от средното. Ниските цени не компенсират напълно ниските заплати: храната е близо до европейските цени, а заплатите са далеч под тях.</p>
          <BarRank data={CATS.filter((c) => pli("BG", c.code)).map((c) => ({ name: c.label, value: Math.round(pli("BG", c.code)!) }))} unit="" />
        </section>
      )}

      {pps.length > 0 && (
        <section className="mb-14">
          <SectionTitle>Минималната заплата при равни цени</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Евростат преизчислява заплатите в „стандарт на покупателна способност“: изкуствена валута, с която във всяка страна се купува едно и също количество стоки и услуги.</p>
          <BarRank data={pps} unit=" PPS" highlight="България" />
        </section>
      )}

      {wageHist.length > 0 && (
        <section className="mb-14">
          <SectionTitle>Минималната заплата през годините, € (януари)</SectionTitle>
          <MultiLine data={wageHist} unit=" €" />
        </section>
      )}

      <section className="mb-10 max-w-3xl text-[15px] space-y-2">
        <SectionTitle>Как да четем това</SectionTitle>
        <p>Минималната заплата е брутна: преди осигуровки и данък. Чистата сума е по-малка и делът на удръжките е различен във всяка страна.</p>
        <p>Ценовите нива са средни за страната. В големите градове цените са по-високи, особено наемите.</p>
        <p>Евростат публикува сравнението на цените веднъж годишно, със закъснение от около година. Заплатите са по-нови. Затова сравнението е приблизително.</p>
        <p>Свързано: <Link href="/statistiki/min_wage_all">минимална заплата</Link>, <Link href="/statistiki/avg_wage">средна заплата</Link>, <Link href="/statistiki/inflation_food">поскъпване на храната</Link>.</p>
      </section>
    </Page>
  );
}
