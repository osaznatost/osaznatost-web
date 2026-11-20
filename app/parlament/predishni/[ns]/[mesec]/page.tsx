import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeTag } from "@/components/parliament";
import { Page, Title } from "@/components/ui";
import { partyName } from "@/lib/parliament";
import { POS_LABEL, PREV_LIST, PREV_NS, PREV_SOURCE, groupPos } from "@/lib/parliamentPrev";

export function generateStaticParams() { return PREV_LIST.flatMap((ns) => [...new Set(PREV_NS[ns].votes.map((v) => v.date.slice(0, 7)))].map((mesec) => ({ ns, mesec }))); }
export async function generateMetadata({ params }: { params: Promise<{ ns: string; mesec: string }> }) {
  const { ns, mesec } = await params;
  return { title: `${ns}-о Народно събрание: гласуванията през ${MONTHS[Number(mesec.slice(5)) - 1]} ${mesec.slice(0, 4)}` };
}
const fmt = (d: string) => d.split("-").reverse().join(".");
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
const COLOR = { y: "bg-green-soft text-green", n: "bg-red text-white", a: "bg-surface text-muted", split: "bg-white text-muted ring-1 ring-rule" } as const;

export default async function PrevMonth({ params }: { params: Promise<{ ns: string; mesec: string }> }) {
  const { ns, mesec } = await params;
  const x = PREV_NS[ns];
  if (!x) notFound();
  const vs = x.votes.filter((v) => v.date.startsWith(mesec)).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!vs.length) notFound();
  const groups = [...new Set(x.mps.map((m) => m.party))].sort((a, b) => x.mps.filter((m) => m.party === b).length - x.mps.filter((m) => m.party === a).length);
  return (
    <Page>
      <Title back={{ href: `/parlament/predishni/${ns}`, label: `${ns}-о НС` }} kicker={`${ns}-о Народно събрание`}
        lead={<>Всяко същинско решение и как е гласувала всяка група (мнозинството от гласувалите в нея). Групи: {groups.map((g) => `${partyName(g)} (${x.mps.filter((m) => m.party === g).length})`).join(", ")}.</>}>
        {MONTHS[Number(mesec.slice(5)) - 1]} {mesec.slice(0, 4)}
      </Title>
      <p className="text-sm mb-6 flex flex-wrap gap-2">
        {(["y", "n", "a", "split"] as const).map((k) => <span key={k} className={`text-xs rounded-sm px-2 py-0.5 ${COLOR[k]}`}>{POS_LABEL[k]}</span>)}
      </p>
      <ul className="divide-y divide-rule border-y border-rule text-[15px]">
        {vs.map((v) => (
          <li key={v.id} className="py-2">
            <p><span className="text-sm text-muted num mr-2">{fmt(v.date)}</span>{v.title} <OutcomeTag outcome={v.outcome} /></p>
            <p className="flex flex-wrap gap-1 mt-1">{groups.filter((g) => v.g[g]).map((g) => {
              const p = groupPos(v.g[g]);
              return <span key={g} className={`text-xs rounded-sm px-1.5 py-0.5 ${COLOR[p]}`}>{partyName(g)}: {POS_LABEL[p]} <span className="num opacity-70">{v.g[g].join("/")}</span></span>;
            })}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted mt-6">Източник: {PREV_SOURCE}. Пълните стенограми са в <a href="https://www.parliament.bg/bg/plenaryst" target="_blank" rel="noreferrer">parliament.bg</a>. <Link href="/metodologiya">Как работим</Link>.</p>
    </Page>
  );
}
