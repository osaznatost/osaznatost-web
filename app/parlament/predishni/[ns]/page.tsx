import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, Title } from "@/components/ui";
import { partyName } from "@/lib/parliament";
import { PREV_LIST, PREV_NS, PREV_SOURCE, groupPos } from "@/lib/parliamentPrev";

export function generateStaticParams() { return PREV_LIST.map((ns) => ({ ns })); }
export async function generateMetadata({ params }: { params: Promise<{ ns: string }> }) {
  return { title: `${(await params).ns}-о Народно събрание: гласуванията` };
}
const fmt = (d: string) => d.split("-").reverse().join(".");
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

export default async function PrevNs({ params }: { params: Promise<{ ns: string }> }) {
  const { ns } = await params;
  const x = PREV_NS[ns];
  if (!x) notFound();
  const groups = [...new Set(x.mps.map((m) => m.party))].sort((a, b) => x.mps.filter((m) => m.party === b).length - x.mps.filter((m) => m.party === a).length);
  const months = new Map<string, number>();
  for (const v of x.votes) months.set(v.date.slice(0, 7), (months.get(v.date.slice(0, 7)) ?? 0) + 1);
  const passed = x.votes.filter((v) => v.outcome.startsWith("passed"));
  const row = (g: string) => {
    const vs = x.votes.filter((v) => v.g[g]);
    const yes = vs.filter((v) => groupPos(v.g[g]) === "y").length;
    const withMajority = vs.filter((v) => (groupPos(v.g[g]) === "y") === v.outcome.startsWith("passed")).length;
    return { g, n: x.mps.filter((m) => m.party === g).length, yes: vs.length ? yes / vs.length : 0, maj: vs.length ? withMajority / vs.length : 0 };
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <Page>
      <Title back={{ href: "/parlament/predishni", label: "Предишни парламенти" }} kicker={`${fmt(x.from)} – ${fmt(x.to)}`}
        lead={<>{x.total.toLocaleString("bg-BG")} поименни гласувания. Тук са {x.votes.length.toLocaleString("bg-BG")} същински решения (първо четене на законопроекти, решения, избори), от които {passed.length.toLocaleString("bg-BG")} приети.</>}>
        {ns}-о Народно събрание
      </Title>
      <section className="mb-10 max-w-3xl">
        <h2 className="text-lg font-bold mb-2">Групите</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] border-collapse">
            <thead><tr className="text-left border-b border-rule"><th className="py-1 pr-3">Група</th><th className="py-1 px-2 num">Депутати</th><th className="py-1 px-2 num">Гласувала „за“</th><th className="py-1 pl-2 num">Съвпада с резултата</th></tr></thead>
            <tbody>{groups.map(row).map((r) => (
              <tr key={r.g} className="border-b border-rule"><td className="py-1 pr-3">{partyName(r.g)}</td><td className="py-1 px-2 num">{r.n}</td><td className="py-1 px-2 num">{pct(r.yes)}</td><td className="py-1 pl-2 num">{pct(r.maj)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-sm text-muted mt-2">„Съвпада с резултата“: колко често групата е гласувала „за“ при прието решение или не е гласувала „за“ при отхвърлено. Групата е мнозинството от гласувалите в нея.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Гласуванията по месеци</h2>
        <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 text-[15px]">
          {[...months.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([m, n]) => (
            <li key={m}><Link href={`/parlament/predishni/${ns}/${m}`}>{MONTHS[Number(m.slice(5)) - 1]} {m.slice(0, 4)}</Link> <span className="text-muted">· {n}</span></li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted">Източник: {PREV_SOURCE}.</p>
    </Page>
  );
}
