import Link from "next/link";
import { notFound } from "next/navigation";
import { BarRank, MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { CATALOG } from "@/lib/statCatalog";
import { correlations, keyLabel, obs, strength, summary } from "@/lib/statLib";
import { STATS, eurostatUrl, fmt } from "@/lib/stats";

export function generateStaticParams() {
  return Object.keys(CATALOG).filter((id) => STATS.series[id]).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: CATALOG[id]?.title ?? "Статистика" };
}

const period = (x: number | string) => String(x).replace(/^(\d{4})-(\d{2})$/, "$2.$1");
const num = (v: number) => (Math.abs(v) >= 10000 ? Math.round(v).toLocaleString("bg-BG") : fmt(v, Math.abs(v) < 10 ? 2 : 1));
const BETTER = { up: "По-високата стойност е по-добра за хората.", down: "По-ниската стойност е по-добра за хората." };

export default async function StatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = CATALOG[id];
  const series = STATS.series[id];
  if (!info || !series) notFound();
  const s = summary(id);
  const keys = Object.keys(series.lines);
  const lastX = obs(id, keys[0]).at(-1)?.x;
  // При много региони: трите с най-висока и трите с най-ниска стойност, иначе линиите не се четат.
  const valAt = (k: string) => obs(id, k).find((o) => o.x === lastX)?.value ?? 0;
  const chartKeys = keys.length > 8 ? [...keys].sort((a, b) => valAt(b) - valAt(a)).filter((_, i, a) => i < 3 || i >= a.length - 3) : keys;
  const toRows = (from: number) => chartKeys.flatMap((k) => obs(id, k).filter((o) => typeof o.x !== "number" || o.x >= from).map((o) => ({ series: keyLabel(id, k), x: o.x, value: o.value })));
  const years = obs(id, s.key ?? keys[0]).map((o) => o.x).filter((x): x is number => typeof x === "number");
  const cut = years.length > 21 ? years.at(-1)! - 20 : 0;
  const chartData = toRows(cut);
  const ranking = info.regional && lastX != null
    ? keys.map((k) => ({ name: keyLabel(id, k), value: obs(id, k).find((o) => o.x === lastX)?.value })).filter((r): r is { name: string; value: number } => r.value != null).sort((a, b) => b.value - a.value)
    : [];
  const corr = correlations(id).slice(0, 6);
  const sameTopic = Object.entries(CATALOG).filter(([k, v]) => v.topic === info.topic && k !== id && STATS.series[k]);

  return (
    <Page>
      <Title back={{ href: "/statistiki", label: "Всички показатели" }} kicker={info.topic} lead={info.what}>{info.title}</Title>

      {!info.regional && s.last && (
        <div className="grid gap-3 sm:grid-cols-3 mb-10">
          <div className="bg-surface rounded-sm p-4">
            <p className="text-sm text-muted">{keyLabel(id, s.key)}, {period(s.last.x)}</p>
            <p className="display text-[2.6rem] leading-none mt-1">{num(s.last.value)}</p>
            <p className="text-xs text-muted mt-1">{info.unit}</p>
          </div>
          {s.change != null && (
            <div className="bg-surface rounded-sm p-4">
              <p className="text-sm text-muted">Промяна спрямо {period(s.prev!.x)}</p>
              <p className={`display text-[2.6rem] leading-none mt-1 ${s.good === true ? "text-[#1f7a4a]" : s.good === false ? "text-red" : ""}`}>{s.change > 0 ? "+" : ""}{num(s.change)}</p>
              <p className="text-xs text-muted mt-1">{s.good === true ? "в добрата посока" : s.good === false ? "в лошата посока" : "посоката зависи от контекста"}</p>
            </div>
          )}
          {s.eu && (
            <div className="bg-surface rounded-sm p-4">
              <p className="text-sm text-muted">ЕС, {period(s.eu.x)}</p>
              <p className="display text-[2.6rem] leading-none mt-1">{num(s.eu.value)}</p>
              <p className="text-xs text-muted mt-1">{s.last.value > s.eu.value ? "България е над средното за ЕС" : s.last.value < s.eu.value ? "България е под средното за ЕС" : "колкото средното за ЕС"}</p>
            </div>
          )}
        </div>
      )}

      {ranking.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Подреждане за {period(lastX!)}</SectionTitle>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><BarRank data={ranking} /></div>
          <p className="text-sm text-muted mt-2">Най-високата стойност е {fmt(ranking[0].value / ranking.at(-1)!.value, 1)} пъти по-голяма от най-ниската.</p>
        </section>
      )}

      <section className="mb-10">
        <SectionTitle>Във времето</SectionTitle>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
          <MultiLine data={chartData} yLabel={info.unit} height={340} />
        </div>
        {keys.length > 8 && <p className="text-sm text-muted mt-2">Показани са трите области с най-висока и трите с най-ниска стойност. Всички са в подреждането отгоре.</p>}
        {cut > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-green">Цялата история от {years[0]} г.</summary>
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white mt-2"><MultiLine data={toRows(0)} yLabel={info.unit} height={340} /></div>
          </details>
        )}
        {info.better && <p className="text-sm text-muted mt-2">{BETTER[info.better]}</p>}
      </section>

      <section className="mb-10">
        <SectionTitle>Какво следва за хората</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-1">Когато расте</p><p className="text-[15px]">{info.consequences.up}</p></div>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-1">Когато пада</p><p className="text-[15px]">{info.consequences.down}</p></div>
        </div>
      </section>

      {info.related?.length ? (
        <section className="mb-10">
          <SectionTitle>Свързани показатели</SectionTitle>
          <ul className="grid gap-3 md:grid-cols-2">
            {info.related.filter((r) => CATALOG[r.id] && STATS.series[r.id]).map((r) => {
              const o = summary(r.id);
              return (
                <li key={r.id} className="ring-1 ring-rule rounded-sm p-4 bg-white">
                  <Link href={`/statistiki/${r.id}`} className="font-semibold">{CATALOG[r.id].title}</Link>
                  {!CATALOG[r.id].regional && o.last && <span className="text-sm text-muted"> · {num(o.last.value)} ({period(o.last.x)})</span>}
                  <p className="text-[15px] mt-1">{r.why}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {corr.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Какво се движи заедно с него</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Сравняваме годишните промени, а не самите стойности, за да не излизат връзки само защото всичко расте с времето. Корелацията показва, че две неща се движат заедно. Тя не доказва, че едното причинява другото.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="text-left text-sm text-muted"><th className="py-2 pr-3">Показател</th><th className="py-2 pr-3">Посока</th><th className="py-2 pr-3">Сила</th><th className="py-2 pr-3 num">r</th><th className="py-2 num hidden sm:table-cell">Години</th></tr></thead>
              <tbody>
                {corr.map((c) => (
                  <tr key={c.id} className="border-t border-rule">
                    <td className="py-2 pr-3"><Link href={`/statistiki/${c.id}`}>{CATALOG[c.id].title}</Link></td>
                    <td className="py-2 pr-3">{Math.abs(c.r) < 0.3 ? "няма ясна" : c.r > 0 ? "в една посока" : "в обратни посоки"}</td>
                    <td className="py-2 pr-3">{strength(c.r)}</td>
                    <td className="py-2 pr-3 num">{fmt(c.r, 2)}</td>
                    <td className="py-2 num hidden sm:table-cell">{c.from}–{c.to} ({c.n})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted mb-10">
        Източник: Евростат, набор <a href={eurostatUrl(series.dataset)} target="_blank" rel="noreferrer">{series.dataset}</a> (<a href={series.url} target="_blank" rel="noreferrer">заявката, от която са взети числата</a>).
      </p>

      {sameTopic.length > 0 && (
        <section>
          <SectionTitle>Още в „{info.topic}“</SectionTitle>
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">{sameTopic.map(([k, v]) => <Link key={k} href={`/statistiki/${k}`}>{v.title}</Link>)}</p>
        </section>
      )}
    </Page>
  );
}
