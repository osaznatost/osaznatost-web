import Link from "next/link";
import { Suspense } from "react";
import { Page, Title } from "@/components/ui";
import { CONTEXT, OUTLETS, latestNews } from "@/lib/news";

export const metadata = { title: "Новини" };
const OUT = Object.fromEntries(OUTLETS.map((o) => [o.id, o]));

async function List() {
  const items = await latestNews();
  if (!items.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Новините не можаха да се заредят. Опитайте отново след малко.</p>;
  const seen = new Set<string>();
  const uniq = items.filter((x) => { const k = x.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 120);
  const counts = OUTLETS.map((o) => ({ o, n: uniq.filter((x) => x.outlet === o.id).length }));
  return (
    <>
      <p className="text-sm text-muted mb-4">{counts.map(({ o, n }) => `${o.name}: ${n}`).join(" · ")}</p>
      <ul className="divide-y divide-rule border-y border-rule">
        {uniq.map((x) => {
          const ctx = CONTEXT.filter((c) => c.re.test(x.title)).slice(0, 2);
          return (
            <li key={x.url} className="py-3 grid sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-1">
              <span className="text-sm text-muted">{OUT[x.outlet]?.name}<br className="hidden sm:block" /> {new Date(x.date).toLocaleString("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" })}</span>
              <span>
                <a href={x.url} target="_blank" rel="noreferrer" className="text-[16px] text-ink">{x.title}</a>
                {ctx.length > 0 && <span className="block text-sm mt-0.5">Данните: {ctx.map((c, i) => <span key={c.href}>{i > 0 && " · "}<Link href={c.href}>{c.label}</Link></span>)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function Novini() {
  return (
    <Page>
      <Title lead="Последните новини от агенции, обществени медии и проверяващи факти, на едно място. Където по темата има данни на сайта, даваме връзка към тях, за да може всяко твърдение да се сравни с числата.">Новини</Title>
      <section className="bg-surface rounded-sm p-4 mb-8 text-[15px] max-w-4xl">
        <p><b>Кои медии и защо.</b> Избрахме източници с ясна собственост и редакционни правила: {OUTLETS.map((o, i) => <span key={o.id}>{i > 0 && ", "}{o.name} <span className="text-muted">({o.kind.toLowerCase()})</span></span>)}. Никоя медия не е напълно неутрална. Затова показваме няколко и не преразказваме: заглавието води към оригинала. Новините се обновяват на всеки час.</p>
      </section>
      <Suspense fallback={<p className="text-muted">Зареждане на новините…</p>}><List /></Suspense>
    </Page>
  );
}
