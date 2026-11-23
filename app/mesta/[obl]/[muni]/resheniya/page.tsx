import { notFound } from "next/navigation";
import { ResolutionItem } from "@/components/MuniPower";
import { Page, Title } from "@/components/ui";
import { localData } from "@/lib/local";
import Link from "next/link";
import { findOblastBySlug, muniSlug } from "@/lib/regions";

export async function generateMetadata({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const m = findOblastBySlug(obl)?.municipalities.find((x) => muniSlug(x.code) === muni);
  return { title: m ? `Решения на общинския съвет – ${m.name}` : "Решения на общинския съвет" };
}
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

export default async function Resheniya({ params, searchParams }: { params: Promise<{ obl: string; muni: string }>; searchParams: Promise<{ m?: string }> }) {
  const { obl, muni } = await params;
  const { m: sel } = await searchParams;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  const res = m ? (await localData(m.code))?.resolutions ?? [] : [];
  if (!o || !m || !res.length) notFound();
  const by = new Map<string, typeof res>();
  for (const r of [...res].sort((a, b) => (a.date < b.date ? 1 : -1))) by.set(r.date.slice(0, 7), [...(by.get(r.date.slice(0, 7)) ?? []), r]);
  const keys = [...by.keys()];
  const cur = sel && by.has(sel) ? sel : keys[0];
  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}/${muniSlug(m.code)}#resheniya`, label: `Община ${m.name}` }} kicker="Общински съвет"
        lead={`${res.length} решения, подредени по месеци; изберете месец. Източник: протоколите и решенията от сайта на общинския съвет.`}>
        Решения на общинския съвет
      </Title>
      {/* по един месец на страница: всички решения наведнъж са десетки MB */}
      <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-4" aria-label="Месеци">
        {keys.map((k) => (
          <Link key={k} href={`?m=${k}`} aria-current={k === cur ? "page" : undefined} className={k === cur ? "font-semibold no-underline" : ""}>
            {MONTHS[Number(k.slice(5)) - 1].slice(0, 3)} {k.slice(0, 4)} <span className="text-muted">({by.get(k)!.length})</span>
          </Link>
        ))}
      </nav>
      <h2 className="font-semibold border-t border-rule pt-2">{MONTHS[Number(cur.slice(5)) - 1]} {cur.slice(0, 4)} <span className="text-muted font-normal">· {by.get(cur)!.length}</span></h2>
      <ul className="space-y-2 mt-2">{by.get(cur)!.map((r) => <ResolutionItem key={r.id} r={r} />)}</ul>
    </Page>
  );
}
