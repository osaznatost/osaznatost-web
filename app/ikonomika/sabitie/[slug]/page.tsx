import Link from "next/link";
import { notFound } from "next/navigation";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { EVENTS, EVENT_INDICATORS, findEvent } from "@/lib/economy";
import { STATS, fmt } from "@/lib/stats";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = findEvent((await params).slug);
  return { title: e ? `${e.year}: ${e.title}` : "Събитие" };
}

const v = (id: string, key: string, y: number) => STATS.series[id]?.lines[key]?.[String(y)];
const mean = (id: string, key: string, ys: number[]) => {
  const a = ys.map((y) => v(id, key, y)).filter((x): x is number => x != null);
  return a.length === ys.length ? a.reduce((s, x) => s + x, 0) / a.length : undefined;
};

export default async function Sabitie({ params }: { params: Promise<{ slug: string }> }) {
  const e = findEvent((await params).slug);
  if (!e) notFound();
  const before = [e.year - 3, e.year - 2, e.year - 1], after = [e.year, e.year + 1, e.year + 2];
  const rows = EVENT_INDICATORS.filter((i) => STATS.series[i.id]).map((i) => {
    const b = mean(i.id, i.key, before), a = mean(i.id, i.key, after);
    const d = a != null && b != null ? a - b : undefined;
    const good = d == null || i.better == null || Math.abs(d) < 0.05 ? null : (d > 0) === (i.better === "up");
    const eu = i.key === "BG" ? { b: mean(i.id, "EU27_2020", before), a: mean(i.id, "EU27_2020", after) } : null;
    return { ...i, b, a, d, good, eu };
  });
  const from = e.year - 8, to = e.year + 6;
  const chart = (id: string, key = "BG") => ["BG", "EU27_2020"].flatMap((k) => Object.entries(STATS.series[id]?.lines[key === "BG" ? k : key] ?? {}).filter(([y]) => /^\d{4}$/.test(y) && +y >= from && +y <= to).map(([y, val]) => ({ series: k === "BG" ? "България" : "ЕС", x: +y, value: val })));
  const idx = EVENTS.findIndex((x) => x.slug === e.slug);
  const prev = EVENTS[idx - 1], next = EVENTS[idx + 1];
  const f = (x?: number, u = "") => (x == null ? "няма данни" : `${fmt(x, 1)}${u === "млн. €" ? " млн. €" : u.startsWith("%") ? "%" : ""}`);

  return (
    <Page>
      <Title back={{ href: "/ikonomika/struktura#sabitiya", label: "Решения и събития" }} kicker={String(e.year)} lead={e.what}>{e.title}</Title>

      {(e.why || e.effects?.length) && (
        <section className="grid gap-6 md:grid-cols-2 mb-12 max-w-5xl text-[15px]">
          {e.why && <div><h3 className="font-semibold text-lg mb-1">Защо се стига дотам</h3><p>{e.why}</p></div>}
          {e.effects?.length ? <div><h3 className="font-semibold text-lg mb-1">Какво последва</h3><ul className="list-disc pl-5 space-y-1">{e.effects.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        </section>
      )}

      <section className="mb-12">
        <SectionTitle>Три години преди и три години след</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Средно за {before[0]}–{before[2]} г. срещу {after[0]}–{after[2]} г. Данните се обновяват сами с всяка нова година от Евростат. Съвпадението във времето не доказва, че събитието е причината.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] num">
            <thead><tr className="border-b border-rule text-left"><th className="py-2 pr-3">Показател</th><th className="px-2 text-right">Преди</th><th className="px-2 text-right">След</th><th className="px-2 text-right">Промяна</th><th className="px-2 text-right text-muted">ЕС преди → след</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-rule">
                <td className="py-2 pr-3"><Link href={`/statistiki/${r.id}`}>{r.label}</Link> <span className="text-xs text-muted">{r.unit}</span></td>
                <td className="px-2 text-right">{f(r.b, r.unit)}</td>
                <td className="px-2 text-right">{r.a == null ? (e.year + 2 > new Date(STATS.updated).getFullYear() ? "още няма" : "няма данни") : f(r.a, r.unit)}</td>
                <td className={`px-2 text-right font-semibold ${r.good == null ? "" : r.good ? "text-[#2f9e6a]" : "text-red"}`}>{r.d == null ? "–" : `${r.d > 0 ? "+" : ""}${fmt(r.d, 1)}`}</td>
                <td className="px-2 text-right text-muted">{r.eu && r.eu.b != null && r.eu.a != null ? `${fmt(r.eu.b, 1)} → ${fmt(r.eu.a, 1)}` : ""}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">Зелено: промяната е към по-добро за хората, червено: към по-лошо. Сравнението с ЕС показва дали промяната е само у нас или навсякъде.</p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2 mb-12">
        {[["gdp_growth", "Реален растеж, %"], ["unemployment", "Безработица, %"], ["inflation", "Инфлация, %"], ["debt", "Държавен дълг, % от БВП"]].map(([id, t]) => (
          <div key={id}><h3 className="font-semibold mb-2">{t}</h3><MultiLine data={chart(id)} unit="%" /></div>
        ))}
      </section>

      {e.sources?.length ? <p className="text-sm mb-6">Източници: {e.sources.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)}</p> : null}
      <p className="text-[15px] flex justify-between gap-4">
        <span>{prev && <Link href={`/ikonomika/sabitie/${prev.slug}`}>← {prev.year}: {prev.title}</Link>}</span>
        <span>{next && <Link href={`/ikonomika/sabitie/${next.slug}`}>{next.year}: {next.title} →</Link>}</span>
      </p>
    </Page>
  );
}
