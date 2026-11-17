import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, SectionTitle, Title } from "@/components/ui";
import { REGIONAL_SECTORS, val } from "@/lib/economy";
import { findOblastBySlug, muniElection, muniFinance, muniFunds, muniSlug, oblastList, oblastStats } from "@/lib/regions";
import { STATS, fmt } from "@/lib/stats";
import { ChoroMap } from "@/components/ChoroMap";
import { AGE, EDU, PLACE_OBL, placeData, share } from "@/lib/place";

export function generateStaticParams() { return oblastList().map((o) => ({ obl: o.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ obl: string }> }) {
  const { obl } = await params; const o = findOblastBySlug(obl); return { title: o ? `Област ${o.name}` : "Област" };
}
const mn = (v?: number | null) => (v == null ? "–" : `${fmt(v / 1e6, 1)} млн. €`);

export default async function OblastPage({ params }: { params: Promise<{ obl: string }> }) {
  const { obl } = await params;
  const o = findOblastBySlug(obl);
  if (!o) notFound();
  const s = oblastStats(o.prefix, o.municipalities);
  const yrs = s.nuts ? Object.keys(STATS.series.gva_oblasts?.lines[`${s.nuts}|TOTAL`] ?? {}).map(Number) : [];
  const gy = yrs.length ? Math.max(...yrs) : 0;
  const tot = s.nuts ? val("gva_oblasts", `${s.nuts}|TOTAL`, gy) : undefined;
  const secs = s.nuts && tot ? REGIONAL_SECTORS.map((x) => ({ ...x, share: ((val("gva_oblasts", `${s.nuts}|${x.code}`, gy) ?? 0) / tot) * 100 })).sort((a, b) => b.share - a.share) : [];
  const munis = o.municipalities.map((m) => ({ m, f: muniFunds(m.code), fin: muniFinance(m.code), el: muniElection(m.code) })).sort((a, b) => (b.f?.pop ?? 0) - (a.f?.pop ?? 0));
  const agg = munis.reduce((a, x) => { x.el?.lists.forEach((l) => { a[l.name] = { ...l, votes: (a[l.name]?.votes ?? 0) + l.votes }; }); return a; }, {} as Record<string, { name: string; color: string; slug: string; votes: number }>);
  const aggTot = munis.reduce((a, x) => a + (x.el?.total ?? 0), 0);
  const lists = Object.values(agg).sort((a, b) => b.votes - a.votes);
  const OC = PLACE_OBL.oblasts[o.prefix], BG = PLACE_OBL.country;
  const eduT = (c: { education: Record<string, number> }) => EDU.reduce((a, [k]) => a + (c.education[k] ?? 0), 0);
  const prof = o.municipalities.map((m) => ({ m, p: placeData(m.code) })).filter((x) => x.p?.census).map(({ m, p }) => {
    const c = p!.census!;
    return { m, pop: c.population, old: share(c.age.age65plus, c.population), young: share(c.age.age0_14, c.population), uni: share(c.education.tertiary, eduT(c)), unemp: c.employment.unemploymentRate, ipop: p!.ipop?.rollup.agreementEur ?? 0 };
  }).sort((a, b) => b.pop - a.pop);

  return (
    <Page>
      <Title back={{ href: "/mesta", label: "Всички области" }} kicker="Област" lead={`${o.municipalities.length} общини, ${s.pop ? s.pop.toLocaleString("bg-BG") : "–"} жители.`}>{o.name}</Title>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">БВП на човек{ s.gdpPc ? `, ${s.gdpPc.year}` : ""}</p><p className="display text-[2.2rem]">{s.gdpPc ? `${Math.round(s.gdpPc.value).toLocaleString("bg-BG")} €` : "–"}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Добавена стойност{gy ? `, ${gy}` : ""}</p><p className="display text-[2.2rem]">{tot ? `${fmt(tot / 1000, 1)} млрд. €` : "–"}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства (договорени)</p><p className="display text-[2.2rem]">{mn(s.eu)}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства на човек</p><p className="display text-[2.2rem]">{s.euPc ? `${Math.round(s.euPc).toLocaleString("bg-BG")} €` : "–"}</p></div>
      </div>

      {secs.length > 0 && (
        <section className="mb-12">
          <SectionTitle>С какво се изкарва прехраната</SectionTitle>
          <ul className="space-y-2 max-w-3xl">{secs.map((x) => (
            <li key={x.code} className="text-[15px]"><div className="flex justify-between"><span>{x.name}</span><span className="num">{fmt(x.share, 1)}%</span></div>
              <div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full bg-green" style={{ width: `${x.share}%` }} /></div></li>
          ))}</ul>
          <p className="text-xs text-muted mt-2">Дял от добавената стойност в областта, Евростат (nama_10r_3gva), {gy} г.</p>
        </section>
      )}

      {lists.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Как гласува на 19 април 2026 г.</SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{lists.map((l) => (
            <li key={l.name} className="ring-1 ring-rule rounded-sm p-3 bg-white flex justify-between items-center"><Link href={`/parlament/partiya/${l.slug}`} className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: l.color }} />{l.name}</Link><span className="num font-semibold">{fmt((l.votes / aggTot) * 100, 1)}%</span></li>
          ))}</ul>
        </section>
      )}

      {OC && (
        <section className="mb-12">
          <SectionTitle>Хората</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Преброяване 2021 г. (НСИ), спрямо страната.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[
              ["Деца до 14 г.", share(OC.age.age0_14, OC.population), share(BG.age.age0_14, BG.population)],
              ["Над 65 г.", share(OC.age.age65plus, OC.population), share(BG.age.age65plus, BG.population)],
              ["С висше образование", share(OC.education.tertiary, eduT(OC)), share(BG.education.tertiary, eduT(BG))],
              ["Безработни (от активните)", OC.employment.unemploymentRate, null],
            ].map(([l, v, b]) => (
              <div key={l as string} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2.2rem] mt-1">{fmt(v as number, 1)}%</p><p className="text-xs text-muted">{b != null ? `страната: ${fmt(b as number, 1)}%` : ""}</p></div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">Дял на хората над 65 г.</p><ChoroMap values={Object.fromEntries(prof.map((x) => [x.m.code, { name: x.m.name, value: Math.round(x.old * 10) / 10 }]))} color="#c8102e" legend="% над 65 г." unit="%" decimals={1} /></div>
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">Държавни инвестиции на жител</p><ChoroMap values={Object.fromEntries(prof.map((x) => [x.m.code, { name: x.m.name, value: Math.round(x.ipop / x.pop) }]))} color="#1F4D3A" legend="€ на жител" unit=" €" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px] num">
              <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Община</th><th className="text-right px-2">Жители</th><th className="text-right px-2">До 14 г.</th><th className="text-right px-2">Над 65 г.</th><th className="text-right px-2">Висше</th><th className="text-right px-2">Безработни</th><th className="text-right px-2">Държавни инвестиции</th></tr></thead>
              <tbody>{prof.map((x) => (
                <tr key={x.m.code} className="border-b border-rule">
                  <td className="py-1.5 pr-3"><Link href={`/mesta/${o.slug}/${muniSlug(x.m.code)}`}>{x.m.name}</Link></td>
                  <td className="text-right px-2">{x.pop.toLocaleString("bg-BG")}</td>
                  <td className="text-right px-2">{fmt(x.young, 1)}%</td>
                  <td className={`text-right px-2 ${x.old > 30 ? "text-red font-semibold" : ""}`}>{fmt(x.old, 1)}%</td>
                  <td className="text-right px-2">{fmt(x.uni, 1)}%</td>
                  <td className={`text-right px-2 ${x.unemp > 15 ? "text-red font-semibold" : ""}`}>{fmt(x.unemp, 1)}%</td>
                  <td className="text-right px-2">{x.ipop ? mn(x.ipop) : "–"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-2">В червено: над 30% възрастни над 65 г. или над 15% безработни. Държавни инвестиции: договорени по Инвестиционната програма за общински проекти (МРРБ).</p>
        </section>
      )}

      <section className="mb-12">
        <SectionTitle>Общините</SectionTitle>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Община</th><th className="p-3 num">Жители</th><th className="p-3 num">Собствени приходи*</th><th className="p-3 num">Дълг</th><th className="p-3 num">Евросредства на човек</th><th className="p-3 hidden md:table-cell">Първа на изборите</th></tr></thead>
            <tbody>{munis.map(({ m, f, fin, el }) => (
              <tr key={m.code} className="border-t border-rule">
                <td className="p-3"><Link href={`/mesta/${o.slug}/${muniSlug(m.code)}`} className="font-semibold">{m.name}</Link>{fin?.recovery && <span className="text-xs ml-2 bg-[#fbecc4] rounded-full px-2 py-0.5">в оздравяване</span>}</td>
                <td className="p-3 num">{f?.pop ? f.pop.toLocaleString("bg-BG") : "–"}</td>
                <td className="p-3 num">{mn(fin?.revenue)}</td>
                <td className="p-3 num">{mn(fin?.debt)}</td>
                <td className="p-3 num">{f ? `${Math.round(f.perCapita).toLocaleString("bg-BG")} €` : "–"}</td>
                <td className="p-3 hidden md:table-cell">{el ? `${el.lists[0].name} ${fmt(el.lists[0].pct, 0)}%` : "–"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">* Местни данъци, такси и други собствени приходи за последния отчетен период на МФ ({munis.find((x) => x.fin)?.fin?.period ?? "–"}), не за цяла година.</p>
      </section>
    </Page>
  );
}
