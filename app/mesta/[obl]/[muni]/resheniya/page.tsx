import { notFound } from "next/navigation";
import { ResolutionItem } from "@/components/MuniPower";
import { Page, Title } from "@/components/ui";
import { localData } from "@/lib/local";
import { findOblastBySlug, muniSlug, oblastList } from "@/lib/regions";

export async function generateStaticParams() {
  const ms = oblastList().flatMap((o) => o.municipalities.map((m) => ({ o, m })));
  const ds = await Promise.all(ms.map(({ m }) => localData(m.code)));
  return ms.filter((_, i) => (ds[i]?.resolutions?.length ?? 0) > 15).map(({ o, m }) => ({ obl: o.slug, muni: muniSlug(m.code) }));
}
export async function generateMetadata({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const m = findOblastBySlug(obl)?.municipalities.find((x) => muniSlug(x.code) === muni);
  return { title: m ? `Решения на общинския съвет – ${m.name}` : "Решения на общинския съвет" };
}
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

export default async function Resheniya({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  const res = m ? (await localData(m.code))?.resolutions ?? [] : [];
  if (!o || !m || !res.length) notFound();
  const by = new Map<string, typeof res>();
  for (const r of [...res].sort((a, b) => (a.date < b.date ? 1 : -1))) by.set(r.date.slice(0, 7), [...(by.get(r.date.slice(0, 7)) ?? []), r]);
  const keys = [...by.keys()];
  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}/${muniSlug(m.code)}#resheniya`, label: `Община ${m.name}` }} kicker="Общински съвет"
        lead={`${res.length} решения, подредени по месеци (най-новите отгоре). Източник: протоколите и решенията от сайта на общинския съвет.`}>
        Решения на общинския съвет
      </Title>
      {keys.map((k, i) => (
        <details key={k} className="mb-3 border-t border-rule pt-2" open={i === 0}>
          <summary className="font-semibold cursor-pointer">{MONTHS[Number(k.slice(5)) - 1]} {k.slice(0, 4)} <span className="text-muted font-normal">· {by.get(k)!.length}</span></summary>
          <ul className="space-y-2 mt-2">{by.get(k)!.map((r) => <ResolutionItem key={r.id} r={r} />)}</ul>
        </details>
      ))}
    </Page>
  );
}
