import Link from "next/link";
import { notFound } from "next/navigation";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { quarterLabel } from "@/lib/places";
import { findOblastBySlug, muniElection, muniFinance, muniFunds, muniSlug, oblastList } from "@/lib/regions";
import { FIN_SOURCE } from "@/lib/places";
import { fmt } from "@/lib/stats";

export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.map((m) => ({ obl: o.slug, muni: muniSlug(m.code) })));
}
export async function generateMetadata({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const m = findOblastBySlug(obl)?.municipalities.find((x) => muniSlug(x.code) === muni);
  return { title: m ? `Община ${m.name}` : "Община" };
}
const mn = (v?: number | null) => (v == null ? "–" : `${fmt(v / 1e6, 2)} млн. €`);

export default async function MuniPage({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  if (!o || !m) notFound();
  const f = muniFunds(m.code), fin = muniFinance(m.code), el = muniElection(m.code);
  const towns = m.settlements.filter((s) => s[2] === 0), villages = m.settlements.length - towns.length;
  const hist = fin?.history ?? [];
  const finData = [
    ...hist.filter((h) => h.revenue != null).map((h) => ({ series: "Собствени приходи", x: h.year, value: Math.round(h.revenue! / 1e5) / 10 })),
    ...hist.filter((h) => h.expenditure != null).map((h) => ({ series: "Разходи", x: h.year, value: Math.round(h.expenditure! / 1e5) / 10 })),
    ...hist.filter((h) => h.debt != null).map((h) => ({ series: "Дълг", x: h.year, value: Math.round(h.debt! / 1e5) / 10 })),
  ];
  const procHref = `/porachki?oblast=${encodeURIComponent(o.name)}&obshtina=${m.code}`;

  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}`, label: `Област ${o.name}` }} kicker="Община" lead={`${towns.length ? `Градове: ${towns.map((t) => t[1]).join(", ")}. ` : ""}${villages} села.${f?.pop ? ` ${f.pop.toLocaleString("bg-BG")} жители.` : ""}`}>{m.name}</Title>

      <Link href={`/mesta/${o.slug}/${muni}/vlast`} className="block ring-1 ring-rule rounded-sm p-4 mb-8 bg-white no-underline text-ink hover:ring-2 hover:ring-green">
        <p className="font-semibold text-lg">Местна власт →</p>
        <p className="text-[15px] text-muted">Кмет, заместници, съветници: декларации, дялове във фирми срещу поръчките на общината, как гласуват в общинския съвет.</p>
      </Link>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Собствени приходи на общината</p><p className="display text-[2.2rem]">{mn(fin?.revenue)}</p><p className="text-xs text-muted">{fin ? quarterLabel(fin.period) : ""}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Дълг на общината</p><p className="display text-[2.2rem]">{mn(fin?.debt)}</p><p className="text-xs text-muted">{fin?.arrears ? `просрочени задължения: ${mn(fin.arrears)}` : "без просрочени задължения"}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства (договорени)</p><p className="display text-[2.2rem]">{mn(f?.total)}</p><p className="text-xs text-muted">{f ? `${f.contracts} договора, изплатени ${mn(f.paid)}` : ""}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства на човек</p><p className="display text-[2.2rem]">{f ? `${Math.round(f.perCapita).toLocaleString("bg-BG")} €` : "–"}</p></div>
      </div>

      {fin && (
        <section className="mb-12">
          <SectionTitle>Бюджетът на общината</SectionTitle>
          <ul className="list-disc pl-5 text-[15px] space-y-1 mb-4 max-w-3xl">
            {fin.ownShare != null && fin.revenue != null && <li>Собствените приходи (местни данъци, такси, наеми) са <b>{fmt(fin.ownShare, 0)}%</b> от всички приходи, които са около {mn(fin.revenue / (fin.ownShare / 100))} за {quarterLabel(fin.period)}. Останалото идва от държавата и ЕС.</li>}
            {fin.wageShare != null && <li>Заплатите са {fmt(fin.wageShare, 0)}% от разходите.</li>}
            {fin.recovery && <li><b>Общината е в процедура за финансово оздравяване.</b></li>}
          </ul>
          {finData.length > 0 && <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">По години, млн. €</p><MultiLine data={finData} yLabel="млн. €" height={280} /></div>}
          <p className="text-xs text-muted mt-2">{FIN_SOURCE}.</p>
        </section>
      )}

      {el && (
        <section className="mb-12">
          <SectionTitle>Как гласува на 19 април 2026 г.</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4">Избирателна активност: {el.turnout ? `${fmt(el.turnout, 1)}%` : "–"} ({el.voted.toLocaleString("bg-BG")} от {el.reg.toLocaleString("bg-BG")}).</p>
          <ul className="space-y-2 max-w-3xl">{el.lists.map((l) => (
            <li key={l.ballot} className="text-[15px]"><div className="flex justify-between"><Link href={`/parlament/partiya/${l.slug}`}>{l.name}</Link><span className="num">{fmt(l.pct, 1)}% · {l.votes.toLocaleString("bg-BG")}</span></div>
              <div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.color }} /></div></li>
          ))}</ul>
          <p className="text-xs text-muted mt-2">Показани са листите, влезли в парламента. Процентите са от гласовете за партии.</p>
        </section>
      )}

      <section className="mb-12">
        <SectionTitle>Обществени поръчки</SectionTitle>
        <p className="text-[15px]">Всички договори на възложители в общината, най-големите изпълнители, анексите и сигналите: <Link href={procHref}>поръчките в {m.name}</Link>.</p>
      </section>
    </Page>
  );
}
