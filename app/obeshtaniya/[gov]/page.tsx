import Link from "next/link";
import { notFound } from "next/navigation";
import { PromiseCard } from "@/components/PromiseCard";
import { Page, SectionTitle, Title } from "@/components/ui";
import { ORDER, STATUS, data, findGov, govSlug } from "@/lib/promises";

export function generateStaticParams() {
  return data.parties.map((g) => ({ gov: govSlug(g) }));
}
export async function generateMetadata({ params }: { params: Promise<{ gov: string }> }) {
  const g = findGov((await params).gov);
  return { title: g ? `Обещания: ${g.name}` : "Обещания" };
}

export default async function Gov({ params }: { params: Promise<{ gov: string }> }) {
  const g = findGov((await params).gov);
  if (!g) notFound();
  const counts = ORDER.map((s) => ({ s, n: g.promises.filter((x) => x.status === s).length })).filter((x) => x.n);
  const areas = [...new Set(g.promises.map((x) => x.area))];
  const others = data.parties.filter((p) => p.party !== g.party);
  return (
    <Page>
      <Title back={{ href: "/obeshtaniya", label: "Обещания" }} kicker={g.period} lead={g.role}>{g.name}</Title>

      <nav className="flex flex-wrap gap-2 mb-8" aria-label="Други правителства">
        {data.parties.map((p) => (
          <Link key={p.party} href={`/obeshtaniya/${govSlug(p)}`} className={`text-sm px-3 py-1.5 rounded-full no-underline ${p.party === g.party ? "bg-green text-white" : "bg-surface text-ink hover:ring-1 hover:ring-green"}`}>
            {p.name.replace(/\s*\(.*\)/, "")}
          </Link>
        ))}
      </nav>

      <section className="bg-surface rounded-sm p-5 mb-8">
        <div className="flex h-4 rounded-full overflow-hidden">
          {counts.map(({ s, n }) => <div key={s} style={{ width: `${(n / g.promises.length) * 100}%`, background: STATUS[s].color }} />)}
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
          {counts.map(({ s, n }) => (
            <span key={s} className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{ background: STATUS[s].color }} />{STATUS[s].label}: <b className="num">{n}</b></span>
          ))}
        </p>
        <p className="text-sm text-muted mt-3">Проследяваме {g.promises.length} обещания, избрани заради това, че могат да се измерят. Това не са всички обещания и съотношението не е оценка за цялото управление.</p>
      </section>

      {areas.length > 1 && (
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] mb-8" aria-label="Теми">
          <span className="text-muted">Теми:</span>
          {areas.map((a) => <a key={a} href={`#t-${a}`}>{a} ({g.promises.filter((x) => x.area === a).length})</a>)}
        </nav>
      )}

      {areas.map((a) => (
        <section key={a} id={`t-${a}`} className="mb-12 scroll-mt-24">
          <SectionTitle>{a}</SectionTitle>
          <ul className="grid gap-4 lg:grid-cols-2">
            {g.promises.map((x, i) => ({ x, i })).filter(({ x }) => x.area === a).map(({ x, i }) => <PromiseCard key={i} x={x} id={`p${i}`} />)}
          </ul>
        </section>
      ))}

      <p className="text-xs text-muted mt-4">
        Програми: {g.programme.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)}. Проверено: {data.updated}
      </p>
      {others.length > 0 && <p className="text-[15px] mt-6">Сравни с: {others.map((p, i) => <span key={p.party}>{i > 0 && ", "}<Link href={`/obeshtaniya/${govSlug(p)}`}>{p.name.replace(/\s*\(.*\)/, "")}</Link></span>)}.</p>}
    </Page>
  );
}
