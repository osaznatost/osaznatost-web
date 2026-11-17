import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";
import { CATALOG, TOPICS } from "@/lib/statCatalog";
import { keyLabel, summary } from "@/lib/statLib";
import { STATS, fmt } from "@/lib/stats";
import { StatLibrary, type Card } from "./StatLibrary";

export const metadata = { title: "Статистики" };

const period = (x: number | string) => String(x).replace(/^(\d{4})-(\d{2})$/, "$2.$1");
const num = (v: number) => (Math.abs(v) >= 10000 ? Math.round(v).toLocaleString("bg-BG") : fmt(v, Math.abs(v) < 10 ? 2 : 1));

export default function Statistiki() {
  const cards: Card[] = Object.keys(CATALOG).filter((id) => STATS.series[id]).map((id) => {
    const s = summary(id);
    const i = s.info;
    if (i.regional) {
      return { id, title: i.title, topic: i.topic, unit: i.unit, what: i.what, regional: true,
        value: s.last ? `${fmt(s.last.value, 1)} пъти` : undefined, period: s.last ? `разлика между най-високата и най-ниската стойност, ${period(s.last.x)}` : undefined };
    }
    return {
      id, title: i.title, topic: i.topic, unit: s.key !== "BG" ? `${i.unit} · ${keyLabel(id, s.key)}` : i.unit, what: i.what,
      value: s.last ? num(s.last.value) : undefined, period: s.last ? period(s.last.x) : undefined,
      change: s.change != null ? `${s.change > 0 ? "+" : ""}${num(s.change)} спрямо ${period(s.prev!.x)}` : undefined,
      trend: s.trend, good: s.good, eu: s.eu ? `${num(s.eu.value)} (${period(s.eu.x)})` : undefined,
    };
  });
  const topics = TOPICS.map((t) => ({ id: t.id, about: t.about, n: cards.filter((c) => c.topic === t.id).length })).filter((t) => t.n);
  return (
    <Page>
      <Title lead={`Библиотека с ${cards.length} официални показателя за България, с история и сравнение с ЕС. Всеки показател има обяснение какво значи, какво следва за хората и с какво се движи заедно. Данни: Евростат, обновени на ${formatDate(STATS.updated)}`}>
        Статистики
      </Title>
      <p className="-mt-4 mb-6 text-[15px]">Търсиш връзките между цените, доходите и бюджета? Виж <Link href="/statistiki/analiz">анализите по теми</Link>.</p>
      <StatLibrary cards={cards} topics={topics} />
    </Page>
  );
}
